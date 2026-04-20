// GET /api/company-stats
// Single source of truth for Metas, CEO, Simulador, Churn.
// Cost base = payroll (sum of active collaborators' salaries).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  const [clients, collaborators, allocations] = await Promise.all([
    prisma.client.findMany({
      where:  { companyId: u.companyId, status: 'ACTIVE' },
      select: { id: true, name: true, netRevenue: true, grossRevenue: true, riskLevel: true, isRecurring: true },
    }),
    prisma.collaborator.findMany({
      where:  { companyId: u.companyId, isActive: true },
      select: { salary: true, type: true },
    }),
    prisma.collaboratorAllocation.findMany({
      where:  { companyId: u.companyId },
      select: { allocatedCost: true },
    }),
  ]);

  const totalRevenue  = clients.reduce((s, c) => s + c.netRevenue, 0);
  const totalGross    = clients.reduce((s, c) => s + c.grossRevenue, 0);
  const clientCount   = clients.length;
  const ticketMedio   = clientCount > 0 ? totalRevenue / clientCount : 0;

  // Payroll = monthly fixed cost
  const folhaTotal    = collaborators.reduce((s, c) => s + c.salary, 0);
  const monthlyExpense = folhaTotal;

  const resultado     = totalRevenue - monthlyExpense;
  const marginPct     = totalRevenue > 0 ? (resultado / totalRevenue) * 100 : 0;
  const folhaPct      = totalRevenue > 0 ? (folhaTotal / totalRevenue) * 100 : 0;
  const custoAlocado  = allocations.reduce((s, a) => s + a.allocatedCost, 0);

  const riskClients   = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');
  const riskRevenue   = riskClients.reduce((s, c) => s + c.netRevenue, 0);

  return NextResponse.json({
    // Revenue
    totalRevenue,
    totalGross,
    clientCount,
    ticketMedio,

    // Cost (payroll-based)
    folhaTotal,
    monthlyExpense,   // alias for folhaTotal — used by Metas, CEO, Simulador
    folhaPct,
    custoAlocado,

    // Derived
    resultado,
    marginPct,

    // Risk
    riskClients: riskClients.length,
    riskRevenue,

    // Status flags (no longer based on imported transactions)
    hasExpenseData: folhaTotal > 0,   // true when team is registered
    hasIncomeData:  clientCount > 0,  // true when clients are registered
  });
}
