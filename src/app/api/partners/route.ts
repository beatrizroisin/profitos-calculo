import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  name:        z.string().min(2),
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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const partners = await prisma.partner.findMany({
    where: { companyId },
    include: {
      commissions: {
        include: { client: { select: { id: true, name: true, netRevenue: true, grossRevenue: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(partners);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const { commissions, ...rest } = data;

    const partner = await prisma.partner.create({
      data: {
        companyId,
        ...rest,
        commissions: commissions?.length ? {
          create: commissions.map(c => ({ companyId, clientId: c.clientId, pct: c.pct })),
        } : undefined,
      },
      include: { commissions: { include: { client: { select: { id: true, name: true, netRevenue: true, grossRevenue: true } } } } },
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError') return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    console.error('[partners POST]', err?.message);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}