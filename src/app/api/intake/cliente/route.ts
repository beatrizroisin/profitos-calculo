import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  companySlug: z.string().min(2),
  razaoSocial: z.string().min(2),
  cnpj: z.string().min(14),
  endereco: z.string().min(5),
  repNome: z.string().min(2),
  repRG: z.string().min(5),
  repCPF: z.string().min(11),
  repEstadoCivil: z.string().min(2),
  repEmail: z.string().email(),
  testNome: z.string().min(2),
  testCPF: z.string().min(11),
  testEmail: z.string().email(),
  finNome: z.string().min(2),
  finEmail: z.string().email(),
  finTelefone: z.string().min(10),
  projNome: z.string().min(2),
  projEmail: z.string().email(),
  projTelefone: z.string().min(10),
  formaPagamento: z.string(),
  diaVencimento: z.string(),
  regimeTributario: z.string(),
  tipoProjeto: z.string(),
  servicosContratados: z.string(),
  quantidadePagamentos: z.string(),
  valorMensal: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    
    const company = await prisma.company.findUnique({ where: { slug: data.companySlug } });
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });

    // Lógica do Número de Rastreio (Contrato Sequencial)
    const count = await prisma.client.count({ where: { companyId: company.id } });
    const nextNumber = (count + 1).toString().padStart(2, '0');
    const contractTag = `#${nextNumber}`;

    const notes = `
📄 CONTRATO: ${contractTag}
📍 ENDEREÇO: ${data.endereco}
👤 REPRESENTANTE: ${data.repNome} | CPF: ${data.repCPF} | RG: ${data.repRG} | ${data.repEstadoCivil}
✍️ TESTEMUNHA: ${data.testNome} | CPF: ${data.testCPF}
💰 FINANCEIRO: ${data.finNome} | Tel: ${data.finTelefone} | Email: ${data.finEmail}
🚀 PROJETO: ${data.projNome} | Tel: ${data.projTelefone}
🏛️ REGIME: ${data.regimeTributario} | TIPO: ${data.tipoProjeto}
🛠️ SERVIÇOS: ${data.servicosContratados}
🔢 PARCELAS: ${data.quantidadePagamentos}x de R$ ${data.valorMensal.toFixed(2)}
📋 ORIGEM: Formulário v4.2 (Rastreio Automático)`.trim();

    const client = await prisma.client.create({
      data: {
        companyId: company.id,
        name: `${contractTag} - ${data.razaoSocial}`, // Salva como "#01 - Empresa Exemplo"
        document: data.cnpj,
        email: data.repEmail,
        phone: data.finTelefone,
        serviceType: 'OTHER',
        grossRevenue: data.valorMensal,
        taxRate: 6,
        netRevenue: data.valorMensal * 0.94,
        isRecurring: true,
        totalInstallments: parseInt(data.quantidadePagamentos) || 12,
        currentInstallment: 1,
        startDate: new Date(),
        dueDay: parseInt(data.diaVencimento),
        status: 'PROSPECT',
        riskLevel: 'LOW',
        notes,
      },
    });

    return NextResponse.json({ success: true, trackingNumber: contractTag }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: 'Erro ao processar contrato.' }, { status: 500 });
  }
}