// GET /api/company-stats — v3.7 completo
// Fonte única de verdade: Dashboard, Metas, CEO, Simulador, Churn, Time.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  const now      = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [clients, collaborators, allocations, txExpense, txOverdue, txThisMonth] = await Promise.all([
    prisma.client.findMany({
      where:  { companyId: u.companyId, status: 'ACTIVE' },
      select: { id: true, name: true, netRevenue: true, grossRevenue: true, riskLevel: true, isRecurring: true, taxRate: true, dueDay: true },
    }),
    prisma.collaborator.findMany({
      where:  { companyId: u.companyId, isActive: true },
      select: { salary: true, type: true },
    }),
    prisma.collaboratorAllocation.findMany({
      where:  { companyId: u.companyId },
      select: { allocatedCost: true },
    }),
    // All non-cancelled expense transactions
    prisma.transaction.aggregate({
      where: { companyId: u.companyId, type: 'EXPENSE', status: { not: 'CANCELLED' } },
      _sum:  { amount: true },
    }),
    // Overdue transactions (inadimplência)
    prisma.transaction.findMany({
      where:  { companyId: u.companyId, type: 'INCOME', status: 'OVERDUE' },
      select: { amount: true, dueDate: true, description: true, clientId: true, client: { select: { name: true } } },
    }),
    // Income transactions this month (to detect which clients paid)
    prisma.transaction.findMany({
      where:  { companyId: u.companyId, type: 'INCOME', status: 'PAID', paidAt: { gte: thisMonth, lt: nextMonth } },
      select: { clientId: true, amount: true },
    }),
  ]);

  // Revenue
  const totalRevenue  = clients.reduce((s, c) => s + c.netRevenue, 0);
  const totalGross    = clients.reduce((s, c) => s + c.grossRevenue, 0);
  const totalTax      = totalGross - totalRevenue;
  const clientCount   = clients.length;
  const ticketMedio   = clientCount > 0 ? totalRevenue / clientCount : 0;
  const recurringRev  = clients.filter(c => c.isRecurring).reduce((s, c) => s + c.netRevenue, 0);

  // Cost breakdown
  const folhaTotal        = collaborators.reduce((s, c) => s + c.salary, 0);
  const despesasLancadas  = txExpense._sum.amount ?? 0;
  const totalCustoMensal  = folhaTotal + despesasLancadas;
  const monthlyExpense    = folhaTotal; // backwards compat

  // P&L
  const resultado          = totalRevenue - totalCustoMensal;
  const resultadoSoFolha   = totalRevenue - folhaTotal;
  const marginPct          = totalRevenue > 0 ? (resultado / totalRevenue) * 100 : 0;
  const folhaPct           = totalRevenue > 0 ? (folhaTotal / totalRevenue) * 100 : 0;
  const custoTotalPct      = totalRevenue > 0 ? (totalCustoMensal / totalRevenue) * 100 : 0;
  const saldoMes           = resultado;
  const custoAlocado       = allocations.reduce((s, a) => s + a.allocatedCost, 0);

  // Risk
  const riskClients       = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');
  const riskRevenue       = riskClients.reduce((s, c) => s + c.netRevenue, 0);
  const sortedClients     = [...clients].sort((a, b) => b.netRevenue - a.netRevenue);
  const biggestClientShare = totalRevenue > 0 && sortedClients[0]
    ? (sortedClients[0].netRevenue / totalRevenue) * 100
    : 0;
  const breakEvenClients  = ticketMedio > 0 ? Math.ceil(totalCustoMensal / ticketMedio) : 0;

  // ── INADIMPLÊNCIA ────────────────────────────────────────────────────────
  // Clients that should have paid this month (based on dueDay) but have no PAID transaction
  const paidClientIds = new Set(txThisMonth.map(t => t.clientId).filter(Boolean));
  const overdueAmount = txOverdue.reduce((s, t) => s + t.amount, 0);
  
  // Estimate this-month defaulters: recurring clients with dueDay passed and no paid record
  const today = now.getDate();
  const potentialDefaulters = clients.filter(c =>
    c.isRecurring && c.dueDay <= today && !paidClientIds.has(c.id)
  );
  const inadimplenciaEstimada = potentialDefaulters.reduce((s, c) => s + c.netRevenue, 0);
  const inadimplenciaCount    = potentialDefaulters.length;

  // ── MARGEM UNITÁRIA POR CLIENTE ─────────────────────────────────────────
  // Distribute total cost proportionally by revenue share (simplified allocation)
  const clientMargins = sortedClients.map(c => {
    const revenueShare   = totalRevenue > 0 ? c.netRevenue / totalRevenue : 0;
    const custoAlocadoC  = totalCustoMensal * revenueShare;
    const margemBruta    = c.netRevenue - custoAlocadoC;
    const margemPct      = c.netRevenue > 0 ? (margemBruta / c.netRevenue) * 100 : 0;
    return {
      id:           c.id,
      name:         c.name,
      netRevenue:   c.netRevenue,
      custoAlocado: custoAlocadoC,
      margemBruta,
      margemPct,
      isRecurring:  c.isRecurring,
      riskLevel:    c.riskLevel,
    };
  });

  // ── DRE MENSAL (estrutura P&L completa) ──────────────────────────────────
  const dre = {
    receitaBruta:       totalGross,
    deducoes:           totalTax,            // impostos
    receitaLiquida:     totalRevenue,
    custoEquipe:        folhaTotal,
    custoOperacional:   despesasLancadas,
    totalCustos:        totalCustoMensal,
    lucroOperacional:   resultado,
    margemOperacional:  marginPct,
    // Projeções para 3 meses (linear, sem crescimento)
    projecao3m: [1,2,3].map(i => ({
      mes:     i,
      receita: totalRevenue,
      custo:   totalCustoMensal,
      lucro:   resultado,
    })),
  };

  // ── FLUXO DE CAIXA — 6 meses futuros ────────────────────────────────────
  // Projeção simples: receita atual + crescimento médio 0 (conservador)
  // Em versão futura: usar histórico de transações para calcular crescimento
  const cashflowProjection = Array.from({ length: 6 }, (_, i) => {
    const mes = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    return {
      mes:     mes.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      receita: totalRevenue,
      custo:   totalCustoMensal,
      saldo:   resultado,
      acumulado: resultado * (i + 1),
    };
  });

  return NextResponse.json({
    // Revenue
    totalRevenue, totalGross, totalTax, clientCount, ticketMedio, recurringRev,

    // Cost breakdown
    folhaTotal, despesasLancadas, totalCustoMensal, monthlyExpense,

    // P&L
    resultado, resultadoSoFolha, marginPct, folhaPct, custoTotalPct, saldoMes,

    // Risk
    riskClients: riskClients.length, riskRevenue, biggestClientShare, breakEvenClients,

    // NEW: DRE estruturado
    dre,

    // NEW: Inadimplência
    inadimplencia: {
      count:          inadimplenciaCount,
      valorEstimado:  inadimplenciaEstimada,
      clientes:       potentialDefaulters.map(c => ({ id: c.id, name: c.name, netRevenue: c.netRevenue, dueDay: c.dueDay })),
      overdueAmount,
      overdueCount:   txOverdue.length,
    },

    // NEW: Margem por cliente
    clientMargins,

    // NEW: Cashflow projection
    cashflowProjection,

    // Allocations
    custoAlocado,

    // Flags
    hasExpenseData: folhaTotal > 0 || despesasLancadas > 0,
    hasIncomeData:  clientCount > 0,
    hasFolha:       folhaTotal > 0,
    hasDespesas:    despesasLancadas > 0,
  });
}
