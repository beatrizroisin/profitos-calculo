// src/app/(app)/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { KPICard, Grid4, Grid2, Card, Alert, BarRow, Pill } from '@/components/ui';
import { BRL, BRLk, pct, SERVICE_TYPE_LABELS, RISK_LABELS } from '@/lib/utils';
import Link from 'next/link';

interface Props { searchParams: { period?: string } }

const MONTHS_MAP: Record<string, number> = { 
  '30d': 1, 
  '60d': 2,
  '90d': 3, 
  '6m': 6, 
  '1y': 12, 
  '2y': 24 
};

export default async function DashboardPage({ searchParams }: Props) {
  const session   = await getServerSession(authOptions);
  const companyId = (session!.user as any).companyId;
  const period = searchParams.period || '30d';
  const months    = MONTHS_MAP[period] || 1;

  

  const [clients, transactions] = await Promise.all([
    prisma.client.findMany({ where: { companyId } }),
    prisma.transaction.findMany({
      where: { companyId },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  const active = clients.filter(c => c.status === 'ACTIVE');
  const monthlyNet   = active.reduce((s, c) => s + c.netRevenue, 0);
  const monthlyGross = active.reduce((s, c) => s + c.grossRevenue, 0);
  const monthlyTax   = monthlyGross - monthlyNet;

  const expenses = transactions.filter(t => t.type === 'EXPENSE');
  const monthlyExpense = expenses.length > 0
    ? expenses.reduce((s, t) => s + t.amount, 0) / Math.max(1, months)
    : 0; // fallback demo value

  const resultado      = monthlyNet - monthlyExpense;
  const marginPct      = monthlyNet > 0 ? resultado / monthlyNet * 100 : 0;
  const ticketMedio    = active.length > 0 ? monthlyNet / active.length : 0;
  const folhaPJ        = monthlyExpense * 0.675; // demo: 67.5% folha
  const recurringRev   = active.filter(c => c.isRecurring).reduce((s, c) => s + c.netRevenue, 0);

  const topClients = [...active].sort((a, b) => b.netRevenue - a.netRevenue).slice(0, 6);
  const maxRev     = topClients[0]?.netRevenue || 1;
  const riskClients = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');

  const riskColor: Record<string, 'red' | 'amber' | 'green'> = {
    LOW: 'green', MEDIUM: 'amber', HIGH: 'red', CRITICAL: 'red',
  };

 const labels: Record<string, string> = {
  '30d': '30 dias',
  '60d': '60 dias',
  '90d': '90 dias',
  '6m': '6 meses',
  '1y': '1 ano',
  '2y': '2 anos'
};
const periodLabel = labels[period] || '30 dias';


  return (
    <div className="space-y-5">
      {/* KPIs row 1 */}
      <Grid4>
        <KPICard label={`Entradas (${periodLabel})`}  value={BRL(monthlyNet * months)}    sub={`${BRL(monthlyNet)}/mês · ${active.length} clientes`}  color="green"  accentColor="#1A6B4A" />
        <KPICard label={`Saídas (${periodLabel})`}    value={BRL(monthlyExpense * months)} sub={`${BRL(monthlyExpense)}/mês estimado`}                   color="red"    accentColor="#DC3545" />
        <KPICard label={`Resultado (${periodLabel})`} value={BRL(resultado * months)}      sub={`${pct(marginPct)} de margem`}                           color={resultado >= 0 ? 'green' : 'red'} accentColor={resultado >= 0 ? '#1A6B4A' : '#DC3545'} />
        <KPICard label="Ticket médio líquido"         value={BRL(ticketMedio)}             sub={`imposto: ${BRL(monthlyTax)}/mês`}                        color="blue" />
      </Grid4>

      {/* KPIs row 2 */}
      <Grid4>
        <KPICard label="Receita bruta/mês"    value={BRL(monthlyGross)}    sub={`líquido: ${BRL(monthlyNet)}`} />
        <KPICard label="Folha PJ / saídas"    value={pct(folhaPJ / monthlyExpense * 100)} sub="limite saudável: 50%" color={folhaPJ / monthlyExpense > 0.50 ? 'red' : 'amber'} />
        <KPICard label="Clientes ativos"      value={String(active.length)} sub={`de ${clients.length} cadastrados`} color="blue" />
        <KPICard label="Receita recorrente"   value={BRL(recurringRev)}    sub="mensal garantida" color="green" />
      </Grid4>

      {/* Alerts */}
      {resultado < 0 && (
        <Alert variant="danger">
          <strong>Déficit de {BRL(Math.abs(resultado))}/mês.</strong> Em {periodLabel}, acumula {BRL(Math.abs(resultado * months))} de prejuízo. Priorize captação de novos clientes.
        </Alert>
      )}
      {riskClients.length > 0 && (
        <Alert variant="warn">
          <strong>{riskClients.length} cliente(s) com risco alto ou crítico</strong> somam {BRL(riskClients.reduce((s, c) => s + c.netRevenue, 0))}/mês em risco. <Link href="/clientes" className="underline">Ver detalhes →</Link>
        </Alert>
      )}

      {/* Charts + clients */}
      <Grid2>
        <Card title="Receita por cliente (top 6)" subtitle="Carteira ativa — líquido mensal">
          {topClients.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhum cliente ativo. <Link href="/clientes/novo" className="text-[#1A6B4A] underline">Adicionar cliente →</Link>
            </div>
          ) : (
            <div>
              {topClients.map(c => (
                <BarRow key={c.id} label={c.name.split(' ').slice(0, 2).join(' ')} value={BRL(c.netRevenue)} pct={c.netRevenue / maxRev * 100} color="#2563EB" />
              ))}
            </div>
          )}
        </Card>

        <Card title="Clientes em risco" subtitle="Alto e crítico — atenção imediata">
          {riskClients.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">Nenhum cliente em risco crítico.</div>
          ) : (
            <div className="space-y-2">
              {riskClients.slice(0, 6).map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{c.name.slice(0, 30)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{SERVICE_TYPE_LABELS[c.serviceType]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill label={RISK_LABELS[c.riskLevel]} variant={riskColor[c.riskLevel]} />
                    <span className="text-xs font-medium text-gray-700 tabular">{BRL(c.netRevenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Grid2>

      {/* Quick links */}
      <div className="grid grid-cols-4 gap-3">
        {[
         { 
          href: '/clientes?new=true', // Adicionamos ?new=true aqui
          label: 'Novo cliente', 
          icon: '👤', 
          color: 'bg-blue-50 text-blue-700' 
        },
          { href: '/precificacao',label: 'Nova precificação', icon: '📊', color: 'bg-green-50 text-green-700'  },
          { href: '/metas',            label: 'Ver metas',        icon: '🎯', color: 'bg-purple-50 text-purple-700' },
          { href: '/simulador',        label: 'Simular cenário',  icon: '🔮', color: 'bg-orange-50 text-orange-700' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all`}>
            <span className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center text-base`}>{item.icon}</span>
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
