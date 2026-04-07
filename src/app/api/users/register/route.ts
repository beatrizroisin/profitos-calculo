import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const schema = z.object({
  companyName:       z.string().min(2).max(100),
  name:              z.string().min(2).max(100),
  email:             z.string().email(),
  password:          z.string().min(8).optional(),
  googleOnboarding:  z.boolean().optional(), // no password needed
});

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, name, email, password, googleOnboarding } = schema.parse(body);

    if (!googleOnboarding && !password) {
      return NextResponse.json({ error: 'Senha obrigatória para registro por e-mail.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && !googleOnboarding) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 });
    }

    let slug = slugify(companyName);
    const slugExists = await prisma.company.findUnique({ where: { slug } });
    if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;

    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName, slug, plan: 'FREE',
          settings: { create: { defaultTaxRate: 6.0, defaultMargin: 50.0, hoursPerMonth: 160, timezone: 'America/Sao_Paulo' } },
        },
      });

      let user;
      if (googleOnboarding && existing) {
        // Link existing Google user to the new company
        user = await tx.user.update({
          where: { id: existing.id },
          data: { companyId: company.id, role: 'OWNER' },
        });
      } else {
        user = await tx.user.create({
          data: { companyId: company.id, name, email, passwordHash, role: 'OWNER' },
        });
      }

      // Seed default categories
      const cats = [
        { name:'Remuneração PJ', type:'EXPENSE' as const }, { name:'Licença de software', type:'EXPENSE' as const },
        { name:'Salários CLT', type:'EXPENSE' as const }, { name:'Impostos', type:'EXPENSE' as const },
        { name:'Telefonia e Internet', type:'EXPENSE' as const }, { name:'Honorários Contábeis', type:'EXPENSE' as const },
        { name:'Marketing e Eventos', type:'EXPENSE' as const }, { name:'Outros custos', type:'EXPENSE' as const },
        { name:'Receita de Serviços', type:'INCOME' as const }, { name:'Receita Pontual', type:'INCOME' as const },
      ];
      await tx.category.createMany({ data: cats.map(c => ({ companyId: company.id, ...c, isDefault: true })) });

      return { company, user };
    });

    return NextResponse.json({ success: true, companyId: result.company.id, userId: result.user.id }, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError') return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
