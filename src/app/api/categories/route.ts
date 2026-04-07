import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  const cats = await prisma.category.findMany({
    where: { companyId: u.companyId, ...(type ? { type: type as any } : {}) },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, type, color } = await req.json();
  const cat = await prisma.category.create({ data: { companyId: u.companyId, name, type, color } });
  return NextResponse.json(cat, { status: 201 });
}
