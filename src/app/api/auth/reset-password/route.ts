import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: 'Token ou senha inválidos.' }, { status: 400 });
    }

    // Find valid token
    const vt = await prisma.verificationToken.findFirst({
      where: { token, expires: { gt: new Date() } },
    });
    if (!vt) return NextResponse.json({ error: 'Link expirado ou inválido. Solicite um novo.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: vt.identifier } });
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    // Consume token
    await prisma.verificationToken.delete({ where: { identifier_token: { identifier: vt.identifier, token } } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
