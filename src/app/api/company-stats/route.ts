// Returns real totals from DB for use in metas/churn/ceo/simulador
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  const [expenses, clients] = await Promise.all([
    prisma.transaction.aggregate({
      where: { companyId: u.companyId, type: 'EXPENSE' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.client.findMany({
      where: { companyId: u.companyId, status: 'ACTIVE' },
      select: { netRevenue: true },
    }),
  ]);

  const totalExpenses  = expenses._sum.amount ?? 0;
  const expenseCount   = expenses._count;
  const totalRevenue   = clients.reduce((s, c) => s + c.netRevenue, 0);
  const clientCount    = clients.length;
  const ticketMedio    = clientCount > 0 ? totalRevenue / clientCount : 0;
  const resultado      = totalRevenue - totalExpenses;

  // If no transactions yet, return 0 (user will set manually in UI)
  return NextResponse.json({
    totalExpenses,
    expenseCount,
    totalRevenue,
    clientCount,
    ticketMedio,
    resultado,
    hasData: expenseCount > 0,
  });
}
