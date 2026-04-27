// src/app/api/collaborators/route.ts — v3.9
// FIX: Schema Zod agora aceita todos os 20+ campos HR.
// POST persiste CPF, email, phone, PIX, dados bancários, endereço, etc.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  // Obrigatórios
  name:             z.string().min(2),
  position:         z.string().min(1),
  type:             z.enum(['PJ','CLT']).default('PJ'),
  salary:           z.number().positive(),
  hoursPerMonth:    z.number().int().min(1).max(300).default(160),
  isActive:         z.boolean().optional(),
  notes:            z.string().optional().nullable(),
  // Identificação estendida
  document:         z.string().optional().nullable(), // CPF
  rg:               z.string().optional().nullable(),
  email:            z.union([z.string().email(), z.literal('')]).optional().nullable(),
  phone:            z.string().optional().nullable(),
  birthDate:        z.string().optional().nullable(),
  startDate:        z.string().optional().nullable(),
  endDate:          z.string().optional().nullable(),
  razaoSocial:      z.string().optional().nullable(),
  cnpj:             z.string().optional().nullable(),
  // Pagamento
  pixKey:           z.string().optional().nullable(),
  paymentMethod:    z.string().optional().nullable(),
  paymentDay:       z.number().int().min(1).max(31).optional().nullable(),
  bankName:         z.string().optional().nullable(),
  bankAgency:       z.string().optional().nullable(),
  bankAccount:      z.string().optional().nullable(),
  bankAccountType:  z.string().optional().nullable(),
  // Pessoal
  address:          z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone:   z.string().optional().nullable(),
  instagram:        z.string().optional().nullable(),
  nivelExperiencia: z.string().optional().nullable(),
  estadoCivil:      z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  const colabs = await prisma.collaborator.findMany({
    where: { companyId: u.companyId },
    include: {
      allocations: {
        include: { client: { select: { id: true, name: true, netRevenue: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const enriched = colabs.map(c => {
    const costPerHour = c.salary / c.hoursPerMonth;
    const totalAllocatedCost = c.allocations.reduce((sum, a) => {
      const viaPct   = a.allocationPct   != null ? c.salary * a.allocationPct / 100 : null;
      const viaHours = a.allocationHours != null ? costPerHour * a.allocationHours  : null;
      if (viaPct != null && viaHours != null) return sum + Math.max(viaPct, viaHours);
      return sum + (viaPct ?? viaHours ?? 0);
    }, 0);
    const allocatedHours = c.allocations.reduce((sum, a) => {
      return sum + (a.allocationHours ?? (a.allocationPct != null ? c.hoursPerMonth * a.allocationPct / 100 : 0));
    }, 0);
    const occupancyPct = (allocatedHours / c.hoursPerMonth) * 100;
    return { ...c, costPerHour, totalAllocatedCost, allocatedHours, occupancyPct };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN','MANAGER'].includes(u.role))
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });

  try {
    const data = schema.parse(await req.json());
    const colab = await prisma.collaborator.create({
      data: {
        companyId:        u.companyId,
        name:             data.name,
        position:         data.position,
        type:             data.type,
        salary:           data.salary,
        hoursPerMonth:    data.hoursPerMonth,
        isActive:         data.isActive ?? true,
        notes:            data.notes            ?? null,
        document:         data.document         ?? null,
        rg:               data.rg               ?? null,
        email:            data.email            ?? null,
        phone:            data.phone            ?? null,
        birthDate:        data.birthDate        ? new Date(data.birthDate)  : null,
        startDate:        data.startDate        ? new Date(data.startDate)  : null,
        endDate:          data.endDate          ? new Date(data.endDate)    : null,
        razaoSocial:      data.razaoSocial      ?? null,
        cnpj:             data.cnpj             ?? null,
        pixKey:           data.pixKey           ?? null,
        paymentMethod:    data.paymentMethod    ?? null,
        paymentDay:       data.paymentDay       ?? null,
        bankName:         data.bankName         ?? null,
        bankAgency:       data.bankAgency       ?? null,
        bankAccount:      data.bankAccount      ?? null,
        bankAccountType:  data.bankAccountType  ?? null,
        address:          data.address          ?? null,
        emergencyContact: data.emergencyContact ?? null,
        emergencyPhone:   data.emergencyPhone   ?? null,
        instagram:        data.instagram        ?? null,
        nivelExperiencia: data.nivelExperiencia ?? null,
        estadoCivil:      data.estadoCivil      ?? null,
      },
    });
    return NextResponse.json(colab, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError')
      return NextResponse.json({ error: 'Dados inválidos.', details: err.errors }, { status: 400 });
    console.error('[collaborators POST]', err?.message, err?.code);
    return NextResponse.json({ error: 'Erro interno: ' + (err?.message ?? '') }, { status: 500 });
  }
}
