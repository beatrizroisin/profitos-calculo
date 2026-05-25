import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const monthRef = searchParams.get('monthRef');
  const status   = searchParams.get('status');
  const search   = searchParams.get('search');

  const bills = await prisma.contaAzulBill.findMany({
    where: {
      companyId,
      ...(monthRef ? { monthRef } : {}),
      ...(status   ? { status }   : {}),
      ...(search   ? {
        OR: [
          { description:  { contains: search, mode: 'insensitive' } },
          { supplierName: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { dueDate: 'asc' },
  });

  return NextResponse.json(bills);
}