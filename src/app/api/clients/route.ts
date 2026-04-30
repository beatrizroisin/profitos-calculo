// src/app/api/clients/route.ts
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
  // Campos contratuais
  aniversario:        z.string().optional().nullable(),
  endCep:             z.string().optional().nullable(),
  endRua:             z.string().optional().nullable(),
  endNumero:          z.string().optional().nullable(),
  endBairro:          z.string().optional().nullable(),
  endCidade:          z.string().optional().nullable(),
  endEstado:          z.string().optional().nullable(),
  repNome:            z.string().optional().nullable(),
  repRG:              z.string().optional().nullable(),
  repCPF:             z.string().optional().nullable(),
  repEstadoCivil:     z.string().optional().nullable(),
  testNome:           z.string().optional().nullable(),
  testCPF:            z.string().optional().nullable(),
  testEmail:          z.string().optional().nullable(),
  finNome:            z.string().optional().nullable(),
  finEmail:           z.string().optional().nullable(),
  finTelefone:        z.string().optional().nullable(),
  projNome:           z.string().optional().nullable(),
  projEmail:          z.string().optional().nullable(),
  projTelefone:       z.string().optional().nullable(),
  formaPagamento:     z.string().optional().nullable(),
  regimeTributario:   z.string().optional().nullable(),
  tipoProjeto:        z.string().optional().nullable(),
  servicosContratados: z.string().optional().nullable(),
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
    orderBy: [{ orderId: 'asc' }],
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
        name:                data.name,
        document:            data.document           || null,
        email:               data.email              || null,
        phone:               data.phone              || null,
        serviceType:         data.serviceType        as any,
        grossRevenue:        data.grossRevenue,
        taxRate:             data.taxRate,
        netRevenue,
        isRecurring:         data.isRecurring,
        totalInstallments:   data.totalInstallments,
        currentInstallment:  data.currentInstallment,
        startDate:           new Date(data.startDate),
        dueDay:              data.dueDay,
        status:              data.status,
        riskLevel:           data.riskLevel          as any,
        notes:               data.notes              || null,
        aniversario:         data.aniversario        ?? null,
        endCep:              data.endCep             ?? null,
        endRua:              data.endRua             ?? null,
        endNumero:           data.endNumero          ?? null,
        endBairro:           data.endBairro          ?? null,
        endCidade:           data.endCidade          ?? null,
        endEstado:           data.endEstado          ?? null,
        repNome:             data.repNome            ?? null,
        repRG:               data.repRG              ?? null,
        repCPF:              data.repCPF             ?? null,
        repEstadoCivil:      data.repEstadoCivil     ?? null,
        testNome:            data.testNome           ?? null,
        testCPF:             data.testCPF            ?? null,
        testEmail:           data.testEmail          ?? null,
        finNome:             data.finNome            ?? null,
        finEmail:            data.finEmail           ?? null,
        finTelefone:         data.finTelefone        ?? null,
        projNome:            data.projNome           ?? null,
        projEmail:           data.projEmail          ?? null,
        projTelefone:        data.projTelefone       ?? null,
        formaPagamento:      data.formaPagamento     ?? null,
        regimeTributario:    data.regimeTributario   ?? null,
        tipoProjeto:         data.tipoProjeto        ?? null,
        servicosContratados: data.servicosContratados ?? null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({
        error: 'Dados inválidos: ' + err.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        details: err.errors,
      }, { status: 400 });
    }
    console.error('[clients POST] error:', err?.message, err?.code);
    return NextResponse.json({ error: 'Erro interno: ' + (err?.message || 'desconhecido') }, { status: 500 });
  }
}