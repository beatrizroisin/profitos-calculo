import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId    = process.env.CONTAAZUL_CLIENT_ID!;
  const redirectUri = process.env.CONTAAZUL_REDIRECT_URI!;

  const params = new URLSearchParams({
    redirect_uri:  redirectUri,
    client_id:     clientId,
    scope:         'sales',
    state:         'profitos',
  });

  // URL correta sem /v2
  const authUrl = `https://api.contaazul.com/auth/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}