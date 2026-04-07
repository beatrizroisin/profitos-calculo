import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTimesheets, getClients, currentMonthRange, minutesToHours } from '@/lib/runrunit';

function decrypt(encoded: string): string {
  const key = process.env.NEXTAUTH_SECRET ?? 'profitos-secret';
  const text = Buffer.from(encoded, 'base64').toString();
  return text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const configs = await prisma.runRunConfig.findMany({ where: { isActive: true, syncFrequency: 'daily' } });
  let synced = 0, errors = 0;
  for (const config of configs) {
    try {
      const appKey = decrypt(config.appKey), userToken = decrypt(config.userToken);
      const { startDate, endDate } = currentMonthRange();
      const [timesheets, rrClients] = await Promise.all([
        getTimesheets(appKey, userToken, startDate, endDate),
        getClients(appKey, userToken),
      ]);
      const links   = await prisma.runRunUserLink.findMany({ where: { companyId: config.companyId } });
      const clients = await prisma.client.findMany({ where: { companyId: config.companyId }, select: { id:true, name:true } });
      const rrIdToColabId: Record<string,string> = {};
      links.forEach(l => { rrIdToColabId[l.runrunUserId] = l.collaboratorId; });
      const rrClientMap: Record<number,string> = {};
      rrClients.forEach(rc => {
        const m = clients.find(c => c.name.toLowerCase().includes(rc.name.toLowerCase().slice(0,8)) || rc.name.toLowerCase().includes(c.name.toLowerCase().slice(0,8)));
        if (m) rrClientMap[rc.id] = m.id;
      });
      await prisma.runRunTimeEntry.deleteMany({ where: { companyId: config.companyId, dateWorked: { gte: new Date(startDate), lte: new Date(endDate) } } });
      const entries = timesheets.filter(ts => rrIdToColabId[ts.user_id]).map(ts => ({
        companyId: config.companyId, collaboratorId: rrIdToColabId[ts.user_id],
        runrunUserId: ts.user_id, runrunTaskId: String(ts.task_id), runrunClientId: String(ts.client_id),
        clientId: rrClientMap[ts.client_id] ?? null, hoursWorked: minutesToHours(ts.duration),
        dateWorked: new Date(ts.started_at), taskTitle: ts.task_title, clientName: ts.client_name,
      }));
      if (entries.length > 0) await prisma.runRunTimeEntry.createMany({ data: entries });
      await prisma.runRunConfig.update({ where: { id: config.id }, data: { lastSyncAt: new Date() } });
      synced++;
    } catch (err: any) { console.error(err); errors++; }
  }
  return NextResponse.json({ synced, errors, at: new Date().toISOString() });
}
