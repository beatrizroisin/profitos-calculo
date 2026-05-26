import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const config = await prisma.contaAzulConfig.findUnique({
    where: { companyId },
    select: { isActive: true, lastSyncAt: true },
  });

  return NextResponse.json({
    connected: config?.isActive ?? false,
    lastSyncAt: config?.lastSyncAt ?? null,
  });
}