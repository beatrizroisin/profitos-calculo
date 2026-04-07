// POST /api/integrations/runrunit/sync — trigger full sync
// GET  /api/integrations/runrunit/sync — get sync history + current comparison data
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUsers, getTimesheets, getClients, currentMonthRange, minutesToHours } from '@/lib/runrunit';

function decrypt(encoded: string): string {
  const key = process.env.NEXTAUTH_SECRET ?? 'profitos-secret';
  const text = Buffer.from(encoded, 'base64').toString();
  return text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  // Return comparison data: collaborators + their RunRun hours this month
  const [config, links, timeEntries, colabs] = await Promise.all([
    prisma.runRunConfig.findUnique({ where: { companyId: u.companyId } }),
    prisma.runRunUserLink.findMany({ where: { companyId: u.companyId } }),
    prisma.runRunTimeEntry.findMany({
      where: { companyId: u.companyId, dateWorked: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      select: { collaboratorId:true, hoursWorked:true, clientId:true, clientName:true, dateWorked:true },
    }),
    prisma.collaborator.findMany({
      where: { companyId: u.companyId, isActive: true },
      include: { allocations: true, runRunLink: true },
    }),
  ]);

  // Aggregate hours per collaborator from time entries
  const hoursByColab: Record<string, number> = {};
  timeEntries.forEach(e => {
    hoursByColab[e.collaboratorId] = (hoursByColab[e.collaboratorId] || 0) + e.hoursWorked;
  });

  // Aggregate hours per client from time entries
  const hoursByClient: Record<string, number> = {};
  timeEntries.forEach(e => {
    if (e.clientId) hoursByClient[e.clientId] = (hoursByClient[e.clientId] || 0) + e.hoursWorked;
  });

  const comparison = colabs.map(c => {
    const allocatedHours = c.allocations.reduce((s, a) => {
      return s + (a.allocationHours ?? (a.allocationPct != null ? c.hoursPerMonth * a.allocationPct / 100 : 0));
    }, 0);
    const realHours = hoursByColab[c.id] || 0;
    const diff = realHours - allocatedHours;
    const pct  = allocatedHours > 0 ? (realHours / allocatedHours * 100) : 0;

    let status: string;
    if (!c.runRunLink) status = 'not_linked';
    else if (realHours === 0) status = 'no_data';
    else if (pct > 115) status = 'overloaded';
    else if (pct < 85)  status = 'underused';
    else status = 'on_track';

    return {
      id: c.id, name: c.name, position: c.position, salary: c.salary,
      allocatedHours: Math.round(allocatedHours * 10) / 10,
      realHours: Math.round(realHours * 10) / 10,
      diff: Math.round(diff * 10) / 10,
      pct: Math.round(pct),
      status,
      linked: !!c.runRunLink,
      runrunId: c.runRunLink?.runrunUserId,
    };
  });

  return NextResponse.json({
    connected: !!config,
    lastSyncAt: config?.lastSyncAt,
    comparison,
    hoursByClient,
    syncLogs: await prisma.runRunSyncLog.findMany({
      where: { companyId: u.companyId },
      orderBy: { syncedAt: 'desc' },
      take: 10,
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role)) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });

  const config = await prisma.runRunConfig.findUnique({ where: { companyId: u.companyId } });
  if (!config) return NextResponse.json({ error: 'RunRun.it não configurado.' }, { status: 400 });

  const appKey    = decrypt(config.appKey);
  const userToken = decrypt(config.userToken);
  const { startDate, endDate } = currentMonthRange();

  const syncLog = await prisma.runRunSyncLog.create({
    data: { companyId: u.companyId, configId: config.id, status: 'running' },
  });

  try {
    // Fetch timesheets from RunRun.it
    const timesheets = await getTimesheets(appKey, userToken, startDate, endDate);

    // Get user links
    const links = await prisma.runRunUserLink.findMany({ where: { companyId: u.companyId } });
    const rrIdToColabId: Record<string, string> = {};
    links.forEach(l => { rrIdToColabId[l.runrunUserId] = l.collaboratorId; });

    // Get profitOS clients to match by name
    const clients = await prisma.client.findMany({ where: { companyId: u.companyId }, select: { id:true, name:true } });
    const clientNameMap: Record<string, string> = {};
    clients.forEach(c => { clientNameMap[c.name.toLowerCase()] = c.id; });
    const rrClients = await getClients(appKey, userToken);
    const rrClientMap: Record<number, string> = {};
    rrClients.forEach(rc => {
      const match = clients.find(c => c.name.toLowerCase().includes(rc.name.toLowerCase().slice(0,10)) || rc.name.toLowerCase().includes(c.name.toLowerCase().slice(0,10)));
      if (match) rrClientMap[rc.id] = match.id;
    });

    // Delete old entries for this period and re-insert
    await prisma.runRunTimeEntry.deleteMany({
      where: { companyId: u.companyId, dateWorked: { gte: new Date(startDate), lte: new Date(endDate) } },
    });

    // Group timesheets by user+date+client and insert
    const entries: any[] = [];
    timesheets.forEach(ts => {
      const colabId = rrIdToColabId[ts.user_id];
      if (!colabId) return; // skip unlinked users
      entries.push({
        companyId:      u.companyId,
        collaboratorId: colabId,
        runrunUserId:   ts.user_id,
        runrunTaskId:   String(ts.task_id),
        runrunClientId: String(ts.client_id),
        clientId:       rrClientMap[ts.client_id] ?? null,
        hoursWorked:    minutesToHours(ts.duration),
        dateWorked:     new Date(ts.started_at),
        taskTitle:      ts.task_title,
        clientName:     ts.client_name,
      });
    });

    if (entries.length > 0) {
      await prisma.runRunTimeEntry.createMany({ data: entries });
    }

    await prisma.runRunConfig.update({ where: { id: config.id }, data: { lastSyncAt: new Date() } });
    await prisma.runRunSyncLog.update({ where: { id: syncLog.id }, data: { status: 'success', hoursCount: entries.length } });

    return NextResponse.json({ success: true, synced: entries.length, period: { startDate, endDate } });
  } catch (err: any) {
    await prisma.runRunSyncLog.update({ where: { id: syncLog.id }, data: { status: 'failed', errorMsg: err.message } });
    console.error('RunRun sync error:', err);
    return NextResponse.json({ error: 'Erro na sincronização: ' + err.message }, { status: 500 });
  }
}
