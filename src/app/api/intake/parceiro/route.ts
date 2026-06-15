import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { companySlug, name, email, phone, document, pixKey, bankName, bankAgency, bankAccount, paymentDay, notes } = await req.json();

    if (!companySlug || !name) return NextResponse.json({ error: 'Dados obrigatórios faltando.' }, { status: 400 });

    const company = await prisma.company.findUnique({ where: { slug: companySlug } });
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });

    await prisma.partner.create({
      data: {
        companyId:   company.id,
        name,
        email:       email       || null,
        phone:       phone       || null,
        document:    document    || null,
        pixKey:      pixKey      || null,
        bankName:    bankName    || null,
        bankAgency:  bankAgency  || null,
        bankAccount: bankAccount || null,
        paymentDay:  paymentDay  ? parseInt(paymentDay) : null,
        notes:       notes       || null,
        isActive:    false,
      },
    });

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to: 'beatriz.roisin@almahcomunicacao.com.br',
          subject: `🤝 Novo parceiro cadastrado: ${name}`,
          html: `<p>Um novo parceiro preencheu o formulário:</p><p><strong>${name}</strong> — ${email}</p><p>Acesse o profitOS para revisar e ativar em /parceiros.</p>`,
        });
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[intake/parceiro]', err);
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 });
  }
}