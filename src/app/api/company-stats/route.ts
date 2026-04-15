// GET /api/company-stats
// Returns real aggregated stats from DB for Dashboard, Metas, Churn, CEO, Simulador.
// All modules use this single source of truth after import.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  const now = new Date();
  // Rolling 3-month window for monthly average calculation
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const [
    allExpenses,
    recentExpenses,
    allIncome,
    clients,
    collaborators,
    allocations,
  ] = await Promise.all([
    // All-time expenses: total and count
    prisma.transaction.aggregate({
      where: { companyId: u.companyId, type: 'EXPENSE' },
      _sum:   { amount: true },
      _count: true,
    }),
    // Last 3 months expenses: for monthly average
    prisma.transaction.aggregate({
      where: { companyId: u.companyId, type: 'EXPENSE', dueDate: { gte: threeMonthsAgo } },
      _sum: { amount: true },
      _count: true,
    }),
    // All-time income from transactions
    prisma.transaction.aggregate({
      where: { companyId: u.companyId, type: 'INCOME' },
      _sum:   { amount: true },
      _count: true,
    }),
    // Active clients: recurring revenue
    prisma.client.findMany({
      where:  { companyId: u.companyId, status: 'ACTIVE' },
      select: { id: true, name: true, netRevenue: true, grossRevenue: true, riskLevel: true, isRecurring: true },
    }),
    // Collaborators for payroll calculation
    prisma.collaborator.findMany({
      where:  { companyId: u.companyId, isActive: true },
      select: { salary: true, type: true },
    }),
    // Allocations for allocated cost
    prisma.collaboratorAllocation.findMany({
      where:  { companyId: u.companyId },
      select: { allocatedCost: true },
    }),
  ]);

  const totalExpensesAllTime = allExpenses._sum.amount ?? 0;
  const expenseCount         = allExpenses._count;
  const recentExpenseTotal   = recentExpenses._sum.amount ?? 0;
  const recentExpenseCount   = recentExpenses._count;

  // Monthly average expense: prefer recent 3-month window; fall back to all-time / months
  let monthlyExpense = 0;
  if (recentExpenseCount > 0) {
    // Divide by 3 months
    monthlyExpense = recentExpenseTotal / 3;
  } else if (expenseCount > 0) {
    // All-time: estimate months from date range or assume 3
    monthlyExpense = totalExpensesAllTime / 3;
  }

  // Revenue from clients (recurring model — reliable)
  const totalRevenue    = clients.reduce((s, c) => s + c.netRevenue, 0);
  const totalGross      = clients.reduce((s, c) => s + c.grossRevenue, 0);
  const clientCount     = clients.length;
  const ticketMedio     = clientCount > 0 ? totalRevenue / clientCount : 0;

  // Revenue from income transactions (one-off projects / receipts)
  const txIncome        = allIncome._sum.amount ?? 0;
  const txIncomeCount   = allIncome._count;

  // Payroll
  const folhaTotal      = collaborators.reduce((s, c) => s + c.salary, 0);
  const folhaPct        = monthlyExpense > 0 ? (folhaTotal / monthlyExpense) * 100 : 0;

  // Allocated cost
  const custoAlocado    = allocations.reduce((s, a) => s + a.allocatedCost, 0);

  // Resultado: use best available expense figure
  const effectiveExpense = monthlyExpense > 0 ? monthlyExpense : folhaTotal || 0;
  const resultado        = totalRevenue - effectiveExpense;

  // Risk clients
  const riskClients     = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');
  const riskRevenue     = riskClients.reduce((s, c) => s + c.netRevenue, 0);

  return NextResponse.json({
    // Core financials
    totalExpensesAllTime,
    recentExpenseTotal,
    monthlyExpense,           // best estimate of monthly fixed cost
    expenseCount,

    // Revenue
    totalRevenue,             // from clients (recurring)
    totalGross,
    txIncome,                 // from income transactions
    txIncomeCount,
    clientCount,
    ticketMedio,

    // Derived
    resultado,                // totalRevenue - monthlyExpense
    marginPct: totalRevenue > 0 ? (resultado / totalRevenue) * 100 : 0,

    // Payroll
    folhaTotal,
    folhaPct,
    custoAlocado,

    // Risk
    riskClients: riskClients.length,
    riskRevenue,

    // Meta flag: do we have real transaction data?
    hasExpenseData: expenseCount > 0,
    hasIncomeData: txIncomeCount > 0,
  });
}
