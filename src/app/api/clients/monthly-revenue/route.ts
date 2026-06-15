// GET /api/clients/monthly-revenue
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface ServiceItem {
  serviceType: string;
  grossRevenue: number;
  taxRate: number;
  netRevenue: number;
  isRecurring: boolean;
  totalInstallments: number;
  currentInstallment: number;
  startDate?: string | null;
  dueDay: number;
  riskLevel: string;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const now   = new Date();
  const year  = parseInt(searchParams.get('year')  || String(now.getFullYear()));
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));

  const monthEnd = new Date(year, month, 0); // último dia do mês selecionado

  const clients = await prisma.client.findMany({
    where:  { companyId, status: 'ACTIVE' },
    select: {
      id: true, name: true, serviceType: true,
      grossRevenue: true, taxRate: true, netRevenue: true,
      isRecurring: true, dueDay: true,
      totalInstallments: true, currentInstallment: true,
      startDate: true, status: true, riskLevel: true,
      services: true, // campo Json com dados por serviço
    },
  });

  const entries: any[] = [];

  for (const c of clients) {
    // Usa services JSON se disponível, senão usa campos raiz como fallback
    const rawServices = c.services as ServiceItem[] | null;
    const serviceList: ServiceItem[] =
      Array.isArray(rawServices) && rawServices.length > 0
        ? rawServices
        : [{
            serviceType:        c.serviceType,
            grossRevenue:       c.grossRevenue,
            taxRate:            c.taxRate,
            netRevenue:         c.netRevenue,
            isRecurring:        c.isRecurring,
            totalInstallments:  c.totalInstallments,
            currentInstallment: c.currentInstallment,
            startDate:          c.startDate
              ? new Date(c.startDate).toISOString().slice(0, 10)
              : null,
            dueDay:    c.dueDay,
            riskLevel: c.riskLevel,
          }];

    for (const svc of serviceList) {
      // Determina startDate do serviço (fallback para raiz do cliente)
      const rawStart = svc.startDate
        || (c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : null);
      const startDate = rawStart ? new Date(rawStart) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);

      const isRecurring       = svc.isRecurring       ?? c.isRecurring;
      const totalInstallments = svc.totalInstallments ?? c.totalInstallments ?? 0;

      // ── PONTUAL: só aparece no mês exato do startDate ────────────────────
      if (!isRecurring) {
        if (!startDate) continue; // sem data de início = ignora
        const mesInicio = startDate.getFullYear() === year &&
                          startDate.getMonth() + 1 === month;
        if (!mesInicio) continue; // fora do mês de início = não exibe
      } else {
        // ── RECORRENTE: não mostra se ainda não começou ───────────────────
        if (startDate && startDate > monthEnd) continue;

        // Não mostra se o contrato já encerrou
        if (totalInstallments > 0 && startDate) {
          const monthsDiff =
            (year - startDate.getFullYear()) * 12 +
            (month - (startDate.getMonth() + 1));
          if (monthsDiff >= totalInstallments) continue;
        }
      }

      // Calcula parcela atual dinâmica (só para recorrente com parcelas definidas)
      let currentInstallment = svc.currentInstallment ?? c.currentInstallment ?? 1;
      if (isRecurring && totalInstallments > 0 && startDate) {
        const monthsDiff =
          (year - startDate.getFullYear()) * 12 +
          (month - (startDate.getMonth() + 1));
        currentInstallment = Math.min(Math.max(monthsDiff + 1, 1), totalInstallments);
      }

      const grossRevenue = svc.grossRevenue ?? c.grossRevenue;
      const taxRate      = svc.taxRate      ?? c.taxRate;
      const netRevenue   = svc.netRevenue   ?? grossRevenue * (1 - taxRate / 100);
      const taxAmount    = grossRevenue - netRevenue;
      const dueDay       = svc.dueDay ?? c.dueDay;
      const due          = new Date(year, month - 1, Math.min(dueDay, 28));

      entries.push({
        clientId:           c.id,
        clientName:         c.name,
        serviceType:        svc.serviceType ?? c.serviceType,
        grossRevenue,
        taxRate,
        taxAmount,
        netRevenue,
        isRecurring,
        dueDay,
        dueDate:            due.toISOString().slice(0, 10),
        totalInstallments,
        currentInstallment,
        riskLevel:          svc.riskLevel ?? c.riskLevel,
        startDate:          startDate ? startDate.toISOString().slice(0, 10) : null,
      });
    }
  }

  // Ordena por dueDay ASC
  entries.sort((a, b) => a.dueDay - b.dueDay);

  const totalGross = entries.reduce((s, e) => s + e.grossRevenue, 0);
  const totalTax   = entries.reduce((s, e) => s + e.taxAmount,    0);
  const totalNet   = entries.reduce((s, e) => s + e.netRevenue,   0);

  return NextResponse.json({ entries, totalGross, totalTax, totalNet, count: entries.length });
}