// src/app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function buildClientEmail(client: any): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
      <div style="background:#1A6B4A;padding:20px 24px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:20px">✅ Cliente Ativado — profitOS</h1>
        <p style="color:#a7f3d0;margin:4px 0 0;font-size:13px">Ficha completa gerada automaticamente</p>
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">

        <h2 style="font-size:15px;color:#1A6B4A;margin:0 0 12px">📋 Identificação</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
          <tr><td style="padding:6px 0;color:#6b7280;width:40%">Razão Social</td><td style="padding:6px 0;font-weight:600">${client.name}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">CNPJ / CPF</td><td style="padding:6px 0">${client.document || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">E-mail</td><td style="padding:6px 0">${client.email || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Telefone</td><td style="padding:6px 0">${client.phone || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Status</td><td style="padding:6px 0"><span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">ATIVO</span></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Nível de risco</td><td style="padding:6px 0">${client.riskLevel}</td></tr>
        </table>

        <h2 style="font-size:15px;color:#1A6B4A;margin:0 0 12px">💰 Financeiro</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
          <tr><td style="padding:6px 0;color:#6b7280;width:40%">Faturamento bruto</td><td style="padding:6px 0;font-weight:600">R$ ${Number(client.grossRevenue).toLocaleString('pt-BR',{minimumFractionDigits:2})}/mês</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Alíquota imposto</td><td style="padding:6px 0">${client.taxRate}%</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Receita líquida</td><td style="padding:6px 0;font-weight:600;color:#1A6B4A">R$ ${Number(client.netRevenue).toLocaleString('pt-BR',{minimumFractionDigits:2})}/mês</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Tipo de contrato</td><td style="padding:6px 0">${client.isRecurring ? 'Recorrente (mensalidade)' : 'Pontual (projeto)'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Parcelas</td><td style="padding:6px 0">${client.currentInstallment}/${client.totalInstallments || '∞'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Dia de vencimento</td><td style="padding:6px 0">Dia ${client.dueDay}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Data de início</td><td style="padding:6px 0">${new Date(client.startDate).toLocaleDateString('pt-BR')}</td></tr>
        </table>

        ${client.notes ? `
        <h2 style="font-size:15px;color:#1A6B4A;margin:0 0 12px">📝 Observações / Dados Contratuais</h2>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:14px;font-size:12px;line-height:1.8;color:#374151;white-space:pre-line">${client.notes}</div>
        ` : ''}

        <p style="font-size:11px;color:#9ca3af;margin-top:24px;text-align:center">
          Gerado automaticamente pelo profitOS ao ativar o cliente · ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  `;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  try {
    const body = await req.json();

    // Busca o cliente ANTES de atualizar para saber o status anterior
    const existing = await prisma.client.findFirst({ where: { id: params.id, companyId } });
    if (!existing) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

    const netRevenue = body.grossRevenue * (1 - body.taxRate / 100);

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: { ...body, netRevenue, startDate: new Date(body.startDate), email: body.email || null },
    });

    // Dispara email se estava em PROSPECT/PIPELINE e foi ativado como ACTIVE
    const wasInactive = ['PROSPECT', 'PIPELINE', 'INACTIVE'].includes(existing.status);
    const nowActive   = body.status === 'ACTIVE';

    if (wasInactive && nowActive && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to: 'beatriz.roisin@almahcomunicacao.com.br',
          subject: `✅ Cliente ativado: ${updated.name} — profitOS`,
          html: buildClientEmail(updated),
        });
      } catch (emailErr) {
        // Email falhou mas não derruba o update
        console.error('[email] Falha ao enviar notificação de ativação:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[clients/id PUT]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const result = await prisma.client.deleteMany({ where: { id: params.id, companyId } });
  if (result.count === 0) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true });
}