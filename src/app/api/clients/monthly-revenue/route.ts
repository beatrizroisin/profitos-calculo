// GET /api/clients/monthly-revenue
// Returns all ACTIVE clients as monthly revenue entries (not manual transactions).
// Used by Contas a Receber to show the expected monthly income per client.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const clients = await prisma.client.findMany({
    where:   { companyId, status: 'ACTIVE' },
    orderBy: { netRevenue: 'desc' },
    select: {
      id: true, name: true, serviceType: true,
      grossRevenue: true, taxRate: true, netRevenue: true,
      isRecurring: true, dueDay: true,
      totalInstallments: true, currentInstallment: true,
      startDate: true, status: true, riskLevel: true,
    },
  });

  // Build monthly revenue entries from active clients
  const now = new Date();
  const entries = clients.map(c => {
    const tax   = c.grossRevenue - c.netRevenue;
    const day   = Math.min(c.dueDay, 28); // cap at 28 to avoid month overflow
    const due   = new Date(now.getFullYear(), now.getMonth(), day);

    return {
      clientId:    c.id,
      clientName:  c.name,
      serviceType: c.serviceType,
      grossRevenue: c.grossRevenue,
      taxRate:      c.taxRate,
      taxAmount:    tax,
      netRevenue:   c.netRevenue,
      isRecurring:  c.isRecurring,
      dueDay:       c.dueDay,
      dueDate:      due.toISOString().slice(0, 10),
      totalInstallments:  c.totalInstallments,
      currentInstallment: c.currentInstallment,
      riskLevel:    c.riskLevel,
    };
  });

  const totalGross  = entries.reduce((s, e) => s + e.grossRevenue, 0);
  const totalTax    = entries.reduce((s, e) => s + e.taxAmount,    0);
  const totalNet    = entries.reduce((s, e) => s + e.netRevenue,   0);

  return NextResponse.json({ entries, totalGross, totalTax, totalNet, count: entries.length });
}
