// src/app/api/pricing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calcPricingItem } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const pricings = await prisma.pricing.findMany({
    where: { companyId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(pricings);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  try {
    const body = await req.json();
    const { items = [], ...pricingData } = body;

    // Calculate totals from items
    let totalCost = 0, totalSale = 0;
    const processedItems = items.map((item: any, idx: number) => {
      const calcs = calcPricingItem({
        costPerHour:   item.costPerHour,
        peopleCount:   item.peopleCount,
        marginRate:    pricingData.marginRate || 50,
        taxRate:       pricingData.taxRate    || 15,
        hoursPerMonth: pricingData.hoursPerMonth || 160,
        projectPct:    item.projectPct || 0,
        hoursAllocated: item.hoursAllocated || 0,
      });
      totalCost += calcs.teamMonthlyCost;
      totalSale += calcs.saleByHour;
      return { ...item, ...calcs, companyId, sortOrder: idx };
    });

    const pricing = await prisma.pricing.create({
      data: {
        companyId,
        name:         pricingData.name        || 'Nova precificação',
        clientName:   pricingData.clientName  || null,
        status:       pricingData.status      || 'DRAFT',
        taxRate:      pricingData.taxRate      || 15,
        marginRate:   pricingData.marginRate   || 50,
        hoursPerMonth: pricingData.hoursPerMonth || 160,
        totalCost,
        totalSale,
        notes:        pricingData.notes       || null,
        validUntil:   pricingData.validUntil ? new Date(pricingData.validUntil) : null,
        items: {
          create: processedItems.map(({ companyId: _, ...item }: any) => item),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json(pricing, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
