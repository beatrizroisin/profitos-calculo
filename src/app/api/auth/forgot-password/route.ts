import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    
    // Retornamos sucesso mesmo se o usuário não existir para evitar "email enumeration"
    if (!user || !user.passwordHash) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Agora o prisma.verificationToken vai funcionar!
    await prisma.verificationToken.upsert({
      where: { 
        identifier_token: { 
          identifier: email, 
          token: token 
        } 
      },
      update: {
        token: token,
        expires: expiresAt
      },
      create: { 
        identifier: email, 
        token: token, 
        expires: expiresAt 
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@profitos.app',
        to: email,
        subject: 'Redefinir sua senha — profitOS',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <h2 style="color:#111">Redefinição de senha</h2>
            <p>Clique no botão abaixo para criar uma nova senha. O link expira em 1 hora.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#1A6B4A;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500">Redefinir senha</a>
          </div>
        `,
      });
    } else {
      console.log(`[DEV] Password reset link: ${resetUrl}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}