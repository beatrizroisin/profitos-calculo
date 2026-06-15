import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { services, positions } = await req.json();

  await prisma.companySettings.upsert({
    where:  { companyId },
    update: { customServices: services, customPositions: positions },
    create: { companyId, customServices: services, customPositions: positions },
  });

  return NextResponse.json({ success: true });
}