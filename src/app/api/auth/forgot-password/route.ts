import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user || !user.passwordHash) {
      return NextResponse.json({ success: true });
    }

    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store in VerificationToken (created by NextAuth PrismaAdapter)
    await prisma.verificationToken.upsert({
      where: { identifier_token: { identifier: email, token } },
      update: {},
      create: { identifier: email, token, expires: expiresAt },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    // Send email via Resend (if configured)
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from:    process.env.EMAIL_FROM || 'noreply@profitos.app',
        to:      email,
        subject: 'Redefinir sua senha — profitOS',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
              <div style="width:32px;height:32px;background:#1A6B4A;border-radius:8px;display:flex;align-items:center;justify-content:center">
                <span style="color:white;font-size:14px;font-weight:600">P</span>
              </div>
              <span style="font-size:18px;font-weight:600;color:#111">profitOS</span>
            </div>
            <h2 style="font-size:20px;font-weight:600;color:#111;margin:0 0 8px">Redefinição de senha</h2>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px">Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#1A6B4A;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;margin-bottom:20px">Redefinir senha</a>
            <p style="color:#999;font-size:12px;margin:0">Se você não solicitou a redefinição, ignore este e-mail. Sua senha permanecerá a mesma.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
            <p style="color:#ccc;font-size:11px">Ou copie este link: <span style="color:#555">${resetUrl}</span></p>
          </div>
        `,
      });
    } else {
      // Log for development
      console.log(`[DEV] Password reset link: ${resetUrl}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
