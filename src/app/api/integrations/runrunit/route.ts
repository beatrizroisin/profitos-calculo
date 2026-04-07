// GET  — fetch RunRun config for company
// POST — save config (encrypted app-key + user-token)
// DELETE — remove integration
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { testConnection } from '@/lib/runrunit';

// Simple XOR-based obfuscation (in production: use AES-256 with KMS or Vault)
function encrypt(text: string): string {
  const key = process.env.NEXTAUTH_SECRET ?? 'profitos-secret';
  return Buffer.from(
    text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('')
  ).toString('base64');
}
function decrypt(encoded: string): string {
  const key = process.env.NEXTAUTH_SECRET ?? 'profitos-secret';
  const text = Buffer.from(encoded, 'base64').toString();
  return text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const config = await prisma.runRunConfig.findUnique({
    where: { companyId: u.companyId },
    select: { id:true, syncFrequency:true, lastSyncAt:true, isActive:true, createdAt:true },
  });
  return NextResponse.json(config ?? null);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN'].includes(u.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { appKey, userToken, syncFrequency, testOnly } = await req.json();
  if (!appKey || !userToken) return NextResponse.json({ error: 'App-Key e User-Token são obrigatórios.' }, { status: 400 });

  // Always test connection first
  try {
    const enterprise = await testConnection(appKey, userToken);
    if (testOnly) return NextResponse.json({ success: true, enterprise });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha na conexão com RunRun.it.' }, { status: 400 });
  }

  const config = await prisma.runRunConfig.upsert({
    where:  { companyId: u.companyId },
    update: { appKey: encrypt(appKey), userToken: encrypt(userToken), syncFrequency: syncFrequency || 'daily', isActive: true },
    create: { companyId: u.companyId, appKey: encrypt(appKey), userToken: encrypt(userToken), syncFrequency: syncFrequency || 'daily' },
  });
  return NextResponse.json({ success: true, configId: config.id });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (u.role !== 'OWNER') return NextResponse.json({ error: 'Somente o Proprietário pode remover a integração.' }, { status: 403 });

  await prisma.runRunConfig.deleteMany({ where: { companyId: u.companyId } });
  return NextResponse.json({ success: true });
}
