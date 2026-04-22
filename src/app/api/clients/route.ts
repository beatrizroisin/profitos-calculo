// src/app/api/clients/route.ts
// NOTE: Client.status is String (not ClientStatus enum) — accepts PIPELINE without DB migration
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const STATUS_VALUES = ['ACTIVE','INACTIVE','PROSPECT','PIPELINE','CHURNED'] as const;
const RISK_VALUES   = ['LOW','MEDIUM','HIGH','CRITICAL']                    as const;

const clientSchema = z.object({
  name:               z.string().min(2),
  document:           z.string().optional().nullable(),
  email:              z.string().email().optional().or(z.literal('')).nullable(),
  phone:              z.string().optional().nullable(),
  serviceType:        z.string(),
  grossRevenue:       z.number().min(0),
  taxRate:            z.number().min(0).max(100).default(6),
  isRecurring:        z.boolean().default(true),
  totalInstallments:  z.number().int().min(0).default(12),
  currentInstallment: z.number().int().min(1).default(1),
  startDate:          z.string(),
  dueDay:             z.number().int().min(1).max(31).default(5),
  status:             z.enum(STATUS_VALUES).default('ACTIVE'),
  riskLevel:          z.enum(RISK_VALUES).default('LOW'),
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
      ...(status ? { status } : {}),
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
    console.log('[clients POST] body received:', JSON.stringify({ status: body.status, name: body.name }));

    const data = clientSchema.parse(body);
    const netRevenue = data.grossRevenue * (1 - data.taxRate / 100);

    const client = await prisma.client.create({
      data: {
        companyId,
        name:               data.name,
        document:           data.document           || null,
        email:              data.email              || null,
        phone:              data.phone              || null,
        serviceType:        data.serviceType        as any,   // ServiceType enum stays
        grossRevenue:       data.grossRevenue,
        taxRate:            data.taxRate,
        netRevenue,
        isRecurring:        data.isRecurring,
        totalInstallments:  data.totalInstallments,
        currentInstallment: data.currentInstallment,
        startDate:          new Date(data.startDate),
        dueDay:             data.dueDay,
        status:             data.status,             // String field — no cast needed
        riskLevel:          data.riskLevel           as any,   // RiskLevel enum stays
        notes:              data.notes               || null,
      },
    });

    console.log('[clients POST] created client id:', client.id, 'status:', client.status);
    return NextResponse.json(client, { status: 201 });

  } catch (err: any) {
    if (err?.name === 'ZodError') {
      console.error('[clients POST] Zod error:', err.errors);
      return NextResponse.json({
        error: 'Dados inválidos: ' + err.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        details: err.errors,
      }, { status: 400 });
    }
    console.error('[clients POST] error:', err?.message, err?.code);
    return NextResponse.json({
      error: 'Erro interno: ' + (err?.message || 'desconhecido'),
    }, { status: 500 });
  }
}
