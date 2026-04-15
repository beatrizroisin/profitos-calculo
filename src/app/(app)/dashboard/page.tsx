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
  const period    = searchParams.period || '90d';
  const months    = MONTHS_MAP[period] || 3;

  const now = new Date();
  // Rolling 3-month window to calculate monthly average expenses
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const periodStart    = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const [clients, allTransactions, recentExpenseAgg, collaborators] = await Promise.all([
    prisma.client.findMany({ where: { companyId } }),
    // Transactions in the selected period (for chart and income display)
    prisma.transaction.findMany({
      where:   { companyId, dueDate: { gte: periodStart } },
      orderBy: { dueDate: 'asc' },
      select:  { id: true, type: true, amount: true, dueDate: true, status: true,
                 description: true, clientId: true, importId: true },
    }),
    // Last 3 months expenses: best monthly average estimate
    prisma.transaction.aggregate({
      where: { companyId, type: 'EXPENSE', dueDate: { gte: threeMonthsAgo } },
      _sum: { amount: true }, _count: true,
    }),
    prisma.collaborator.findMany({
      where:  { companyId, isActive: true },
      select: { salary: true },
    }),
  ]);

  const active       = clients.filter(c => c.status === 'ACTIVE');
  const monthlyNet   = active.reduce((s, c) => s + c.netRevenue, 0);
  const monthlyGross = active.reduce((s, c) => s + c.grossRevenue, 0);
  const monthlyTax   = monthlyGross - monthlyNet;
  const recurringRev = active.filter(c => c.isRecurring).reduce((s, c) => s + c.netRevenue, 0);
  const ticketMedio  = active.length > 0 ? monthlyNet / active.length : 0;

  // Monthly expense: use rolling 3-month average from real imported transactions.
  // Falls back to payroll total if no transactions imported yet.
  const recentExpTotal = recentExpenseAgg._sum.amount ?? 0;
  const recentExpCount = recentExpenseAgg._count;
  const folhaTotal     = collaborators.reduce((s, c) => s + c.salary, 0);

  let monthlyExpense: number;
  if (recentExpCount > 0) {
    monthlyExpense = recentExpTotal / 3;                  // average of last 3 months
  } else {
    monthlyExpense = folhaTotal > 0 ? folhaTotal : 0;     // payroll as proxy, or 0 if nothing
  }

  const hasImportedExpenses = recentExpCount > 0;

  const resultado   = monthlyNet - monthlyExpense;
  const marginPct   = monthlyNet > 0 ? resultado / monthlyNet * 100 : 0;
  const folhaPct    = monthlyExpense > 0 ? (folhaTotal / monthlyExpense) * 100 : 0;

  // Period-window income and expense from transactions
  const periodExpenses = allTransactions.filter(t => t.type === 'EXPENSE');
  const periodIncome   = allTransactions.filter(t => t.type === 'INCOME');
  const totalPeriodExp = periodExpenses.reduce((s, t) => s + t.amount, 0);
  const totalPeriodInc = periodIncome.reduce((s, t) => s + t.amount, 0);

  const topClients  = [...active].sort((a, b) => b.netRevenue - a.netRevenue).slice(0, 6);
  const maxRev      = topClients[0]?.netRevenue || 1;
  const riskClients = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');

  const riskColor: Record<string, 'red' | 'amber' | 'green'> = {
    LOW: 'green', MEDIUM: 'amber', HIGH: 'red', CRITICAL: 'red',
  };
  const periodLabel = period === '90d' ? '90 dias'
    : period === '6m' ? '6 meses'
    : period === '1y' ? '1 ano' : '2 anos';

  // For the period KPI: use transaction data when available, else client model × months
  const entradas = totalPeriodInc > 0 ? totalPeriodInc : monthlyNet * months;
  const saidas   = totalPeriodExp > 0 ? totalPeriodExp : monthlyExpense * months;

  return (
    <div className="space-y-5">
      {/* Import data notice */}
      {!hasImportedExpenses && folhaTotal === 0 && (
        <Alert variant="info">
          <strong>Sem lançamentos financeiros.</strong> Importe suas planilhas de{' '}
          <Link href="/importar" className="underline font-medium">contas a pagar e receber</Link>{' '}
          para que o Dashboard, Metas, CEO e Simulador usem dados reais.
        </Alert>
      )}
      {hasImportedExpenses && (
        <Alert variant="ok">
          Dados calculados a partir de {recentExpCount} lançamentos importados — média mensal de custos dos últimos 3 meses.
        </Alert>
      )}

      {/* KPIs row 1 */}
      <Grid4>
        <KPICard
          label={`Entradas (${periodLabel})`}
          value={BRL(entradas)}
          sub={`${BRL(monthlyNet)}/mês · ${active.length} clientes`}
          color="green" accentColor="#1A6B4A"
        />
        <KPICard
          label={`Saídas (${periodLabel})`}
          value={BRL(saidas)}
          sub={hasImportedExpenses ? `${BRL(monthlyExpense)}/mês (média real)` : `${BRL(monthlyExpense)}/mês (folha)`}
          color="red" accentColor="#DC3545"
        />
        <KPICard
          label={`Resultado (${periodLabel})`}
          value={BRL(resultado * months)}
          sub={`${pct(marginPct)} de margem`}
          color={resultado >= 0 ? 'green' : 'red'}
          accentColor={resultado >= 0 ? '#1A6B4A' : '#DC3545'}
        />
        <KPICard label="Ticket médio líquido" value={BRL(ticketMedio)} sub={`imposto: ${BRL(monthlyTax)}/mês`} color="blue" />
      </Grid4>

      {/* KPIs row 2 */}
      <Grid4>
        <KPICard label="Receita bruta/mês"  value={BRL(monthlyGross)}  sub={`líquido: ${BRL(monthlyNet)}`} />
        <KPICard
          label="Folha / custo fixo"
          value={folhaTotal > 0 ? pct(folhaPct) : '—'}
          sub={folhaTotal > 0 ? `folha: ${BRL(folhaTotal)}/mês` : 'Cadastre colaboradores'}
          color={folhaPct > 50 ? 'red' : 'amber'}
        />
        <KPICard label="Clientes ativos"    value={String(active.length)} sub={`de ${clients.length} cadastrados`} color="blue" />
        <KPICard label="Receita recorrente" value={BRL(recurringRev)}    sub="mensal garantida" color="green" />
      </Grid4>

      {/* Alerts */}
      {resultado < 0 && (
        <Alert variant="danger">
          <strong>Déficit de {BRL(Math.abs(resultado))}/mês.</strong>{' '}
          Em {periodLabel}: {BRL(Math.abs(resultado * months))}. Priorize captação de novos clientes.
        </Alert>
      )}
      {riskClients.length > 0 && (
        <Alert variant="warn">
          <strong>{riskClients.length} cliente(s) com risco alto ou crítico</strong>{' '}
          somam {BRL(riskClients.reduce((s, c) => s + c.netRevenue, 0))}/mês em risco.{' '}
          <Link href="/clientes" className="underline">Ver detalhes →</Link>
        </Alert>
      )}

      {/* Charts */}
      <Grid2>
        <Card title="Receita por cliente (top 6)" subtitle="Carteira ativa — líquido mensal">
          {topClients.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhum cliente ativo. <Link href="/clientes?new=1" className="text-[#1A6B4A] underline">Adicionar cliente →</Link>
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
          href: '/clientes?new=true',
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
