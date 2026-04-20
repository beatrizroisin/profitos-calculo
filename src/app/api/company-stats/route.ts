// src/app/api/company-stats/route.ts
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
      // CORREÇÃO: Buscamos os campos de alocação e o salário do colaborador relacionado
      select: { 
        allocationPct: true, 
        allocationHours: true,
        collaborator: {
          select: { salary: true, hoursPerMonth: true }
        }
      },
    }),
  ]);

  const totalRevenue  = clients.reduce((s, c) => s + c.netRevenue, 0);
  const totalGross    = clients.reduce((s, c) => s + c.grossRevenue, 0);
  const clientCount   = clients.length;
  const ticketMedio   = clientCount > 0 ? totalRevenue / clientCount : 0;

  const folhaTotal    = collaborators.reduce((s, c) => s + c.salary, 0);
  const monthlyExpense = folhaTotal;

  const resultado     = totalRevenue - monthlyExpense;
  const marginPct     = totalRevenue > 0 ? (resultado / totalRevenue) * 100 : 0;
  const folhaPct      = totalRevenue > 0 ? (folhaTotal / totalRevenue) * 100 : 0;

  // CORREÇÃO: Cálculo dinâmico do custo alocado
  const custoAlocado  = allocations.reduce((total, a) => {
    const salary = a.collaborator.salary || 0;
    
    if (a.allocationPct) {
      return total + (salary * (a.allocationPct / 100));
    } 
    
    if (a.allocationHours && a.collaborator.hoursPerMonth) {
      const hourlyRate = salary / a.collaborator.hoursPerMonth;
      return total + (hourlyRate * a.allocationHours);
    }
    
    return total;
  }, 0);

  const riskClients   = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');
  const riskRevenue   = riskClients.reduce((s, c) => s + c.netRevenue, 0);

  return NextResponse.json({
    totalRevenue,
    totalGross,
    clientCount,
    ticketMedio,
    folhaTotal,
    monthlyExpense,
    folhaPct,
    custoAlocado,
    resultado,
    marginPct,
    riskClients: riskClients.length,
    riskRevenue,
    hasExpenseData: folhaTotal > 0,
    hasIncomeData:  clientCount > 0,
  });
}