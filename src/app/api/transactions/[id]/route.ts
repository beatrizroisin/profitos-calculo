import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN','MANAGER'].includes(u.role))
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });

  const body = await req.json();
  const result = await prisma.transaction.updateMany({
    where: { id: params.id, companyId: u.companyId },
    data: {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      paidAt:  body.paidAt  ? new Date(body.paidAt)  : null,
    },
  });
  if (result.count === 0) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role))
    return NextResponse.json({ error: 'Somente OWNER/ADMIN podem excluir lançamentos.' }, { status: 403 });

  const result = await prisma.transaction.deleteMany({ where: { id: params.id, companyId: u.companyId } });
  if (result.count === 0) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
