// PUT /api/users/[id] — update role or active status
// DELETE /api/users/[id] — remove user (OWNER only)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const target = await prisma.user.findFirst({ where: { id: params.id, companyId: u.companyId } });
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  if (target.id === u.id) return NextResponse.json({ error: 'Você não pode alterar sua própria conta aqui.' }, { status: 400 });
  if (!canManageRole(u.role, target.role)) return NextResponse.json({ error: 'Sem permissão para gerenciar este usuário.' }, { status: 403 });
  if (body.role && !canManageRole(u.role, body.role)) return NextResponse.json({ error: 'Sem permissão para atribuir este nível de acesso.' }, { status: 403 });

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(body.role     !== undefined ? { role:     body.role     } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (u.role !== 'OWNER') return NextResponse.json({ error: 'Somente o Proprietário pode remover usuários.' }, { status: 403 });

  const target = await prisma.user.findFirst({ where: { id: params.id, companyId: u.companyId } });
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  if (target.id === u.id) return NextResponse.json({ error: 'Não é possível remover sua própria conta.' }, { status: 400 });
  if (target.role === 'OWNER') return NextResponse.json({ error: 'Não é possível remover outro Proprietário.' }, { status: 400 });

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
