import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  collaboratorId: z.string(),
  clientId:       z.string(),
  serviceType:    z.string(),
  allocationPct:  z.number().min(0).max(100).nullable().optional(),
  allocationHours:z.number().min(0).nullable().optional(),
  notes:          z.string().optional(),
}).refine(d => d.allocationPct != null || d.allocationHours != null, {
  message: 'Informe % ou horas de alocação.',
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  const { searchParams } = new URL(req.url);
  const clientId       = searchParams.get('clientId');
  const collaboratorId = searchParams.get('collaboratorId');

  const allocations = await prisma.collaboratorAllocation.findMany({
    where: {
      companyId: u.companyId,
      ...(clientId       ? { clientId }       : {}),
      ...(collaboratorId ? { collaboratorId } : {}),
    },
    include: {
      collaborator: { select: { id:true, name:true, position:true, salary:true, hoursPerMonth:true, type:true } },
      client:       { select: { id:true, name:true, netRevenue:true, grossRevenue:true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Enrich with computed cost
  const enriched = allocations.map(a => {
    const costPerHour = a.collaborator.salary / a.collaborator.hoursPerMonth;
    const viaPct   = a.allocationPct   != null ? a.collaborator.salary * a.allocationPct / 100 : null;
    const viaHours = a.allocationHours != null ? costPerHour * a.allocationHours               : null;
    let allocatedCost: number;
    let method: string;
    if (viaPct != null && viaHours != null) {
      allocatedCost = Math.max(viaPct, viaHours);
      method = allocatedCost === viaPct ? 'pct_wins' : 'hours_wins';
    } else if (viaPct != null) {
      allocatedCost = viaPct;
      method = 'pct';
    } else {
      allocatedCost = viaHours ?? 0;
      method = 'hours';
    }
    const allocatedHours = a.allocationHours ?? (a.allocationPct != null ? a.collaborator.hoursPerMonth * a.allocationPct / 100 : 0);
    return { ...a, allocatedCost, method, allocatedHours };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN','MANAGER'].includes(u.role))
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });

  try {
    const body = schema.parse(await req.json());

    // Validate collaborator and client belong to this company
    const [col, cli] = await Promise.all([
      prisma.collaborator.findFirst({ where: { id: body.collaboratorId, companyId: u.companyId } }),
      prisma.client.findFirst({ where: { id: body.clientId, companyId: u.companyId } }),
    ]);
    if (!col) return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 });
    if (!cli) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });

    // Warn if would exceed 100% occupancy (still saves, returns warning)
    const existing = await prisma.collaboratorAllocation.findMany({ where: { collaboratorId: body.collaboratorId, companyId: u.companyId } });
    const currentHours = existing.reduce((s, a) => s + (a.allocationHours ?? (a.allocationPct != null ? col.hoursPerMonth * a.allocationPct / 100 : 0)), 0);
    const newHours = body.allocationHours ?? (body.allocationPct != null ? col.hoursPerMonth * body.allocationPct / 100 : 0);
    const newOccupancy = ((currentHours + newHours) / col.hoursPerMonth) * 100;

    const alloc = await prisma.collaboratorAllocation.create({
      data: {
        companyId:      u.companyId,
        collaboratorId: body.collaboratorId,
        clientId:       body.clientId,
        serviceType:    body.serviceType,
        allocationPct:  body.allocationPct ?? null,
        allocationHours:body.allocationHours ?? null,
        notes:          body.notes ?? null,
      },
      include: {
        collaborator: { select: { id:true, name:true, position:true } },
        client:       { select: { id:true, name:true } },
      },
    });

    return NextResponse.json({
      ...alloc,
      warning: newOccupancy > 100 ? `${col.name} ficará com ${newOccupancy.toFixed(0)}% de ocupação.` : null,
    }, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError') return NextResponse.json({ error: err.errors[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
