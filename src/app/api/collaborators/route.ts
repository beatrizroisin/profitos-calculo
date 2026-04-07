import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  name:          z.string().min(2),
  position:      z.string().min(2),
  type:          z.enum(['PJ','CLT']).default('PJ'),
  salary:        z.number().positive(),
  hoursPerMonth: z.number().int().min(1).max(300).default(160),
  notes:         z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  const colabs = await prisma.collaborator.findMany({
    where: { companyId: u.companyId },
    include: {
      allocations: {
        include: { client: { select: { id: true, name: true, netRevenue: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Enrich with calculated fields
  const enriched = colabs.map(c => {
    const costPerHour = c.salary / c.hoursPerMonth;
    const totalAllocatedCost = c.allocations.reduce((sum, a) => {
      const viaPct   = a.allocationPct   != null ? c.salary * a.allocationPct / 100 : null;
      const viaHours = a.allocationHours != null ? costPerHour * a.allocationHours  : null;
      if (viaPct != null && viaHours != null) return sum + Math.max(viaPct, viaHours);
      return sum + (viaPct ?? viaHours ?? 0);
    }, 0);
    const allocatedHours = c.allocations.reduce((sum, a) => {
      return sum + (a.allocationHours ?? (a.allocationPct != null ? c.hoursPerMonth * a.allocationPct / 100 : 0));
    }, 0);
    const occupancyPct = (allocatedHours / c.hoursPerMonth) * 100;
    return { ...c, costPerHour, totalAllocatedCost, allocatedHours, occupancyPct };
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
    const colab = await prisma.collaborator.create({
      data: { companyId: u.companyId, ...body },
    });
    return NextResponse.json(colab, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError') return NextResponse.json({ error: 'Dados inválidos.', details: err.errors }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
