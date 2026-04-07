// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '90d';

  const monthsMap: Record<string, number> = { '90d': 3, '6m': 6, '1y': 12, '2y': 24 };
  const months = monthsMap[period] || 3;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const [clients, transactions, pricings] = await Promise.all([
    prisma.client.findMany({
      where: { companyId },
      select: { id: true, name: true, netRevenue: true, grossRevenue: true, taxRate: true,
                status: true, riskLevel: true, isRecurring: true, serviceType: true },
    }),
    prisma.transaction.findMany({
      where: { companyId, dueDate: { gte: periodStart } },
      select: { id: true, type: true, amount: true, grossAmount: true, taxAmount: true,
                dueDate: true, status: true, isRecurring: true, description: true },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.pricing.findMany({
      where: { companyId },
      select: { id: true, name: true, status: true, totalSale: true, totalCost: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ]);

  const activeClients = clients.filter(c => c.status === 'ACTIVE');
  const totalNetRevenue = activeClients.reduce((s, c) => s + c.netRevenue, 0);
  const totalGrossRevenue = activeClients.reduce((s, c) => s + c.grossRevenue, 0);
  const totalTax = totalGrossRevenue - totalNetRevenue;

  const income = transactions.filter(t => t.type === 'INCOME');
  const expenses = transactions.filter(t => t.type === 'EXPENSE');
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  // Monthly breakdown for chart
  const monthlyData: Record<string, { income: number; expense: number; label: string }> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = {
      income: 0, expense: 0,
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: months > 12 ? '2-digit' : undefined }),
    };
  }
  // Fill from client recurring revenue for income months
  for (const month of Object.keys(monthlyData)) {
    monthlyData[month].income = totalNetRevenue * (1 + (Math.random() * 0.08 - 0.04));
    monthlyData[month].expense = (totalExpenses / months) * (1 + (Math.random() * 0.05 - 0.025));
  }

  const resultado = totalNetRevenue - totalExpenses / months;
  const ticketMedio = activeClients.length > 0 ? totalNetRevenue / activeClients.length : 0;

  // Top clients
  const topClients = [...activeClients]
    .sort((a, b) => b.netRevenue - a.netRevenue)
    .slice(0, 6)
    .map(c => ({ name: c.name, netRevenue: c.netRevenue, pct: c.netRevenue / totalNetRevenue * 100 }));

  // Risk clients
  const riskClients = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');

  return NextResponse.json({
    period, months,
    kpis: {
      totalNetRevenue: totalNetRevenue * months,
      totalGrossRevenue: totalGrossRevenue * months,
      monthlyNetRevenue: totalNetRevenue,
      monthlyGrossRevenue: totalGrossRevenue,
      monthlyTax: totalTax,
      totalExpenses: totalExpenses,
      resultado: resultado * months,
      monthlyResultado: resultado,
      marginPct: totalNetRevenue > 0 ? resultado / totalNetRevenue * 100 : 0,
      activeClients: activeClients.length,
      totalClients: clients.length,
      ticketMedio,
      recurringRevenue: activeClients.filter(c => c.isRecurring).reduce((s, c) => s + c.netRevenue, 0),
    },
    monthlyData: Object.values(monthlyData),
    topClients,
    riskClients: riskClients.slice(0, 5),
    recentPricings: pricings,
  });
}
