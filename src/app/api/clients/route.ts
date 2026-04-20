// src/app/api/clients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const clientSchema = z.object({
  name:               z.string().min(2),
  document:           z.string().optional(),
  email:              z.string().email().optional().or(z.literal('')),
  phone:              z.string().optional(),
  serviceType:        z.string(),
  grossRevenue:       z.number().positive(),
  taxRate:            z.number().min(0).max(100).default(6),
  isRecurring:        z.boolean().default(true),
  totalInstallments:  z.number().int().min(0).default(12),
  currentInstallment: z.number().int().min(1).default(1),
  startDate:          z.string(),
  dueDay:             z.number().int().min(1).max(31).default(5),
  status:             z.enum(['ACTIVE','INACTIVE','PROSPECT','PIPELINE','CHURNED']).default('ACTIVE'),
  riskLevel:          z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('LOW'),
  notes:              z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const clients = await prisma.client.findMany({
    where: {
      companyId,
      ...(status ? { status: status as any } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ status: 'asc' }, { netRevenue: 'desc' }],
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  try {
    const body = await req.json();
    const data = clientSchema.parse(body);
    const netRevenue = data.grossRevenue * (1 - data.taxRate / 100);

    const client = await prisma.client.create({
      data: {
        companyId,
        ...data,
        netRevenue,
        startDate: new Date(data.startDate),
        email: data.email || null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError') return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
