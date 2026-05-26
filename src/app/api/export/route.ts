// src/app/api/export/route.ts — v3.9
// GET /api/export?type=clients|collaborators
// Retorna CSV UTF-8 com BOM (abre corretamente no Excel)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function d(v: any): string {
  if (!v) return '';
  try { return new Date(v).toLocaleDateString('pt-BR'); } catch { return ''; }
}
function brl(v: number | null | undefined): string {
  if (v == null) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function csv(headers: string[], rows: string[][]): string {
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\uFEFF' + [headers.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))].join('\r\n');
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  const type  = new URL(req.url).searchParams.get('type') || 'clients';
  const today = new Date().toISOString().slice(0, 10);

  // ── CLIENTES ────────────────────────────────────────────────────────────────
  if (type === 'clients') {
    const rows = await prisma.client.findMany({
      where: { companyId: u.companyId },
      orderBy: { name: 'asc' },
    });
    const headers = [
      'Nome / Razão Social','CNPJ/CPF','E-mail','Telefone',
      'Tipo de Serviço','Status','Receita Bruta/mês','Imposto %',
      'Receita Líquida/mês','Tipo Contrato','Parcelas','Parcela Atual',
      'Data Início','Dia Vencimento','Nível de Risco','Observações',
    ];
    const data = rows.map(c => [
      c.name, (c as any).document ?? '', (c as any).email ?? '', (c as any).phone ?? '',
      (c as any).serviceType ?? '', (c as any).status ?? '',
      brl(c.grossRevenue), String(c.taxRate ?? 0) + '%', brl(c.netRevenue),
      (c as any).isRecurring ? 'Recorrente' : 'Pontual',
      String((c as any).totalInstallments ?? ''), String((c as any).currentInstallment ?? ''),
      d((c as any).startDate), String((c as any).dueDay ?? ''),
      (c as any).riskLevel ?? '', c.notes ?? '',
    ]);
    return new NextResponse(csv(headers, data), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clientes-${today}.csv"`,
      },
    });
  }

  // ── COLABORADORES ───────────────────────────────────────────────────────────
  if (type === 'collaborators') {
    const rows = await prisma.collaborator.findMany({
      where: { companyId: u.companyId },
      orderBy: { name: 'asc' },
    });
    const headers = [
      'Nome Completo','Razão Social','CPF','RG','CNPJ',
      'Cargo / Função','Tipo Vínculo','Honorário Mensal',
      'Horas/Mês','Ativo','Data Entrada','Data Saída',
      'E-mail','Telefone / WhatsApp','Data Nascimento','Estado Civil',
      'Instagram','Nível Experiência','Endereço',
      'Contato Emergência','Telefone Emergência',
      'Método Pagamento','Dia Pagamento','Chave PIX',
      'Banco','Agência','Conta','Tipo Conta','Observações',
    ];
    const data = rows.map(c => [
      c.name,               (c as any).razaoSocial ?? '',    (c as any).document ?? '',
      (c as any).rg ?? '',  (c as any).cnpj ?? '',
      c.position,           c.type,                          brl(c.salary),
      String(c.hoursPerMonth), c.isActive ? 'Sim' : 'Não',
      d((c as any).startDate), d((c as any).endDate),
      (c as any).email ?? '', (c as any).phone ?? '',
      d((c as any).birthDate), (c as any).estadoCivil ?? '',
      (c as any).instagram ?? '', (c as any).nivelExperiencia ?? '',
      (c as any).address ?? '',
      (c as any).emergencyContact ?? '', (c as any).emergencyPhone ?? '',
      (c as any).paymentMethod ?? '', String((c as any).paymentDay ?? ''),
      (c as any).pixKey ?? '',
      (c as any).bankName ?? '', (c as any).bankAgency ?? '',
      (c as any).bankAccount ?? '', (c as any).bankAccountType ?? '',
      c.notes ?? '',
    ]);
    return new NextResponse(csv(headers, data), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="colaboradores-${today}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: 'type deve ser clients ou collaborators' }, { status: 400 });
}
