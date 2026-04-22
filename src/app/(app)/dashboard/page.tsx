// src/app/(app)/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { KPICard, Grid4, Grid2, Card, Alert, BarRow, Pill } from '@/components/ui';
import { BRL, pct, SERVICE_TYPE_LABELS, RISK_LABELS } from '@/lib/utils';
import Link from 'next/link';
import { FinanceChart } from '@/components/dashboard/FinanceChart';

interface Props { searchParams: { period?: string; pipeline?: string } }

const MONTHS_MAP:   Record<string, number> = { '30d': 1, '60d': 2, '90d': 3, '6m': 6, '1y': 12, '2y': 24 };
const PERIOD_LABEL: Record<string, string> = { '30d':'30 dias','60d':'60 dias','90d':'90 dias','6m':'6 meses','1y':'1 ano','2y':'2 anos' };

export default async function DashboardPage({ searchParams }: Props) {
  const session      = await getServerSession(authOptions);
  const companyId    = (session!.user as any).companyId;
  const period       = searchParams.period || '90d';
  const months       = MONTHS_MAP[period] || 3;
  const showPipeline = searchParams.pipeline === '1';
  const periodLabel  = PERIOD_LABEL[period] || '90 dias';

  const [clients, collaborators, txExpenseAgg] = await Promise.all([
    prisma.client.findMany({ where: { companyId } }),
    prisma.collaborator.findMany({
      where:  { companyId, isActive: true },
      select: { salary: true },
    }),
    // Aggregate pagar × receber totals
    prisma.transaction.aggregate({
      where: { companyId, type: 'EXPENSE', status: { not: 'CANCELLED' } },
      _sum:  { amount: true },
    }),
  ]);

  const active   = clients.filter(c => c.status === 'ACTIVE');
  const pipeline = clients.filter(c => c.status === 'PIPELINE');
  const displayed = showPipeline ? [...active, ...pipeline] : active;

  const monthlyNet      = active.reduce((s, c) => s + c.netRevenue, 0);
  const monthlyGross    = active.reduce((s, c) => s + c.grossRevenue, 0);
  const monthlyTax      = monthlyGross - monthlyNet;
  const recurringRev    = active.filter(c => c.isRecurring).reduce((s, c) => s + c.netRevenue, 0);
  const ticketMedio     = active.length > 0 ? monthlyNet / active.length : 0;

  const pipelineNet        = pipeline.reduce((s, c) => s + c.netRevenue, 0);
  const pipelineRecurring  = pipeline.filter(c => c.isRecurring).length;
  const pipelinePontual    = pipeline.filter(c => !c.isRecurring).length;

  const folhaTotal     = collaborators.reduce((s, c) => s + c.salary, 0);
  const resultado      = monthlyNet - folhaTotal;
  const marginPct      = monthlyNet > 0 ? resultado / monthlyNet * 100 : 0;
  const folhaPct       = monthlyNet > 0 ? (folhaTotal / monthlyNet) * 100 : 0;
  const resultadoComPipeline = (monthlyNet + pipelineNet) - folhaTotal;

  // Pagar × Receber totals from transactions table
  const totalPagar   = txExpenseAgg._sum.amount ?? 0;
  const totalReceber = monthlyNet;

  const topClients  = [...displayed].sort((a, b) => b.netRevenue - a.netRevenue).slice(0, 6);
  const maxRev      = topClients[0]?.netRevenue || 1;
  const riskClients = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');

  const riskColor: Record<string, 'red' | 'amber' | 'green'> = {
    LOW: 'green', MEDIUM: 'amber', HIGH: 'red', CRITICAL: 'red',
  };

  const togglePipelineUrl = showPipeline
    ? `?period=${period}`
    : `?period=${period}&pipeline=1`;

  return (
    <div className="space-y-5">

      {/* Pipeline toggle banner */}
      {pipeline.length > 0 && (
        <div className={`flex items-center justify-between p-3 rounded-xl border ${showPipeline ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${showPipeline ? 'bg-blue-500' : 'bg-gray-400'}`}/>
            <div>
              <p className="text-xs font-medium text-gray-800">
                {pipeline.length} possíve{pipeline.length === 1 ? 'l entrada' : 'is entradas'} no pipeline —{' '}
                <span className="text-blue-700 font-semibold">{BRL(pipelineNet)}/mês potencial</span>
                {pipelineRecurring > 0 && <span className="text-blue-600"> · {pipelineRecurring} recorrente{pipelineRecurring > 1 ? 's' : ''}</span>}
                {pipelinePontual > 0   && <span className="text-blue-500"> · {pipelinePontual} pontual{pipelinePontual > 1 ? 'is' : ''}</span>}
              </p>
              <p className="text-[10.5px] text-gray-500 mt-0.5">
                {showPipeline
                  ? `Projeção ativa — resultado projetado: ${BRL(resultadoComPipeline)}/mês`
                  : 'Inclua o pipeline para ver o potencial de crescimento'}
              </p>
            </div>
          </div>
          <Link href={togglePipelineUrl}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
              showPipeline ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {showPipeline ? 'Ocultar pipeline' : 'Ver com pipeline'}
          </Link>
        </div>
      )}

      {/* Setup nudges */}
      {active.length === 0 && pipeline.length === 0 && (
        <Alert variant="info">
          <strong>Bem-vindo ao profitOS.</strong>{' '}
          Comece cadastrando seus <Link href="/clientes?new=1" className="underline font-medium">clientes</Link>{' '}
          e a sua <Link href="/colaboradores" className="underline font-medium">equipe</Link>.
        </Alert>
      )}
      {active.length > 0 && folhaTotal === 0 && (
        <Alert variant="info">
          Cadastre a <Link href="/colaboradores" className="underline font-medium">equipe e seus salários</Link>{' '}
          para calcular margem e ocupação do time.
        </Alert>
      )}

      {/* KPIs row 1 */}
      <Grid4>
        <KPICard
          label={`Entradas (${periodLabel})`}
          value={BRL((showPipeline ? monthlyNet + pipelineNet : monthlyNet) * months)}
          sub={showPipeline
            ? `${BRL(monthlyNet)} ativo + ${BRL(pipelineNet)} pipeline`
            : `${BRL(monthlyNet)}/mês · ${active.length} clientes`}
          color="green" accentColor="#1A6B4A"
        />
        <KPICard
          label={`Folha / custo fixo (${periodLabel})`}
          value={BRL(folhaTotal * months)}
          sub={folhaTotal > 0 ? `${BRL(folhaTotal)}/mês · ${collaborators.length} colaboradores` : 'Cadastre a equipe'}
          color="red" accentColor="#DC3545"
        />
        <KPICard
          label={`Resultado (${periodLabel})`}
          value={BRL((showPipeline ? resultadoComPipeline : resultado) * months)}
          sub={showPipeline ? 'projeção com pipeline' : `${pct(marginPct)} de margem`}
          color={(showPipeline ? resultadoComPipeline : resultado) >= 0 ? 'green' : 'red'}
          accentColor={(showPipeline ? resultadoComPipeline : resultado) >= 0 ? '#1A6B4A' : '#DC3545'}
        />
        <KPICard label="Ticket médio líquido" value={BRL(ticketMedio)} sub={`imposto: ${BRL(monthlyTax)}/mês`} color="blue" />
      </Grid4>

      {/* KPIs row 2 */}
      <Grid4>
        <KPICard label="Receita bruta/mês"     value={BRL(monthlyGross)} sub={`líquido: ${BRL(monthlyNet)}`} />
        <KPICard
          label="Folha / receita líquida"
          value={folhaTotal > 0 ? pct(folhaPct) : '—'}
          sub={folhaTotal > 0 ? 'limite saudável: 50%' : 'Cadastre colaboradores'}
          color={folhaPct > 50 ? 'red' : 'amber'}
        />
        <KPICard label="Clientes ativos"   value={String(active.length)}   sub={`${pipeline.length} no pipeline`} color="blue" />
        <KPICard label="Receita recorrente" value={BRL(recurringRev)}       sub="mensal garantida" color="green" />
      </Grid4>

      {/* Alerts */}
      {resultado < 0 && folhaTotal > 0 && (
        <Alert variant="danger">
          <strong>Déficit de {BRL(Math.abs(resultado))}/mês.</strong>{' '}
          Folha ({BRL(folhaTotal)}) supera receita líquida ({BRL(monthlyNet)}).{' '}
          Em {periodLabel}: {BRL(Math.abs(resultado * months))}.
          {pipeline.length > 0 && !showPipeline && ` Com o pipeline: ${BRL(resultadoComPipeline)}/mês.`}
        </Alert>
      )}
      {riskClients.length > 0 && (
        <Alert variant="warn">
          <strong>{riskClients.length} cliente(s) com risco alto ou crítico</strong>{' '}
          somam {BRL(riskClients.reduce((s, c) => s + c.netRevenue, 0))}/mês em risco.{' '}
          <Link href="/clientes" className="underline">Ver detalhes →</Link>
        </Alert>
      )}

      {/* MAIN GRID: receita + pagar×receber */}
      <Grid2>
        <Card
          title={showPipeline ? 'Receita por cliente (ativos + pipeline)' : 'Receita por cliente (top 6)'}
          subtitle={showPipeline ? 'Azul = ativo · Roxo = pipeline' : 'Carteira ativa — líquido mensal'}>
          {topClients.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhum cliente ativo.{' '}
              <Link href="/clientes?new=1" className="text-[#1A6B4A] underline">Adicionar →</Link>
            </div>
          ) : (
            <div>
              {topClients.map(c => (
                <BarRow
                  key={c.id}
                  label={c.name.split(' ').slice(0, 2).join(' ')}
                  value={BRL(c.netRevenue)}
                  pct={c.netRevenue / maxRev * 100}
                  color={c.status === 'PIPELINE' ? '#7C3AED' : '#2563EB'}
                />
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Contas a pagar × receber"
          subtitle="Lançamentos cadastrados — com toggle de pipeline">
          <FinanceChart
            totalPagar={totalPagar}
            totalReceber={totalReceber}
            pipelineNet={pipelineNet}
            pipelineCount={pipeline.length}
          />
        </Card>
      </Grid2>

      {/* PIPELINE DETAIL SECTION — always visible when pipeline exists */}
      {pipeline.length > 0 && (
        <Card
          title="Possíveis entradas — pipeline"
          subtitle={`${pipeline.length} oportunidade${pipeline.length !== 1 ? 's' : ''} · ${BRL(pipelineNet)}/mês potencial · ${BRL(resultadoComPipeline)}/mês resultado projetado`}
          action={
            <Link href="/clientes?status=PIPELINE"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
              Ver todos →
            </Link>
          }>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-50">
            <div>
              <p className="text-[9px] text-blue-600 uppercase tracking-wider font-medium">Receita potencial/mês</p>
              <p className="text-base font-semibold text-blue-800 tabular-nums mt-0.5">{BRL(pipelineNet)}</p>
              <p className="text-[10px] text-blue-500 mt-0.5">bruto: {BRL(pipeline.reduce((s,c) => s + c.grossRevenue, 0))}</p>
            </div>
            <div>
              <p className="text-[9px] text-blue-600 uppercase tracking-wider font-medium">Recorrentes / Pontuais</p>
              <p className="text-base font-semibold text-blue-800 mt-0.5">
                {pipelineRecurring} rec. · {pipelinePontual} pont.
              </p>
              <p className="text-[10px] text-blue-500 mt-0.5">de {pipeline.length} oportunidade{pipeline.length !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className="text-[9px] text-blue-600 uppercase tracking-wider font-medium">Resultado se converter tudo</p>
              <p className={`text-base font-semibold tabular-nums mt-0.5 ${resultadoComPipeline >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {BRL(resultadoComPipeline)}/mês
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">vs. atual: {BRL(resultado)}/mês</p>
            </div>
          </div>

          {/* Client table */}
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: 480 }}>
              <thead>
                <tr>
                  <th className="text-left text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Cliente</th>
                  <th className="text-left text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Serviço</th>
                  <th className="text-center text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Tipo</th>
                  <th className="text-right text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Rec. bruta</th>
                  <th className="text-right text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Rec. líquida</th>
                  <th className="text-center text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Risco</th>
                </tr>
              </thead>
              <tbody>
                {[...pipeline].sort((a, b) => b.netRevenue - a.netRevenue).map(c => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <p className="text-xs font-medium text-gray-800">{c.name}</p>
                      {c.notes && <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">{c.notes}</p>}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="text-[10.5px] text-gray-500">{SERVICE_TYPE_LABELS[c.serviceType]}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-center">
                      <span className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded-full ${
                        c.isRecurring
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {c.isRecurring ? 'Recorrente' : 'Pontual'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <span className="text-xs text-gray-600 tabular-nums">{BRL(c.grossRevenue)}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <span className="text-xs font-semibold text-blue-700 tabular-nums">{BRL(c.netRevenue)}</span>
                      <p className="text-[9px] text-gray-400">{c.taxRate}% imp.</p>
                    </td>
                    <td className="py-2.5 text-center">
                      <Pill
                        label={RISK_LABELS[c.riskLevel]}
                        variant={riskColor[c.riskLevel]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50/50">
                  <td colSpan={3} className="py-2 text-xs font-semibold text-gray-600 pl-0">Total pipeline</td>
                  <td className="py-2 text-right text-xs font-semibold text-gray-600 tabular-nums">
                    {BRL(pipeline.reduce((s,c) => s + c.grossRevenue, 0))}
                  </td>
                  <td className="py-2 text-right text-xs font-bold text-blue-700 tabular-nums">
                    {BRL(pipelineNet)}
                  </td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Risk clients */}
      {riskClients.length > 0 && (
        <Card title="Clientes em risco" subtitle="Alto e crítico — atenção imediata">
          <div className="space-y-2">
            {riskClients.slice(0, 6).map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-medium text-gray-800">{c.name.slice(0, 30)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{SERVICE_TYPE_LABELS[c.serviceType]}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill label={RISK_LABELS[c.riskLevel]} variant={riskColor[c.riskLevel]} />
                  <span className="text-xs font-medium text-gray-700 tabular-nums">{BRL(c.netRevenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: '/clientes',      label: 'Novo cliente',     icon: '👤', color: 'bg-blue-50 text-blue-700',    qs: '?new=1' },
          { href: '/colaboradores', label: 'Novo colaborador', icon: '👥', color: 'bg-green-50 text-green-700',  qs: '' },
          { href: '/metas',         label: 'Ver metas',        icon: '🎯', color: 'bg-purple-50 text-purple-700', qs: '' },
          { href: '/simulador',     label: 'Simular cenário',  icon: '🔮', color: 'bg-orange-50 text-orange-700', qs: '' },
        ].map(item => (
          <Link key={item.href + item.qs} href={item.href + item.qs}
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all">
            <span className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center text-base`}>{item.icon}</span>
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
