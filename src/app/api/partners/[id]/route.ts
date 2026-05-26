import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  name:        z.string().min(2).optional(),
  email:       z.string().email().optional().nullable(),
  phone:       z.string().optional().nullable(),
  document:    z.string().optional().nullable(),
  pixKey:      z.string().optional().nullable(),
  bankName:    z.string().optional().nullable(),
  bankAgency:  z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  paymentDay:  z.number().int().min(1).max(31).optional().nullable(),
  notes:       z.string().optional().nullable(),
  isActive:    z.boolean().optional(),
  commissions: z.array(z.object({
    clientId: z.string(),
    pct:      z.number().min(0).max(100),
  })).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const { commissions, ...rest } = data;

    await prisma.$transaction(async (tx) => {
      await tx.partner.update({ where: { id: params.id }, data: rest });
      if (commissions !== undefined) {
        await tx.partnerCommission.deleteMany({ where: { partnerId: params.id } });
        if (commissions.length > 0) {
          await tx.partnerCommission.createMany({
            data: commissions.map(c => ({ companyId, partnerId: params.id, clientId: c.clientId, pct: c.pct })),
          });
        }
      }
    });

    const updated = await prisma.partner.findUnique({
      where: { id: params.id },
      include: { commissions: { include: { client: { select: { id: true, name: true, netRevenue: true, grossRevenue: true } } } } },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[partners PUT]', err?.message);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.partner.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}