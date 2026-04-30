// src/app/api/intake/cliente/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  companySlug:          z.string().min(2),
  razaoSocial:          z.string().min(2),
  cnpj:                 z.string().optional().nullable(),
  aniversario:          z.string().optional().nullable(),
  endCep:               z.string().optional().nullable(),
  endRua:               z.string().optional().nullable(),
  endNumero:            z.string().optional().nullable(),
  endBairro:            z.string().optional().nullable(),
  endCidade:            z.string().optional().nullable(),
  endEstado:            z.string().optional().nullable(),
  repNome:              z.string().min(2),
  repRG:                z.string().optional().nullable(),
  repCPF:               z.string().optional().nullable(),
  repEstadoCivil:       z.string().optional().nullable(),
  repEmail:             z.string().email(),
  testNome:             z.string().optional().nullable(),
  testCPF:              z.string().optional().nullable(),
  testEmail:            z.string().optional().nullable(),
  finNome:              z.string().optional().nullable(),
  finEmail:             z.string().optional().nullable(),
  finTelefone:          z.string().optional().nullable(),
  projNome:             z.string().optional().nullable(),
  projEmail:            z.string().optional().nullable(),
  projTelefone:         z.string().optional().nullable(),
  formaPagamento:       z.string().optional().nullable(),
  diaVencimento:        z.string().optional().nullable(),
  regimeTributario:     z.string().optional().nullable(),
  tipoProjeto:          z.string().optional().nullable(),
  servicosContratados:  z.string().optional().nullable(),
  quantidadePagamentos: z.string().optional().nullable(),
  valorMensal:          z.number().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const company = await prisma.company.findUnique({ where: { slug: data.companySlug } });
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });

    const count = await prisma.client.count({ where: { companyId: company.id } });
    const contractTag = (count + 50).toString().padStart(3, '0');

    const endereco = [data.endRua, data.endNumero, data.endBairro, data.endCidade, data.endEstado, data.endCep]
      .filter(Boolean).join(', ');

    const notes = [
      `📄 Contrato: ${contractTag}`,
      endereco                  && `📍 Endereço: ${endereco}`,
      data.aniversario          && `🎂 Aniversário: ${data.aniversario}`,
      data.repNome              && `👤 Rep. Legal: ${data.repNome}`,
      data.repRG                && `🪪 RG: ${data.repRG}`,
      data.repCPF               && `🪪 CPF: ${data.repCPF}`,
      data.repEstadoCivil       && `💍 Estado Civil: ${data.repEstadoCivil}`,
      data.testNome             && `✍️ Testemunha: ${data.testNome} | CPF: ${data.testCPF} | Email: ${data.testEmail}`,
      data.finNome              && `💰 Resp. Financeiro: ${data.finNome} | ${data.finEmail} | ${data.finTelefone}`,
      data.projNome             && `🚀 Resp. Projeto: ${data.projNome} | ${data.projEmail} | ${data.projTelefone}`,
      data.formaPagamento       && `💳 Forma pgto: ${data.formaPagamento}`,
      data.regimeTributario     && `🏛️ Regime: ${data.regimeTributario}`,
      data.tipoProjeto          && `📦 Tipo projeto: ${data.tipoProjeto}`,
      data.servicosContratados  && `🛠️ Serviços: ${data.servicosContratados}`,
      data.quantidadePagamentos && `🔢 Parcelas: ${data.quantidadePagamentos}x de R$ ${(data.valorMensal ?? 0).toFixed(2)}`,
      `📋 Origem: Formulário externo de minuta contratual`,
    ].filter(Boolean).join('\n');

    const client = await prisma.client.create({
      data: {
        companyId:           company.id,
        name:                data.razaoSocial,
        document:            data.cnpj              ?? null,
        email:               data.repEmail,
        phone:               data.finTelefone        ?? null,
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
        serviceType:         'OTHER',
        grossRevenue:        data.valorMensal        ?? 0,
        taxRate:             6,
        netRevenue:          (data.valorMensal       ?? 0) * 0.94,
        isRecurring:         true,
        totalInstallments:   parseInt(data.quantidadePagamentos ?? '12') || 12,
        currentInstallment:  1,
        startDate:           new Date(),
        dueDay:              parseInt(data.diaVencimento ?? '5') || 5,
        status:              'PROSPECT',
        riskLevel:           'LOW',
        notes,
      },
    });

    const clientWithOrder = await prisma.client.findUnique({
      where: { id: client.id },
      select: { orderId: true },
    });

    // Disparo de email
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to: 'beatriz.roisin@almahcomunicacao.com.br',
          subject: `Formulário preenchido — ${data.razaoSocial} — ${new Date().toLocaleDateString('pt-BR')}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
              <div style="background:#1A6B4A;padding:20px 24px;border-radius:12px 12px 0 0">
                <h1 style="color:white;margin:0;font-size:20px">📋 Nova Minuta Contratual Recebida</h1>
                <p style="color:#a7f3d0;margin:4px 0 0;font-size:13px">profitOS — Formulário de Cliente</p>
              </div>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
                <p style="font-size:15px;color:#111;margin:0 0 16px">
                  <strong>${data.razaoSocial}</strong> preencheu e enviou a minuta contratual em
                  <strong>${new Date().toLocaleString('pt-BR')}</strong>.
                </p>
                <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
                  <tr><td style="padding:6px 0;color:#6b7280;width:40%">Nº Contrato</td><td style="padding:6px 0;font-weight:600">${String(clientWithOrder?.orderId ?? 0).padStart(3, '0')}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Razão Social</td><td style="padding:6px 0;font-weight:600">${data.razaoSocial}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">CNPJ</td><td style="padding:6px 0">${data.cnpj || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Endereço</td><td style="padding:6px 0">${endereco || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Aniversário Rep.</td><td style="padding:6px 0">${data.aniversario ? new Date(data.aniversario + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Rep. Legal</td><td style="padding:6px 0">${data.repNome || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">RG</td><td style="padding:6px 0">${data.repRG || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">CPF</td><td style="padding:6px 0">${data.repCPF || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Estado Civil</td><td style="padding:6px 0">${data.repEstadoCivil || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">E-mail Rep.</td><td style="padding:6px 0">${data.repEmail || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Testemunha</td><td style="padding:6px 0">${data.testNome || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">CPF Testemunha</td><td style="padding:6px 0">${data.testCPF || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">E-mail Testemunha</td><td style="padding:6px 0">${data.testEmail || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Resp. Financeiro</td><td style="padding:6px 0">${data.finNome || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">E-mail Financeiro</td><td style="padding:6px 0">${data.finEmail || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Tel. Financeiro</td><td style="padding:6px 0">${data.finTelefone || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Resp. Projeto</td><td style="padding:6px 0">${data.projNome || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">E-mail Projeto</td><td style="padding:6px 0">${data.projEmail || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Tel. Projeto</td><td style="padding:6px 0">${data.projTelefone || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Forma de Pgto</td><td style="padding:6px 0">${data.formaPagamento || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Dia Vencimento</td><td style="padding:6px 0">${data.diaVencimento ? `Dia ${data.diaVencimento}` : '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Regime Tributário</td><td style="padding:6px 0">${data.regimeTributario || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Tipo de Projeto</td><td style="padding:6px 0">${data.tipoProjeto || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Parcelas</td><td style="padding:6px 0">${data.quantidadePagamentos ? `${data.quantidadePagamentos}x de R$ ${(data.valorMensal ?? 0).toFixed(2)}` : '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Serviços</td><td style="padding:6px 0">${data.servicosContratados || '—'}</td></tr>
                </table>
                <p style="font-size:11px;color:#9ca3af;margin-top:24px;text-align:center">
                  Gerado automaticamente pelo profitOS · ${new Date().toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('[email] Falha ao enviar notificação de cliente:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      trackingNumber: String(clientWithOrder?.orderId ?? 0).padStart(3, '0'),
      id: client.id,
    }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'Dados inválidos.', details: err.errors }, { status: 400 });
    console.error('[intake/cliente]', err?.message);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}