// POST /api/users/invite — create invite (OWNER or ADMIN only)
// GET  /api/users/invite — list invites
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name:  z.string().optional(),
  role:  z.enum(['ADMIN','MANAGER','MEMBER','VIEWER']),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const invites = await prisma.userInvite.findMany({
    where: { companyId: u.companyId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { email, name, role } = schema.parse(body);

    if (!canManageRole(u.role, role)) {
      return NextResponse.json({ error: 'Você não pode convidar usuários com esse nível de acesso.' }, { status: 403 });
    }

    // Check if already a user
    const existing = await prisma.user.findFirst({ where: { email, companyId: u.companyId } });
    if (existing) return NextResponse.json({ error: 'Este e-mail já é membro da empresa.' }, { status: 409 });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.userInvite.upsert({
      where: { companyId_email: { companyId: u.companyId, email } },
      update: { role, name, status: 'PENDING', expiresAt },
      create: { companyId: u.companyId, email, name, role, expiresAt },
    });

    // In production: send email with invite link
    // await sendInviteEmail(email, invite.token, u.companyName);

    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${invite.token}`;
    return NextResponse.json({ success: true, inviteUrl, token: invite.token }, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError') return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
