// src/app/api/clients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ServiceType, ClientStatus, RiskLevel } from '@prisma/client'; // Importe os Enums do Prisma

const clientSchema = z.object({
  name:               z.string().min(2),
  document:           z.string().optional().nullable(),
  email:              z.string().email().optional().or(z.literal('')).nullable(),
  phone:              z.string().optional().nullable(),
  // CORREÇÃO: Use z.nativeEnum para que o TS entenda que a string pertence ao Enum do Prisma
  serviceType:        z.nativeEnum(ServiceType), 
  grossRevenue:       z.number().positive(),
  taxRate:            z.number().min(0).max(100).default(6),
  isRecurring:        z.boolean().default(true),
  totalInstallments:  z.number().int().min(0).default(12),
  currentInstallment: z.number().int().min(1).default(1),
  startDate:          z.string(),
  dueDay:             z.number().int().min(1).max(31).default(5),
  status:             z.nativeEnum(ClientStatus).default(ClientStatus.ACTIVE),
  riskLevel:          z.nativeEnum(RiskLevel).default(RiskLevel.LOW),
  notes:              z.string().optional().nullable(),
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
      ...(status ? { status: status as ClientStatus } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ status: 'asc' }, { netRevenue: 'desc' }],
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId as string;

  try {
    const body = await req.json();
    const parsedData = clientSchema.parse(body);
    
    // Calculamos a receita líquida
    const netRevenue = parsedData.grossRevenue * (1 - parsedData.taxRate / 100);

    // Separamos a startDate do resto para converter em objeto Date
    const { startDate, email, ...rest } = parsedData;

    const client = await prisma.client.create({
      data: {
        ...rest,
        companyId,
        netRevenue,
        startDate: new Date(startDate),
        email: email || null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError') return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}