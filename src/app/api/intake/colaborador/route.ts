import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  companySlug: z.string().min(2),
  razaoSocial: z.string().min(2),
  cnpj: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  representanteLegal: z.string().optional().nullable(),
  testemunha: z.string().optional().nullable(),
  emailRepresentante: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  cpfRepresentante: z.string().optional().nullable(),
  formaPagamento: z.string().optional().nullable(),
  diaVencimento: z.string().optional().nullable(),
  responsavelFinanceiro: z.string().optional().nullable(),
  responsavelProjeto: z.string().optional().nullable(),
  regimeTributario: z.string().optional().nullable(),
  tipoProjeto: z.string().optional().nullable(),
  servicosContratados: z.string().optional().nullable(),
  quantidadePagamentos: z.string().optional().nullable(),
  valorMensal: z.number().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const data = schema.parse(rawBody);

    const company = await prisma.company.findFirst({
      where: {
        slug: {
          equals: data.companySlug.trim(),
          mode: 'insensitive',
        },
      },
    });

    let targetCompany = company;

    if (!targetCompany) {
      const fallbackSlug = data.companySlug.trim().replace(/\s+/g, '-');
      targetCompany = await prisma.company.findFirst({
        where: {
          slug: {
            equals: fallbackSlug,
            mode: 'insensitive',
          },
        },
      });
    }

    if (!targetCompany) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }

    const dueDay = parseInt(data.diaVencimento ?? '5') || 5;
    const installments = parseInt(data.quantidadePagamentos ?? '12') || 12;
    const revenue = data.valorMensal ?? 0;

    const notes = [
      data.endereco && `Endereço: ${data.endereco}`,
      data.representanteLegal && `Rep. Legal: ${data.representanteLegal}`,
      data.cpfRepresentante && `CPF Rep.: ${data.cpfRepresentante}`,
      data.testemunha && `Testemunha: ${data.testemunha}`,
      data.formaPagamento && `Forma pgto: ${data.formaPagamento}`,
      data.responsavelFinanceiro && `Resp. Financeiro: ${data.responsavelFinanceiro}`,
      data.responsavelProjeto && `Resp. Projeto: ${data.responsavelProjeto}`,
      data.regimeTributario && `Regime: ${data.regimeTributario}`,
      data.tipoProjeto && `Tipo projeto: ${data.tipoProjeto}`,
      data.servicosContratados && `Serviços: ${data.servicosContratados}`,
      data.quantidadePagamentos && `Qtd. pagamentos: ${data.quantidadePagamentos}`,
      'Cadastro via formulário externo.',
    ].filter(Boolean).join('\n');

    const client = await prisma.client.create({
      data: {
        companyId: targetCompany.id,
        name: data.razaoSocial,
        document: data.cnpj ?? null,
        email: data.emailRepresentante ?? null,
        serviceType: 'OTHER' as any, // Garanta que 'OTHER' existe no seu Enum do Prisma
        grossRevenue: revenue,
        taxRate: 6,
        netRevenue: revenue * 0.94,
        isRecurring: true,
        totalInstallments: installments,
        currentInstallment: 1,
        startDate: new Date(),
        dueDay: dueDay,
        status: 'PROSPECT',
        riskLevel: 'LOW',
        notes: notes,
      },
    });

    return NextResponse.json({ success: true, id: client.id }, { status: 201 });

  } catch (err: any) {
    console.error('[API_ERROR]:', err); // Isso aparecerá nos logs da Vercel
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos.', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno.', message: err.message }, { status: 500 });
  }
}