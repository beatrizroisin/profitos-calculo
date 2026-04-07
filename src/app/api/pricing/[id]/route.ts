// src/app/api/pricing/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calcPricingItem } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const pricing = await prisma.pricing.findFirst({
    where: { id: params.id, companyId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!pricing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(pricing);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  try {
    const body = await req.json();
    const { items = [], ...pricingData } = body;

    let totalCost = 0, totalSale = 0;
    const processedItems = items.map((item: any, idx: number) => {
      const calcs = calcPricingItem({
        costPerHour:    item.costPerHour,
        peopleCount:    item.peopleCount,
        marginRate:     pricingData.marginRate || 50,
        taxRate:        pricingData.taxRate    || 15,
        hoursPerMonth:  pricingData.hoursPerMonth || 160,
        projectPct:     item.projectPct || 0,
        hoursAllocated: item.hoursAllocated || 0,
      });
      totalCost += calcs.teamMonthlyCost;
      totalSale += calcs.saleByHour;
      return { ...item, ...calcs, sortOrder: idx };
    });

    // Delete old items and recreate
    await prisma.pricingItem.deleteMany({ where: { pricingId: params.id } });

    const pricing = await prisma.pricing.update({
      where: { id: params.id },
      data: {
        ...pricingData,
        totalCost, totalSale,
        validUntil: pricingData.validUntil ? new Date(pricingData.validUntil) : null,
        items: {
          create: processedItems.map(({ id: _, ...item }: any) => ({ ...item, companyId })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json(pricing);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  await prisma.pricing.deleteMany({ where: { id: params.id, companyId } });
  return NextResponse.json({ success: true });
}
