// src/app/api/collaborators/[id]/route.ts — v3.9
// FIX: PUT usava data: body direto no Prisma (P2009 — campos calculados desconhecidos).
// Agora usa Zod + payload EXPLÍCITO campo a campo → elimina "Erro de conexão".
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  name:             z.string().min(2).optional(),
  position:         z.string().min(1).optional(),
  type:             z.enum(['PJ','CLT']).optional(),
  salary:           z.number().positive().optional(),
  hoursPerMonth:    z.number().int().min(1).max(300).optional(),
  isActive:         z.boolean().optional(),
  notes:            z.string().optional().nullable(),
  document:         z.string().optional().nullable(),
  rg:               z.string().optional().nullable(),
  email:            z.union([z.string().email(), z.literal('')]).optional().nullable(),
  phone:            z.string().optional().nullable(),
  birthDate:        z.string().optional().nullable(),
  startDate:        z.string().optional().nullable(),
  endDate:          z.string().optional().nullable(),
  razaoSocial:      z.string().optional().nullable(),
  cnpj:             z.string().optional().nullable(),
  pixKey:           z.string().optional().nullable(),
  paymentMethod:    z.string().optional().nullable(),
  paymentDay:       z.number().int().min(1).max(31).optional().nullable(),
  bankName:         z.string().optional().nullable(),
  bankAgency:       z.string().optional().nullable(),
  bankAccount:      z.string().optional().nullable(),
  bankAccountType:  z.string().optional().nullable(),
  address:          z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone:   z.string().optional().nullable(),
  instagram:        z.string().optional().nullable(),
  nivelExperiencia: z.string().optional().nullable(),
  estadoCivil:      z.string().optional().nullable(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN','MANAGER'].includes(u.role))
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    // PAYLOAD EXPLÍCITO — nunca spread body direto no Prisma
    // Campos calculados (costPerHour, allocations[], occupancyPct) são ignorados pelo Zod
    const upd: Record<string, any> = {};
    if (data.name             !== undefined) upd.name             = data.name;
    if (data.position         !== undefined) upd.position         = data.position;
    if (data.type             !== undefined) upd.type             = data.type;
    if (data.salary           !== undefined) upd.salary           = data.salary;
    if (data.hoursPerMonth    !== undefined) upd.hoursPerMonth    = data.hoursPerMonth;
    if (data.isActive         !== undefined) upd.isActive         = data.isActive;
    if (data.notes            !== undefined) upd.notes            = data.notes            ?? null;
    if (data.document         !== undefined) upd.document         = data.document         ?? null;
    if (data.rg               !== undefined) upd.rg               = data.rg               ?? null;
    if (data.email            !== undefined) upd.email            = data.email            ?? null;
    if (data.phone            !== undefined) upd.phone            = data.phone            ?? null;
    if (data.razaoSocial      !== undefined) upd.razaoSocial      = data.razaoSocial      ?? null;
    if (data.cnpj             !== undefined) upd.cnpj             = data.cnpj             ?? null;
    if (data.pixKey           !== undefined) upd.pixKey           = data.pixKey           ?? null;
    if (data.paymentMethod    !== undefined) upd.paymentMethod    = data.paymentMethod    ?? null;
    if (data.paymentDay       !== undefined) upd.paymentDay       = data.paymentDay       ?? null;
    if (data.bankName         !== undefined) upd.bankName         = data.bankName         ?? null;
    if (data.bankAgency       !== undefined) upd.bankAgency       = data.bankAgency       ?? null;
    if (data.bankAccount      !== undefined) upd.bankAccount      = data.bankAccount      ?? null;
    if (data.bankAccountType  !== undefined) upd.bankAccountType  = data.bankAccountType  ?? null;
    if (data.address          !== undefined) upd.address          = data.address          ?? null;
    if (data.emergencyContact !== undefined) upd.emergencyContact = data.emergencyContact ?? null;
    if (data.emergencyPhone   !== undefined) upd.emergencyPhone   = data.emergencyPhone   ?? null;
    if (data.instagram        !== undefined) upd.instagram        = data.instagram        ?? null;
    if (data.nivelExperiencia !== undefined) upd.nivelExperiencia = data.nivelExperiencia ?? null;
    if (data.estadoCivil      !== undefined) upd.estadoCivil      = data.estadoCivil      ?? null;
    // Campos de data: string → Date object
    if (data.birthDate !== undefined) upd.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    if (data.startDate !== undefined) upd.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate   !== undefined) upd.endDate   = data.endDate   ? new Date(data.endDate)   : null;

    const result = await prisma.collaborator.updateMany({
      where: { id: params.id, companyId: u.companyId },
      data:  upd,
    });
    if (result.count === 0)
      return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.name === 'ZodError')
      return NextResponse.json({ error: 'Dados inválidos: ' + err.errors.map((e: any) => e.message).join(', ') }, { status: 400 });
    console.error('[collaborators PUT]', err?.message, err?.code);
    return NextResponse.json({ error: 'Erro interno: ' + (err?.message ?? '') }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role))
    return NextResponse.json({ error: 'Somente OWNER/ADMIN podem remover colaboradores.' }, { status: 403 });

  await prisma.collaboratorAllocation.deleteMany({ where: { collaboratorId: params.id, companyId: u.companyId } });
  const result = await prisma.collaborator.deleteMany({ where: { id: params.id, companyId: u.companyId } });
  if (result.count === 0)
    return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
