import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  type:        z.enum(['INCOME','EXPENSE']),
  description: z.string().min(1),
  amount:      z.number().positive(),
  grossAmount: z.number().positive().optional(),
  taxRate:     z.number().min(0).max(100).optional(),
  dueDate:     z.string(),
  paidAt:      z.string().optional().nullable(),
  isRecurring: z.boolean().default(false),
  status:      z.enum(['PENDING','PAID','OVERDUE','CANCELLED']).default('PENDING'),
  clientId:    z.string().optional().nullable(),
  categoryId:  z.string().optional().nullable(),
  notes:       z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  const { searchParams } = new URL(req.url);
  const type   = searchParams.get('type');   // INCOME | EXPENSE
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const from   = searchParams.get('from');   // ISO date
  const to     = searchParams.get('to');

  const where: any = { companyId: u.companyId };
  if (type)   where.type   = type;
  if (status) where.status = status;
  if (search) where.description = { contains: search, mode: 'insensitive' };
  if (from || to) {
    where.dueDate = {};
    if (from) where.dueDate.gte = new Date(from);
    if (to)   where.dueDate.lte = new Date(to);
  }

  const [transactions, totals] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        client:   { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 200,
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: { companyId: u.companyId },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome  = totals.find(t => t.type === 'INCOME')?._sum.amount  ?? 0;
  const totalExpense = totals.find(t => t.type === 'EXPENSE')?._sum.amount ?? 0;

  return NextResponse.json({ transactions, totalIncome, totalExpense, resultado: totalIncome - totalExpense });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN','MANAGER'].includes(u.role))
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const tx = await prisma.transaction.create({
      data: {
        companyId: u.companyId,
        ...data,
        dueDate:    new Date(data.dueDate),
        paidAt:     data.paidAt ? new Date(data.paidAt) : null,
        clientId:   data.clientId   || null,
        categoryId: data.categoryId || null,
      },
      include: {
        client:   { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });
    return NextResponse.json(tx, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError') return NextResponse.json({ error: 'Dados inválidos.', details: err.errors }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
