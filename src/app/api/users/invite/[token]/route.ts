// GET  /api/users/invite/[token] — validate invite (public)
// POST /api/users/invite/[token] — accept invite
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await prisma.userInvite.findUnique({
    where: { token: params.token },
    include: { company: { select: { name: true } } },
  });

  if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Convite inválido ou expirado.' }, { status: 404 });
  }

  return NextResponse.json({
    email: invite.email,
    name: invite.name,
    role: invite.role,
    companyName: invite.company.name,
  });
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const body = await req.json();
    const { password, method } = body;

    const invite = await prisma.userInvite.findUnique({
      where: { token: params.token },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Convite inválido ou expirado.' }, { status: 400 });
    }

    if (method === 'password') {
      if (!password || password.length < 8) {
        return NextResponse.json({ error: 'Senha inválida.' }, { status: 400 });
      }
      const passwordHash = await bcrypt.hash(password, 12);

      // Upsert user
      await prisma.user.upsert({
        where: { email: invite.email },
        update: { passwordHash, companyId: invite.company.id, role: invite.role, isActive: true },
        create: {
          companyId: invite.company.id,
          name: invite.name || invite.email.split('@')[0],
          email: invite.email,
          passwordHash,
          role: invite.role,
          isActive: true,
        },
      });
    }
    // For google: user is created on first Google sign-in, company assigned by email match on invite

    await prisma.userInvite.update({
      where: { token: params.token },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
