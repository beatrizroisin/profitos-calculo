import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_SERVICES = [
  'Migração para VTEX IO com Redesign', 'Arquitetura de E-commerce',
  'Implantação de E-commerce', 'Pacote de Evolução Básico — Suporte + Manutenção',
  'Pacote de Evolução Intermediário — Growth (CRO+SEO)',
  'Pacote de Evolução Avançado — Performance + Inbound + Growth',
  'Plano de Evolução — Horas', 'Plano de Evolução — Semidedicado',
  'Profissionais 100% Dedicados (Outsourcing)', 'SEO', 'Inbound Marketing', 'Performance',
];

const DEFAULT_POSITIONS = [
  'CEO', 'COO', 'Gerente de Projetos', 'Head SEO', 'Head Performance',
  'Head Inbound', 'Head Desenvolvimento', 'Head Design',
  'Analista SEO', 'Analista de Performance', 'Analista de Inbound',
  'Desenvolvedor Web', 'Designer UX/UI',
  'Atendimento / Customer Success', 'Financeiro / Administrativo',
];

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'Slug required' }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { slug },
    include: { settings: true },
  });

  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const services  = (company.settings?.customServices  as string[] | null) ?? DEFAULT_SERVICES;
  const positions = (company.settings?.customPositions as string[] | null) ?? DEFAULT_POSITIONS;

  return NextResponse.json({ services, positions });
}