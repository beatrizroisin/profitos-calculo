import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://api-v2.contaazul.com';

async function getValidToken(companyId: string): Promise<string | null> {
  const config = await prisma.contaAzulConfig.findUnique({ where: { companyId } });
  if (!config || !config.isActive) return null;

  if (config.expiresAt > new Date()) return config.accessToken;

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

    if (!res.ok) {
      console.error('[contaazul token] refresh failed:', res.status, await res.text());
      return null;
    }

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

    console.log('[contaazul token] refreshed successfully');
    return tokens.access_token;
  } catch (e: any) {
    console.error('[contaazul token] refresh error:', e?.message);
    return null;
  }
}

async function fetchBillsForMonth(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const params = new URLSearchParams({
    data_vencimento_de:  startDate,
    data_vencimento_ate: endDate,
    pagina:              '0',
    quantidade:          '200',
  });

  const url = `${BASE_URL}/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar?${params}`;
  console.log('[contaazul sync] GET', url);

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  console.log('[contaazul sync] status:', res.status);
  const text = await res.text();
  console.log('[contaazul sync] response:', text.slice(0, 500));

  if (!res.ok) {
    console.error('[contaazul sync] fetchBills error:', res.status, text);
    return [];
  }

  try {
    const data = JSON.parse(text);
    console.log('[contaazul sync] total:', data.itens_totais, 'itens:', data.itens?.length);
    if (Array.isArray(data))  return data;
    if (data.itens)           return data.itens;
    if (data.content)         return data.content;
    if (data.items)           return data.items;
    if (data.data)            return data.data;
    return [];
  } catch (e) {
    console.error('[contaazul sync] parse error:', e);
    return [];
  }
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
    console.log('[contaazul sync] token preview:', accessToken?.slice(0, 50));

    if (!accessToken) {
      return NextResponse.json({ error: 'Conta Azul não conectada ou token expirado.' }, { status: 400 });
    }

    const now    = new Date();
    const synced: string[] = [];

    for (let offset = -3; offset <= 1; offset++) {
      const d        = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const year     = d.getFullYear();
      const month    = d.getMonth();
      const start    = new Date(year, month, 1).toISOString().slice(0, 10);
      const end      = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const monthRef = `${year}-${String(month + 1).padStart(2, '0')}`;

      const bills = await fetchBillsForMonth(accessToken, start, end);

      for (const bill of bills) {
        const amount      = parseFloat(bill.total ?? 0);
        const amountPaid  = parseFloat(bill.pago ?? 0);
        const dueDate     = new Date(bill.data_vencimento);

        const rawStatus = (bill.status ?? '').toUpperCase();
        const status    =
          rawStatus === 'ACQUITTED' ? 'PAID'
          : rawStatus === 'OVERDUE'   ? 'OVERDUE'
          : rawStatus === 'CANCELLED' ? 'CANCELLED'
          : 'PENDING';

        const externalId   = String(bill.id);
        const description  = bill.descricao ?? 'Sem descrição';
        const categoryName = bill.categorias?.[0]?.nome ?? null;
        const supplierName = bill.fornecedor?.nome ?? null;

        await prisma.contaAzulBill.upsert({
          where:  { companyId_externalId: { companyId, externalId } },
          update: {
            description,
            amount,
            amountPaid,
            dueDate,
            paymentDate:  null,
            status,
            categoryName,
            supplierName,
            notes:        null,
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
            paymentDate:  null,
            status,
            isRecurring:  false,
            categoryName,
            supplierName,
            notes:        null,
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