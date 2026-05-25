import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://api-v2.contaazul.com';

async function getValidToken(companyId: string): Promise<string | null> {
  const config = await prisma.contaAzulConfig.findUnique({ where: { companyId } });
  if (!config || !config.isActive) return null;

  if (config.expiresAt > new Date()) return config.accessToken;

  // Renova token
  try {
    const clientId     = process.env.CONTAAZUL_CLIENT_ID!;
    const clientSecret = process.env.CONTAAZUL_CLIENT_SECRET!;
    const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch('https://auth.contaazul.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: config.refreshToken,
      }),
    });

    if (!res.ok) return null;

    const tokens    = await res.json();
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    await prisma.contaAzulConfig.update({
      where: { companyId },
      data:  {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token || config.refreshToken,
        expiresAt,
        updatedAt:    new Date(),
      },
    });

    return tokens.access_token;
  } catch {
    return null;
  }
}

async function fetchBillsForMonth(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  // Endpoint correto conforme documentação
  const params = new URLSearchParams({
    data_vencimento_inicio: startDate,
    data_vencimento_fim:    endDate,
    page:  '0',
    size:  '200',
  });

  const res = await fetch(
    `${BASE_URL}/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
    }
  );

  if (!res.ok) {
    console.error('[contaazul sync] fetchBills error:', res.status, await res.text());
    return [];
  }

  const data = await res.json();
  // A API pode retornar array direto ou objeto com items/content
  if (Array.isArray(data)) return data;
  if (data.content) return data.content;
  if (data.items)   return data.items;
  return [];
}

export async function POST(req: NextRequest) {
  let companyId: string;

  const body = await req.json().catch(() => ({}));

  if (body.companyId) {
    companyId = body.companyId;
  } else {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    companyId = (session.user as any).companyId;
  }

  try {
    const accessToken = await getValidToken(companyId);
    if (!accessToken) {
      return NextResponse.json({ error: 'Conta Azul não conectada ou token expirado.' }, { status: 400 });
    }

    const now    = new Date();
    const synced: string[] = [];

    // Sincroniza 3 meses anteriores + atual + 1 futuro
    for (let offset = -3; offset <= 1; offset++) {
      const d       = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const year    = d.getFullYear();
      const month   = d.getMonth();
      const start   = new Date(year, month, 1).toISOString().slice(0, 10);
      const end     = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const monthRef = `${year}-${String(month + 1).padStart(2, '0')}`;

      const bills = await fetchBillsForMonth(accessToken, start, end);

      for (const bill of bills) {
        // Campos conforme API v2 do Conta Azul
        const amount     = parseFloat(bill.valor ?? bill.value ?? 0);
        const amountPaid = bill.valor_pago != null ? parseFloat(bill.valor_pago) : null;
        const dueDate    = new Date(bill.data_vencimento ?? bill.due_date ?? start);
        const payDate    = bill.data_pagamento ? new Date(bill.data_pagamento) : null;

        const rawStatus  = (bill.status ?? '').toUpperCase();
        const status     =
          rawStatus === 'PAGO'      || rawStatus === 'PAID'      ? 'PAID'
          : rawStatus === 'VENCIDO' || rawStatus === 'OVERDUE'   ? 'OVERDUE'
          : rawStatus === 'CANCELADO' || rawStatus === 'CANCELLED' ? 'CANCELLED'
          : 'PENDING';

        const externalId  = String(bill.id ?? bill.id_parcela ?? Math.random());
        const description = bill.descricao ?? bill.description ?? 'Sem descrição';

        await prisma.contaAzulBill.upsert({
          where:  { companyId_externalId: { companyId, externalId } },
          update: {
            description,
            amount,
            amountPaid,
            dueDate,
            paymentDate:  payDate,
            status,
            categoryName: bill.categoria?.nome ?? bill.category?.name ?? null,
            supplierName: bill.fornecedor?.nome ?? bill.supplier?.name ?? bill.pessoa?.nome ?? null,
            notes:        bill.observacao ?? bill.notes ?? null,
            monthRef,
            updatedAt:    new Date(),
          },
          create: {
            companyId,
            externalId,
            description,
            amount,
            amountPaid,
            dueDate,
            paymentDate:  payDate,
            status,
            isRecurring:  !!(bill.recorrencia ?? bill.recurrence),
            categoryName: bill.categoria?.nome ?? bill.category?.name ?? null,
            supplierName: bill.fornecedor?.nome ?? bill.supplier?.name ?? bill.pessoa?.nome ?? null,
            notes:        bill.observacao ?? bill.notes ?? null,
            monthRef,
          },
        });
      }

      synced.push(`${monthRef}: ${bills.length} contas`);
    }

    await prisma.contaAzulConfig.update({
      where: { companyId },
      data:  { lastSyncAt: new Date() },
    });

    return NextResponse.json({ success: true, synced });
  } catch (err: any) {
    console.error('[contaazul sync]', err?.message);
    return NextResponse.json({ error: 'Erro ao sincronizar.' }, { status: 500 });
  }
}