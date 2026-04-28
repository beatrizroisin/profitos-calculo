// src/app/api/intake/cliente/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  companySlug:          z.string().min(2),
  razaoSocial:          z.string().min(2),
  cnpj:                 z.string().optional().nullable(),
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
    const contractTag = (count + 1).toString().padStart(3, '0');

    const endereco = [data.endRua, data.endNumero, data.endBairro, data.endCidade, data.endEstado, data.endCep]
      .filter(Boolean).join(', ');

    const notes = [
      `📄 Contrato: ${contractTag}`,
      endereco                  && `📍 Endereço: ${endereco}`,
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

    return NextResponse.json({ success: true, trackingNumber: contractTag, id: client.id }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'Dados inválidos.', details: err.errors }, { status: 400 });
    console.error('[intake/cliente]', err?.message);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}