// GET /api/company-stats — v3.8 FINAL REFINADO
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const u = session.user as any;

    const now = new Date();
    const today = now.getDate();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [clients, collaborators, txExpense, txOverdue, txPaidThisMonth] = await Promise.all([
      prisma.client.findMany({
        where: { companyId: u.companyId, status: 'ACTIVE' },
        select: { id: true, name: true, netRevenue: true, grossRevenue: true, riskLevel: true, isRecurring: true, dueDay: true },
      }),
      prisma.collaborator.findMany({
        where: { companyId: u.companyId, isActive: true },
        select: { salary: true },
      }),
      prisma.transaction.aggregate({
        where: { companyId: u.companyId, type: 'EXPENSE', status: { not: 'CANCELLED' } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { companyId: u.companyId, type: 'INCOME', status: 'OVERDUE' },
        select: { amount: true, clientId: true },
      }),
      prisma.transaction.findMany({
        where: { 
          companyId: u.companyId, 
          type: 'INCOME', 
          status: 'PAID', 
          paidAt: { gte: thisMonth, lt: nextMonth } 
        },
        select: { clientId: true },
      }),
    ]);

    // ── REVENUE CALCULATIONS ──
    const totalRevenue = clients.reduce((s, c) => s + (c.netRevenue || 0), 0);
    const totalGross = clients.reduce((s, c) => s + (c.grossRevenue || 0), 0);
    const totalTax = Math.max(0, totalGross - totalRevenue);
    const clientCount = clients.length;
    const ticketMedio = clientCount > 0 ? totalRevenue / clientCount : 0;
    const recurringRev = clients.filter(c => c.isRecurring).reduce((s, c) => s + (c.netRevenue || 0), 0);

    // ── COST CALCULATIONS ──
    const folhaTotal = collaborators.reduce((s, c) => s + (c.salary || 0), 0);
    const despesasLancadas = txExpense._sum.amount ?? 0;
    const totalCustoMensal = folhaTotal + despesasLancadas;

    // ── P&L & MARGINS ──
    const resultado = totalRevenue - totalCustoMensal;
    const marginPct = totalRevenue > 0 ? (resultado / totalRevenue) * 100 : 0;
    const folhaPct = totalRevenue > 0 ? (folhaTotal / totalRevenue) * 100 : 0;
    const breakEvenClients = ticketMedio > 0 ? Math.ceil(totalCustoMensal / ticketMedio) : 0;

    // ── INADIMPLÊNCIA (Realista) ──
    const paidClientIds = new Set(txPaidThisMonth.map(t => t.clientId).filter(Boolean));
    const potentialDefaulters = clients.filter(c => 
      c.isRecurring && c.dueDay <= today && !paidClientIds.has(c.id)
    );
    
    const inadimplenciaEstimada = potentialDefaulters.reduce((s, c) => s + c.netRevenue, 0);
    const overdueTotal = txOverdue.reduce((s, t) => s + t.amount, 0);

    // ── MARGEM POR CLIENTE ──
    const clientMargins = clients
      .sort((a, b) => b.netRevenue - a.netRevenue)
      .map(c => {
        const revenueShare = totalRevenue > 0 ? c.netRevenue / totalRevenue : 0;
        const custoAlocadoC = totalCustoMensal * revenueShare;
        const margemBruta = c.netRevenue - custoAlocadoC;
        return {
          id: c.id,
          name: c.name,
          netRevenue: c.netRevenue,
          custoAlocado: custoAlocadoC,
          margemBruta,
          margemPct: c.netRevenue > 0 ? (margemBruta / c.netRevenue) * 100 : 0,
          riskLevel: c.riskLevel,
        };
      });

    // ── CASHFLOW PROJECTION ──
    const cashflowProjection = Array.from({ length: 6 }, (_, i) => {
      const mes = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      return {
        mes: mes.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
        receita: totalRevenue,
        custo: totalCustoMensal,
        saldo: resultado,
        acumulado: resultado * (i + 1),
      };
    });

    return NextResponse.json({
      // Básicos
      totalRevenue,
      totalGross,
      totalTax,
      clientCount,
      ticketMedio,
      recurringRev,
      folhaTotal,
      despesasLancadas,
      totalCustoMensal,
      resultado,
      marginPct,
      folhaPct,
      breakEvenClients,
      
      // Estruturados
      inadimplencia: {
        count: potentialDefaulters.length,
        valorEstimado: inadimplenciaEstimada,
        overdueTotal,
        overdueCount: txOverdue.length
      },
      clientMargins: clientMargins.slice(0, 10), // Limitamos para não sobrecarregar o JSON
      cashflowProjection,
      
      // Flags de interface
      hasExpenseData: totalCustoMensal > 0,
      hasIncomeData: clientCount > 0,
      periodLabel: "30 dias"
    });

  } catch (error) {
    console.error("CRITICAL ERROR API stats:", error);
    // Retorna 500 mas com um objeto JSON para o frontend não explodir no .json()
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}