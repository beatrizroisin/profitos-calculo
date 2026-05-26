// src/app/api/intake/colaborador/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  companySlug:      z.string().min(2),
  name:             z.string().min(2),
  razaoSocial:      z.string().optional().nullable(),
  cnpj:             z.string().optional().nullable(),
  document:         z.string().optional().nullable(),
  rg:               z.string().optional().nullable(),
  email:            z.string().email(),
  phone:            z.string().min(1),
  position:         z.string().min(1),
  birthDate:        z.string().optional().nullable(),
  estadoCivil:      z.string().optional().nullable(),
  instagram:        z.string().optional().nullable(),
  nivelExperiencia: z.string().optional().nullable(),
  pixKey:           z.string().optional().nullable(),
  bankData:         z.string().optional().nullable(),
  salary:           z.number().optional().nullable(),
  startDate:        z.string().optional().nullable(),
  address:          z.string().optional().nullable(),
  notes:            z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json());
    const company = await prisma.company.findUnique({ where: { slug: data.companySlug } });
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });

    let bankName = '', bankAgency = '', bankAccount = '';
    if (data.bankData) {
      const parts = data.bankData.split(/[-\/|]/).map((p: string) => p.trim()).filter(Boolean);
      bankName    = parts[0] || data.bankData;
      bankAgency  = parts[1] || '';
      bankAccount = parts[2] || '';
    }

    const colab = await prisma.collaborator.create({
      data: {
        companyId:        company.id,
        name:             data.name,
        position:         data.position,
        type:             'PJ',
        salary:           data.salary ?? 0,
        hoursPerMonth:    160,
        isActive:         false,
        notes:            (data.notes ? data.notes + '\n' : '') + 'Cadastro via formulário externo.',
        document:         data.document         ?? null,
        rg:               data.rg               ?? null,
        email:            data.email,
        phone:            data.phone,
        razaoSocial:      data.razaoSocial       ?? null,
        cnpj:             data.cnpj              ?? null,
        pixKey:           data.pixKey            ?? null,
        bankName,
        bankAgency,
        bankAccount,
        birthDate:        data.birthDate         ? new Date(data.birthDate)  : null,
        startDate:        data.startDate         ? new Date(data.startDate)  : null,
        address:          data.address           ?? null,
        instagram:        data.instagram         ?? null,
        nivelExperiencia: data.nivelExperiencia  ?? null,
        estadoCivil:      data.estadoCivil       ?? null,
      },
    });

    return NextResponse.json({ success: true, id: colab.id }, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError')
      return NextResponse.json({ error: 'Dados inválidos.', details: err.errors }, { status: 400 });
    console.error('[intake/colaborador]', err?.message);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}