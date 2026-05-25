import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // Verifica token do Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca todas as empresas com Conta Azul conectado
    const configs = await prisma.contaAzulConfig.findMany({
      where: { isActive: true },
      select: { companyId: true },
    });

    const results = [];

    for (const config of configs) {
      try {
        const res = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/contaazul/sync`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ companyId: config.companyId }),
        });
        const data = await res.json();
        results.push({ companyId: config.companyId, ...data });
      } catch (err: any) {
        results.push({ companyId: config.companyId, error: err?.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('[cron contaazul]', err?.message);
    return NextResponse.json({ error: 'Erro no cron.' }, { status: 500 });
  }
}