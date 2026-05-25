import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId    = process.env.CONTAAZUL_CLIENT_ID!;
  const redirectUri = process.env.CONTAAZUL_REDIRECT_URI!;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    redirect_uri:  redirectUri,
    state:         'profitos',
    scope:         'openid profile aws.cognito.signin.user.admin',
  });

  const authUrl = `https://auth.contaazul.com/login?${params}`;
  return NextResponse.redirect(authUrl);
}