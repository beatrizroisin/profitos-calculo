// GET /api/clients/monthly-revenue
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const now   = new Date();
  const year  = parseInt(searchParams.get('year')  || String(now.getFullYear()));
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));

  // Primeiro e último dia do mês selecionado
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0); // último dia do mês

  const clients = await prisma.client.findMany({
    where:   { companyId, status: 'ACTIVE' },
    orderBy: { dueDay: 'asc' },
    select: {
      id: true, name: true, serviceType: true,
      grossRevenue: true, taxRate: true, netRevenue: true,
      isRecurring: true, dueDay: true,
      totalInstallments: true, currentInstallment: true,
      startDate: true, status: true, riskLevel: true,
    },
  });

  const entries = clients
    .filter(c => {
      // Filtra clientes cuja data de início ainda não chegou no mês selecionado
      if (!c.startDate) return true;
      const start = new Date(c.startDate);
      start.setHours(0, 0, 0, 0);
      // Cliente aparece apenas se startDate <= último dia do mês selecionado
      if (start > monthEnd) return false;

      // Se tem total de parcelas, verifica se o contrato ainda está vigente
      if (c.totalInstallments > 0) {
        // Calcula quantos meses passaram desde o início
        const startYear  = start.getFullYear();
        const startMonth = start.getMonth() + 1;
        const monthsDiff = (year - startYear) * 12 + (month - startMonth);
        // Se monthsDiff >= totalInstallments, o contrato já encerrou
        if (monthsDiff >= c.totalInstallments) return false;
      }

      return true;
    })
    .map(c => {
      const tax = c.grossRevenue - c.netRevenue;
      const day = Math.min(c.dueDay, 28);
      const due = new Date(year, month - 1, day);

      // Calcula parcela atual dinâmica baseada na data de início e mês selecionado
      let currentInstallment = c.currentInstallment;
      if (c.startDate && c.totalInstallments > 0) {
        const start      = new Date(c.startDate);
        const startYear  = start.getFullYear();
        const startMonth = start.getMonth() + 1;
        const monthsDiff = (year - startYear) * 12 + (month - startMonth);
        currentInstallment = Math.min(monthsDiff + 1, c.totalInstallments);
      }

      return {
        clientId:           c.id,
        clientName:         c.name,
        serviceType:        c.serviceType,
        grossRevenue:       c.grossRevenue,
        taxRate:            c.taxRate,
        taxAmount:          tax,
        netRevenue:         c.netRevenue,
        isRecurring:        c.isRecurring,
        dueDay:             c.dueDay,
        dueDate:            due.toISOString().slice(0, 10),
        totalInstallments:  c.totalInstallments,
        currentInstallment,
        riskLevel:          c.riskLevel,
        startDate:          c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : null,
      };
    });

  const totalGross = entries.reduce((s, e) => s + e.grossRevenue, 0);
  const totalTax   = entries.reduce((s, e) => s + e.taxAmount,    0);
  const totalNet   = entries.reduce((s, e) => s + e.netRevenue,   0);

  return NextResponse.json({ entries, totalGross, totalTax, totalNet, count: entries.length });
}