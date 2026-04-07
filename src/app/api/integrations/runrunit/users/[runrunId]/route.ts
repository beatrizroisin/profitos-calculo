import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest, { params }: { params: { runrunId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const config = await prisma.runRunConfig.findUnique({ where: { companyId: u.companyId } });
  if (!config) return NextResponse.json({ error: 'Não configurado.' }, { status: 404 });

  await prisma.runRunUserLink.deleteMany({ where: { configId: config.id, runrunUserId: params.runrunId } });
  return NextResponse.json({ success: true });
}
