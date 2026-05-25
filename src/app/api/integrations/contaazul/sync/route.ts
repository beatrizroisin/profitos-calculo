import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getValidToken(companyId: string): Promise<string | null> {
  const config = await prisma.contaAzulConfig.findUnique({ where: { companyId } });
  if (!config || !config.isActive) return null;

  // Ainda válido
  if (config.expiresAt > new Date()) return config.accessToken;

  // Renova token
  try {
    const clientId     = process.env.CONTAAZUL_CLIENT_ID!;
    const clientSecret = process.env.CONTAAZUL_CLIENT_SECRET!;
    const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch('https://api.contaazul.com/auth/oauth/v2/token', {
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
      where:  { companyId },
      data:   { accessToken: tokens.access_token, refreshToken: tokens.refresh_token || config.refreshToken, expiresAt, updatedAt: new Date() },
    });

    return tokens.access_token;
  } catch {
    return null;
  }
}

async function fetchBills(accessToken: string, startDate: string, endDate: string): Promise<any[]> {
  const params = new URLSearchParams({
    emission_start: startDate,
    emission_end:   endDate,
    page_size:      '200',
    page_token:     '0',
  });

  const res = await fetch(`https://api.contaazul.com/v1/payables?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
    },
  });

  if (!res.ok) {
    console.error('[contaazul sync] fetchBills error:', res.status, await res.text());
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : (data.items || data.data || []);
}

export async function POST(req: NextRequest) {
  // Aceita chamada autenticada (usuário) ou interna (cron)
  let companyId: string;

  const body = await req.json().catch(() => ({}));

  if (body.companyId) {
    // Chamada interna do cron ou callback
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

    const now   = new Date();
    // Busca 3 meses anteriores + mês atual + 1 mês futuro
    const synced: string[] = [];

    for (let offset = -3; offset <= 1; offset++) {
      const d         = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const year      = d.getFullYear();
      const month     = d.getMonth();
      const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
      const endDate   = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const monthRef  = `${year}-${String(month + 1).padStart(2, '0')}`;

      const bills = await fetchBills(accessToken, startDate, endDate);

      for (const bill of bills) {
        const amount    = parseFloat(bill.value || bill.amount || 0);
        const amountPaid = bill.payment?.value ? parseFloat(bill.payment.value) : null;
        const dueDate   = new Date(bill.due_date || bill.dueDate || startDate);
        const payDate   = bill.payment?.date ? new Date(bill.payment.date) : null;

        const status = bill.status === 'PAID' || bill.status === 'LIQUIDADO' ? 'PAID'
          : bill.status === 'OVERDUE' || bill.status === 'VENCIDO' ? 'OVERDUE'
          : bill.status === 'CANCELLED' || bill.status === 'CANCELADO' ? 'CANCELLED'
          : 'PENDING';

        await prisma.contaAzulBill.upsert({
          where:  { companyId_externalId: { companyId, externalId: String(bill.id) } },
          update: {
            description:  bill.description || bill.name || 'Sem descrição',
            amount,
            amountPaid,
            dueDate,
            paymentDate:  payDate,
            status,
            categoryName: bill.category?.name || null,
            supplierName: bill.supplier?.name || bill.contact?.name || null,
            notes:        bill.notes || null,
            monthRef,
            updatedAt:    new Date(),
          },
          create: {
            companyId,
            externalId:   String(bill.id),
            description:  bill.description || bill.name || 'Sem descrição',
            amount,
            amountPaid,
            dueDate,
            paymentDate:  payDate,
            status,
            isRecurring:  bill.recurrence ? true : false,
            categoryName: bill.category?.name || null,
            supplierName: bill.supplier?.name || bill.contact?.name || null,
            notes:        bill.notes || null,
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