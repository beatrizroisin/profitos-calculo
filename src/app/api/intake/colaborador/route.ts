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

    // Envia email de notificação
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to: 'beatriz.roisin@almahcomunicacao.com.br',
          subject: `Formulário preenchido — ${data.name} — ${new Date().toLocaleDateString('pt-BR')}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
              <div style="background:#1A6B4A;padding:20px 24px;border-radius:12px 12px 0 0">
                <h1 style="color:white;margin:0;font-size:20px">📋 Nova Ficha Cadastral Recebida</h1>
                <p style="color:#a7f3d0;margin:4px 0 0;font-size:13px">profitOS — Formulário de Colaborador</p>
              </div>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
                <p style="font-size:15px;color:#111;margin:0 0 16px">
                  <strong>${data.name}</strong> preencheu e enviou a ficha cadastral em 
                  <strong>${new Date().toLocaleString('pt-BR')}</strong>.
                </p>
                <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
                  <tr><td style="padding:6px 0;color:#6b7280;width:40%">Nome</td><td style="padding:6px 0;font-weight:600">${data.name}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">E-mail</td><td style="padding:6px 0">${data.email}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Telefone</td><td style="padding:6px 0">${data.phone}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Cargo / Serviço</td><td style="padding:6px 0">${data.position}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Razão Social</td><td style="padding:6px 0">${data.razaoSocial || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">CNPJ</td><td style="padding:6px 0">${data.cnpj || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">CPF</td><td style="padding:6px 0">${data.document || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">RG</td><td style="padding:6px 0">${data.rg || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Data de nascimento</td><td style="padding:6px 0">${data.birthDate ? new Date(data.birthDate).toLocaleDateString('pt-BR') : '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Estado civil</td><td style="padding:6px 0">${data.estadoCivil || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Instagram</td><td style="padding:6px 0">${data.instagram || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Nível de experiência</td><td style="padding:6px 0">${data.nivelExperiencia || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Valor negociado</td><td style="padding:6px 0">${data.salary ? `R$ ${data.salary.toFixed(2)}` : '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Data de entrada</td><td style="padding:6px 0">${data.startDate ? new Date(data.startDate).toLocaleDateString('pt-BR') : '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Chave PIX</td><td style="padding:6px 0">${data.pixKey || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Dados bancários</td><td style="padding:6px 0">${data.bankData || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Endereço</td><td style="padding:6px 0">${data.address || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Observações</td><td style="padding:6px 0">${data.notes || '—'}</td></tr>
                </table>
                <p style="font-size:11px;color:#9ca3af;margin-top:24px;text-align:center">
                  Gerado automaticamente pelo profitOS · ${new Date().toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('[email] Falha ao enviar notificação de colaborador:', emailErr);
      }
    }

    return NextResponse.json({ success: true, id: colab.id }, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError')
      return NextResponse.json({ error: 'Dados inválidos.', details: err.errors }, { status: 400 });
    console.error('[intake/colaborador]', err?.message);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}