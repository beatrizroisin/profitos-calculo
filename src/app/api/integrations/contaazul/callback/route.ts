import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect('/login');
  const companyId = (session.user as any).companyId;

  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect('/configuracoes?error=no_code');

  try {
    const clientId     = process.env.CONTAAZUL_CLIENT_ID!;
    const clientSecret = process.env.CONTAAZUL_CLIENT_SECRET!;
    const redirectUri  = process.env.CONTAAZUL_REDIRECT_URI!;

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://api.contaazul.com/auth/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[contaazul callback] token error:', err);
      return NextResponse.redirect('/configuracoes?error=token_failed');
    }

    const tokens = await tokenRes.json();
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    await prisma.contaAzulConfig.upsert({
      where:  { companyId },
      update: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt, isActive: true, updatedAt: new Date() },
      create: { companyId, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt, isActive: true },
    });

    // Faz sync imediato após conectar
    await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/contaazul/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    });

    return NextResponse.redirect('/configuracoes?success=contaazul_connected');
  } catch (err: any) {
    console.error('[contaazul callback]', err?.message);
    return NextResponse.redirect('/configuracoes?error=callback_failed');
  }
}