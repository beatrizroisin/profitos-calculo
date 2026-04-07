import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN','MANAGER'].includes(u.role))
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });

  const result = await prisma.collaboratorAllocation.deleteMany({
    where: { id: params.id, companyId: u.companyId },
  });
  if (result.count === 0) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN','MANAGER'].includes(u.role))
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });

  const body = await req.json();
  const result = await prisma.collaboratorAllocation.updateMany({
    where: { id: params.id, companyId: u.companyId },
    data: {
      serviceType:     body.serviceType,
      allocationPct:   body.allocationPct ?? null,
      allocationHours: body.allocationHours ?? null,
      notes:           body.notes ?? null,
    },
  });
  if (result.count === 0) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
