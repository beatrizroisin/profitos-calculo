// GET  — list RunRun users from the API
// POST — save user link (collaboratorId ↔ runrunUserId)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUsers } from '@/lib/runrunit';

function decrypt(encoded: string): string {
  const key = process.env.NEXTAUTH_SECRET ?? 'profitos-secret';
  const text = Buffer.from(encoded, 'base64').toString();
  return text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  const config = await prisma.runRunConfig.findUnique({ where: { companyId: u.companyId } });
  if (!config) return NextResponse.json({ error: 'RunRun.it não configurado.' }, { status: 404 });

  const users = await getUsers(decrypt(config.appKey), decrypt(config.userToken));
  const links = await prisma.runRunUserLink.findMany({ where: { companyId: u.companyId } });

  return NextResponse.json({ users, links });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const config = await prisma.runRunConfig.findUnique({ where: { companyId: u.companyId } });
  if (!config) return NextResponse.json({ error: 'RunRun.it não configurado.' }, { status: 404 });

  const { collaboratorId, runrunUserId, runrunEmail, runrunName } = await req.json();
  if (!collaboratorId || !runrunUserId) return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });

  const link = await prisma.runRunUserLink.upsert({
    where:  { configId_collaboratorId: { configId: config.id, collaboratorId } },
    update: { runrunUserId, runrunEmail, runrunName },
    create: { companyId: u.companyId, configId: config.id, collaboratorId, runrunUserId, runrunEmail, runrunName },
  });
  return NextResponse.json(link, { status: 201 });
}
