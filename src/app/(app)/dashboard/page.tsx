// src/app/(app)/dashboard/page.tsx — v3.7 COMPLETO
// DRE estruturado, inadimplência, fluxo de caixa projetado, margem por cliente,
// alerta de concentração, break-even — todos implementados.
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
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default async function DashboardPage({ searchParams }: Props) {
  const session      = await getServerSession(authOptions);
  const companyId    = (session!.user as any).companyId;
  const period       = searchParams.period || '30d';
  const months       = MONTHS_MAP[period] || 1;
  const showPipeline = searchParams.pipeline === '1';
  const periodLabel  = PERIOD_LABEL[period] || '30 dias';
  const now          = new Date();
  const today        = now.getDate();
  const thisMonth    = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [clients, collaborators, txExpenseAgg, txExpensePending, txOverdue, txPaidThisMonth] = await Promise.all([
    prisma.client.findMany({ where: { companyId } }),
    prisma.collaborator.findMany({ where: { companyId, isActive: true }, select: { salary: true, name: true } }),
    prisma.transaction.aggregate({ where: { companyId, type: 'EXPENSE', status: { not: 'CANCELLED' } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { companyId, type: 'EXPENSE', status: { in: ['PENDING','OVERDUE'] } }, _sum: { amount: true } }),
    prisma.transaction.findMany({ where: { companyId, type: 'INCOME', status: 'OVERDUE' }, select: { amount: true, description: true, clientId: true, dueDate: true, client: { select: { name: true } } } }),
    prisma.transaction.findMany({ where: { companyId, type: 'INCOME', status: 'PAID', paidAt: { gte: thisMonth, lt: nextMonth } }, select: { clientId: true } }),
  ]);

  const active   = clients.filter(c => c.status === 'ACTIVE');
  const pipeline = clients.filter(c => c.status === 'PIPELINE');

  const monthlyNet   = active.reduce((s, c) => s + c.netRevenue, 0);
  const monthlyGross = active.reduce((s, c) => s + c.grossRevenue, 0);
  const monthlyTax   = monthlyGross - monthlyNet;
  const recurringRev = active.filter(c => c.isRecurring).reduce((s, c) => s + c.netRevenue, 0);
  const ticketMedio  = active.length > 0 ? monthlyNet / active.length : 0;
  const pipelineNet  = pipeline.reduce((s, c) => s + c.netRevenue, 0);
  const pipelineRec  = pipeline.filter(c => c.isRecurring).length;
  const pipelinePon  = pipeline.filter(c => !c.isRecurring).length;

  // Costs
  const folhaTotal        = collaborators.reduce((s, c) => s + c.salary, 0);
  const despesasLancadas  = txExpenseAgg._sum.amount ?? 0;
  const despesasPendentes = txExpensePending._sum.amount ?? 0;
  const totalCustoMensal  = folhaTotal + despesasLancadas;

  // P&L
  const resultado          = monthlyNet - totalCustoMensal;
  const marginPct          = monthlyNet > 0 ? resultado / monthlyNet * 100 : 0;
  const folhaPct           = monthlyNet > 0 ? folhaTotal / monthlyNet * 100 : 0;
  const resultadoComPL     = (monthlyNet + pipelineNet) - totalCustoMensal;

  // ── INADIMPLÊNCIA ────────────────────────────────────────────────────────
  const paidClientIds = new Set(txPaidThisMonth.map(t => t.clientId).filter(Boolean));
  const defaulters    = active.filter(c => c.isRecurring && (c as any).dueDay <= today && !paidClientIds.has(c.id));
  const overdueRevenue = txOverdue.reduce((s, t) => s + t.amount, 0);
  const inadRevenue    = defaulters.reduce((s, c) => s + c.netRevenue, 0);

   // ── CONTRATOS ENCERRANDO ─────────────────────────────────────────────────
  const encerrandoBreve = active.filter(c => {
    if (!c.isRecurring || !c.totalInstallments || c.totalInstallments === 0) return false;
    const restantes = c.totalInstallments - c.currentInstallment;
    return restantes >= 0 && restantes <= 2;
  });

  // ── CONCENTRAÇÃO ────────────────────────────────────────────────────────
  const sorted         = [...active].sort((a, b) => b.netRevenue - a.netRevenue);
  const biggestClient  = sorted[0];
  const concRisk       = monthlyNet > 0 && biggestClient ? biggestClient.netRevenue / monthlyNet * 100 : 0;

  // ── BREAK-EVEN ───────────────────────────────────────────────────────────
  const breakEven      = ticketMedio > 0 ? Math.ceil(totalCustoMensal / ticketMedio) : 0;
  const breakEvenGap   = Math.max(0, breakEven - active.length);

  // ── MARGEM UNITÁRIA POR CLIENTE ─────────────────────────────────────────
  const clientMargins = sorted.map(c => {
    const share        = monthlyNet > 0 ? c.netRevenue / monthlyNet : 0;
    const custoAlocado = totalCustoMensal * share;
    const margem       = c.netRevenue - custoAlocado;
    const margemPct    = c.netRevenue > 0 ? margem / c.netRevenue * 100 : 0;
    return { ...c, custoAlocado, margem, margemPct };
  });

  // ── CASHFLOW 6 MESES ─────────────────────────────────────────────────────
  const cashflow = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    return { mes: MONTH_SHORT[d.getMonth()] + '/' + String(d.getFullYear()).slice(2), receita: monthlyNet, custo: totalCustoMensal, saldo: resultado, acum: resultado * (i + 1) };
  });

  // Misc
  const topClients    = [...(showPipeline ? [...active, ...pipeline] : active)].sort((a, b) => b.netRevenue - a.netRevenue).slice(0, 6);
  const maxRev        = topClients[0]?.netRevenue || 1;
  const riskClients   = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');
  const togglePLUrl   = showPipeline ? `?period=${period}` : `?period=${period}&pipeline=1`;
  const riskColor: Record<string, 'red'|'amber'|'green'> = { LOW:'green', MEDIUM:'amber', HIGH:'red', CRITICAL:'red' };

  const marginColor = (p: number) => p >= 25 ? 'text-green-700' : p >= 10 ? 'text-amber-600' : 'text-red-600';
  const marginBg    = (p: number) => p >= 25 ? 'bg-green-50' : p >= 10 ? 'bg-amber-50' : 'bg-red-50';

  return (
    <div className="space-y-5">

      {/* Pipeline banner */}
      {pipeline.length > 0 && (
        <div className={`flex items-center justify-between p-3 rounded-xl border ${showPipeline ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${showPipeline ? 'bg-blue-500' : 'bg-gray-400'}`}/>
            <p className="text-xs font-medium text-gray-800">
              {pipeline.length} possíve{pipeline.length === 1 ? 'l entrada' : 'is entradas'} no pipeline —{' '}
              <span className="text-blue-700 font-semibold">{BRL(pipelineNet)}/mês potencial</span>
              {pipelineRec > 0 && <span className="text-blue-600"> · {pipelineRec} recorrente{pipelineRec > 1 ? 's' : ''}</span>}
              {pipelinePon > 0 && <span className="text-blue-500"> · {pipelinePon} pontual{pipelinePon > 1 ? 'is' : ''}</span>}
            </p>
          </div>
          <Link href={togglePLUrl} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${showPipeline ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {showPipeline ? 'Ocultar pipeline' : 'Ver com pipeline'}
          </Link>
        </div>
      )}

      {active.length === 0 && pipeline.length === 0 && (
        <Alert variant="info"><strong>Bem-vindo.</strong> Cadastre <Link href="/clientes?new=1" className="underline font-medium">clientes</Link> e a sua <Link href="/colaboradores" className="underline font-medium">equipe</Link> para ativar o dashboard.</Alert>
      )}

      {/* ── 1. DRE MENSAL ── */}
      <Card title="DRE — Demonstrativo de resultado do mês" subtitle={`Competência: ${now.toLocaleString('pt-BR',{month:'long',year:'numeric'})} · ${periodLabel}`}>
        <div className="grid grid-cols-3 gap-4">
          {/* Coluna Receita */}
          <div>
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Receita</p>
            {[
              ['Receita bruta', BRL(monthlyGross * months), 'text-gray-800'],
              ['(–) Impostos / deduções', `–${BRL(monthlyTax * months)}`, 'text-amber-600'],
            ].map(([l,v,c]) => (
              <div key={l as string} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-500">{l}</span>
                <span className={`text-xs font-medium tabular-nums ${c}`}>{v}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2 mt-1 rounded-lg bg-green-50 px-2">
              <span className="text-xs font-semibold text-green-800">= Receita líquida</span>
              <span className="text-xs font-bold tabular-nums text-green-700">{BRL(monthlyNet * months)}</span>
            </div>
          </div>
          {/* Coluna Custos */}
          <div>
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Custos operacionais</p>
            {[
              ['Folha de pagamento', `–${BRL(folhaTotal * months)}`, 'text-red-600'],
              ['Despesas lançadas', `–${BRL(despesasLancadas * months)}`, 'text-orange-500'],
            ].map(([l,v,c]) => (
              <div key={l as string} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-500">{l}</span>
                <span className={`text-xs font-medium tabular-nums ${c}`}>{v}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2 mt-1 rounded-lg bg-red-50 px-2">
              <span className="text-xs font-semibold text-red-800">= Total de custos</span>
              <span className="text-xs font-bold tabular-nums text-red-700">–{BRL(totalCustoMensal * months)}</span>
            </div>
          </div>
          {/* Coluna Resultado */}
          <div>
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Resultado</p>
            {[
              ['Margem bruta (s/ impostos)', pct(monthlyGross > 0 ? (monthlyNet - folhaTotal) / monthlyGross * 100 : 0), 'text-gray-600'],
              ['Margem operacional real', pct(marginPct), resultado >= 0 ? 'text-green-600' : 'text-red-600'],
              ['Folha / receita líquida', pct(folhaPct), folhaPct > 60 ? 'text-red-600' : folhaPct > 45 ? 'text-amber-600' : 'text-green-600'],
            ].map(([l,v,c]) => (
              <div key={l as string} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-500">{l}</span>
                <span className={`text-xs font-medium ${c}`}>{v}</span>
              </div>
            ))}
            <div className={`flex justify-between items-center py-2 mt-1 rounded-lg px-2 ${resultado >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className={`text-xs font-semibold ${resultado >= 0 ? 'text-green-800' : 'text-red-800'}`}>= Lucro / prejuízo</span>
              <span className={`text-xs font-bold tabular-nums ${resultado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {resultado >= 0 ? '+' : ''}{BRL(resultado * months)}
              </span>
            </div>
          </div>
        </div>
        {/* Break-even */}
        {breakEven > 0 && (
          <div className={`mt-3 p-3 rounded-lg border flex items-center gap-4 ${breakEvenGap > 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">Break-even</p>
              <p className={`text-base font-bold tabular-nums mt-0.5 ${breakEvenGap > 0 ? 'text-amber-700' : 'text-green-700'}`}>{breakEven} clientes</p>
            </div>
            <div className="text-xs text-gray-500 flex-1">
              {breakEvenGap > 0
                ? <><strong className="text-amber-700">Faltam {breakEvenGap} clientes</strong> para cobrir custo total de {BRL(totalCustoMensal)}/mês com ticket médio de {BRL(ticketMedio)}.</>
                : <><strong className="text-green-700">Break-even atingido.</strong> Com {active.length} clientes cobrindo {BRL(totalCustoMensal)} de custo ({BRL(ticketMedio)} ticket médio). Cada cliente adicional gera {BRL(ticketMedio * (marginPct / 100))} de margem.</>
              }
            </div>
          </div>
        )}
      </Card>

              {/* ── CONTRATOS ENCERRANDO ── */}
      {encerrandoBreve.length > 0 && (
        <Card
          title="⚠️ Contratos encerrando em breve"
          subtitle="Clientes com 2 ou menos parcelas restantes — considere renovar antes do vencimento">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: 400 }}>
              <thead>
                <tr>
                  {['Cliente','Parcela atual','Parcelas restantes','Receita/mês','Vencimento'].map(h => (
                    <th key={h} className="text-left text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {encerrandoBreve.map(c => {
                  const restantes = c.totalInstallments - c.currentInstallment;
                  return (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0 bg-amber-50/30">
                      <td className="py-2 pr-3 text-xs font-medium text-gray-800">{c.name}</td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{c.currentInstallment}/{c.totalInstallments}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full ${restantes === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {restantes === 0 ? 'Última parcela' : `${restantes} parcela${restantes > 1 ? 's' : ''}`}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right text-xs font-semibold text-amber-700 tabular-nums">{BRL(c.netRevenue)}</td>
                      <td className="py-2 text-xs text-gray-500">dia {(c as any).dueDay}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50">
                  <td colSpan={3} className="py-2 text-xs font-semibold text-gray-600">Receita em risco de encerramento</td>
                  <td className="py-2 text-right text-xs font-bold text-amber-700 tabular-nums">
                    {BRL(encerrandoBreve.reduce((s, c) => s + c.netRevenue, 0))}
                  </td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
      
      {/* ── 2. KPIs linha 1 ── */}
      <Grid4>
        <KPICard label={`Receita líquida (${periodLabel})`} value={BRL((showPipeline ? monthlyNet + pipelineNet : monthlyNet) * months)}
          sub={showPipeline ? `${BRL(monthlyNet)} ativo + ${BRL(pipelineNet)} pipeline` : `${BRL(monthlyNet)}/mês · ${active.length} clientes`}
          color="green" accentColor="#1A6B4A" />
        <KPICard label={`Custo total (${periodLabel})`} value={BRL(totalCustoMensal * months)}
          sub={`Folha ${BRL(folhaTotal)} + Desp. ${BRL(despesasLancadas)}`}
          color="red" accentColor="#DC3545" />
        <KPICard label={`Resultado (${periodLabel})`} value={BRL((showPipeline ? resultadoComPL : resultado) * months)}
          sub={showPipeline ? 'projeção com pipeline' : `${pct(marginPct)} de margem real`}
          color={(showPipeline ? resultadoComPL : resultado) >= 0 ? 'green' : 'red'}
          accentColor={(showPipeline ? resultadoComPL : resultado) >= 0 ? '#1A6B4A' : '#DC3545'} />
        <KPICard label="Ticket médio líquido" value={BRL(ticketMedio)} sub={`break-even: ${breakEven} clientes`} color="blue" />
      </Grid4>

      {/* ── 2. KPIs linha 2 ── */}
      <Grid4>
        <KPICard label="Folha de pagamento" value={BRL(folhaTotal)}
          sub={`${collaborators.length} colaboradores · ${pct(folhaPct)} receita`}
          color={folhaPct > 60 ? 'red' : 'amber'} />
        <KPICard label="Despesas lançadas" value={BRL(despesasLancadas)}
          sub={despesasPendentes > 0 ? `${BRL(despesasPendentes)} pendente/vencido` : 'todas quitadas'}
          color={despesasPendentes > 0 ? 'amber' : 'default'} />
        <KPICard label="Inadimplência estimada" value={inadRevenue > 0 ? BRL(inadRevenue) : 'Nenhuma'}
          sub={inadRevenue > 0 ? `${defaulters.length} clientes não pagaram` : 'todos em dia'}
          color={inadRevenue > 0 ? 'red' : 'green'} accentColor={inadRevenue > 0 ? '#DC3545' : '#1A6B4A'} />
        <KPICard label="Receita recorrente" value={BRL(recurringRev)} sub="mensal garantida" color="green" />
      </Grid4>

      {/* ── ALERTS CFO ── */}
      {resultado < 0 && (
        <Alert variant="danger">
          <strong>Resultado negativo: {BRL(Math.abs(resultado))}/mês.</strong>{' '}
          Folha ({BRL(folhaTotal)}) + Despesas ({BRL(despesasLancadas)}) = {BRL(totalCustoMensal)} vs. receita {BRL(monthlyNet)}.
          {pipeline.length > 0 && !showPipeline && ` Com o pipeline: ${BRL(resultadoComPL)}/mês.`}
        </Alert>
      )}
      {resultado >= 0 && folhaPct > 60 && (
        <Alert variant="warn">
          <strong>Folha representa {pct(folhaPct)} da receita.</strong>{' '}
          Limite saudável para agências: 50%. Considere otimizar alocações ou aumentar receita.
        </Alert>
      )}
      {concRisk > 30 && biggestClient && (
        <Alert variant="warn">
          <strong>Risco de concentração:</strong>{' '}
          {biggestClient.name} representa {concRisk.toFixed(1)}% da receita ({BRL(biggestClient.netRevenue)}/mês).
          Diversifique a carteira.
        </Alert>
      )}
      {(defaulters.length > 0 || txOverdue.length > 0) && (
        <Alert variant="warn">
          <strong>Possível inadimplência:</strong>{' '}
          {defaulters.length > 0 && `${defaulters.length} cliente(s) recorrente(s) sem confirmação de pagamento este mês (${BRL(inadRevenue)}). `}
          {txOverdue.length > 0 && `${txOverdue.length} lançamento(s) de receita vencidos (${BRL(overdueRevenue)}).`}
          {' '}<Link href="/receber" className="underline">Ver em Contas a receber →</Link>
        </Alert>
      )}
      {riskClients.length > 0 && (
        <Alert variant="warn">
          <strong>{riskClients.length} cliente(s) com risco alto ou crítico</strong>{' '}
          somam {BRL(riskClients.reduce((s, c) => s + c.netRevenue, 0))}/mês em risco.{' '}
          <Link href="/clientes" className="underline">Ver detalhes →</Link>
        </Alert>
      )}

      {/* ── 3. MAIN GRID: gráfico receita + fluxo pagar×receber ── */}
      <Grid2>
        <Card title={showPipeline ? 'Receita por cliente (ativos + pipeline)' : 'Receita por cliente (top 6)'}
          subtitle={showPipeline ? 'Azul = ativo · Roxo = pipeline' : 'Carteira ativa — líquido mensal'}>
          {topClients.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhum cliente ativo. <Link href="/clientes?new=1" className="text-[#1A6B4A] underline">Adicionar →</Link>
            </div>
          ) : (
            <div>
              {topClients.map(c => (
                <BarRow key={c.id} label={c.name.split(' ').slice(0,2).join(' ')} value={BRL(c.netRevenue)}
                  pct={c.netRevenue / maxRev * 100} color={c.status === 'PIPELINE' ? '#7C3AED' : '#2563EB'} />
              ))}
            </div>
          )}
        </Card>
        <Card title="Fluxo do mês — A pagar × A receber" subtitle="Folha + despesas vs. receita mensal dos clientes ativos">
          <FinanceChart totalPagar={totalCustoMensal} totalReceber={monthlyNet}
            folhaTotal={folhaTotal} despesasLancadas={despesasLancadas}
            pipelineNet={pipelineNet} pipelineCount={pipeline.length} />
        </Card>
      </Grid2>

      {/* ── 4. INADIMPLÊNCIA ── */}
      {(defaulters.length > 0 || txOverdue.length > 0) && (
        <Card title="Inadimplência — clientes sem confirmação de pagamento"
          subtitle={`Mês: ${now.toLocaleString('pt-BR',{month:'long'})} · Clientes recorrentes com vencimento passado e sem registro de pagamento`}
          action={<Link href="/receber" className="text-xs font-medium text-red-600 hover:text-red-700">Gerenciar →</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: 400 }}>
              <thead>
                <tr>
                  {['Cliente','Dia venc.','Receita/mês','Status'].map(h => (
                    <th key={h} className="text-left text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {defaulters.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 bg-red-50/30">
                    <td className="py-2 pr-3 text-xs font-medium text-gray-800">{c.name}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">dia {(c as any).dueDay}</td>
                    <td className="py-2 pr-3 text-right text-xs font-semibold text-red-700 tabular-nums">{BRL(c.netRevenue)}</td>
                    <td className="py-2">
                      <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Sem confirmação
                      </span>
                    </td>
                  </tr>
                ))}
                {txOverdue.map((t, i) => (
                  <tr key={`ov-${i}`} className="border-b border-gray-50 last:border-0 bg-orange-50/30">
                    <td className="py-2 pr-3 text-xs font-medium text-gray-800">{t.client?.name || t.description}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">{new Date(t.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2 pr-3 text-right text-xs font-semibold text-orange-700 tabular-nums">{BRL(t.amount)}</td>
                    <td className="py-2"><span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Vencido</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50">
                  <td colSpan={2} className="py-2 text-xs font-semibold text-gray-600">Total inadimplência estimada</td>
                  <td className="py-2 text-right text-xs font-bold text-red-700 tabular-nums">{BRL(inadRevenue + overdueRevenue)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ── 5. MARGEM UNITÁRIA POR CLIENTE ── */}
      {clientMargins.length > 0 && (
        <Card title="Margem unitária por cliente" subtitle="Custo distribuído proporcionalmente por receita — quanto cada cliente contribui para o resultado">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  {['Cliente','Receita líq.','Custo aloc.','Margem R$','Margem %','Status'].map(h => (
                    <th key={h} className="text-left text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientMargins.map(c => (
                  <tr key={c.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${c.margemPct < 10 ? 'bg-red-50/20' : ''}`}>
                    <td className="py-2.5 pr-3">
                      <p className="text-xs font-medium text-gray-800">{c.name.split(' ').slice(0,3).join(' ')}</p>
                      <p className="text-[9.5px] text-gray-400">{c.isRecurring ? 'Recorrente' : 'Pontual'}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-xs text-gray-600 tabular-nums">{BRL(c.netRevenue)}</td>
                    <td className="py-2.5 pr-3 text-right text-xs text-red-500 tabular-nums">–{BRL(c.custoAlocado)}</td>
                    <td className={`py-2.5 pr-3 text-right text-xs font-semibold tabular-nums ${c.margem >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {c.margem >= 0 ? '+' : ''}{BRL(c.margem)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className={`inline-flex px-2 py-0.5 rounded-full text-[9.5px] font-semibold ${marginBg(c.margemPct)} ${marginColor(c.margemPct)}`}>
                        {c.margemPct.toFixed(1)}%
                      </div>
                    </td>
                    <td className="py-2.5">
                      <Pill label={RISK_LABELS[c.riskLevel]} variant={riskColor[c.riskLevel]} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50">
                  <td className="py-2 text-xs font-semibold text-gray-600">Total</td>
                  <td className="py-2 text-right text-xs font-semibold text-gray-600 tabular-nums">{BRL(monthlyNet)}</td>
                  <td className="py-2 text-right text-xs font-semibold text-red-600 tabular-nums">–{BRL(totalCustoMensal)}</td>
                  <td className={`py-2 text-right text-xs font-bold tabular-nums ${resultado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {resultado >= 0 ? '+' : ''}{BRL(resultado)}
                  </td>
                  <td>
                    <div className={`inline-flex px-2 py-0.5 rounded-full text-[9.5px] font-semibold ${marginBg(marginPct)} ${marginColor(marginPct)}`}>
                      {marginPct.toFixed(1)}%
                    </div>
                  </td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}



      {/* ── 6. FLUXO DE CAIXA PROJETADO 6 MESES ── */}
      <Card title="Projeção de caixa — próximos 6 meses"
        subtitle="Baseado na receita e custo atual. Sem crescimento assumido (cenário conservador).">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th className="text-left text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Mês</th>
                <th className="text-right text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Receita</th>
                <th className="text-right text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Custo</th>
                <th className="text-right text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Saldo mês</th>
                <th className="text-right text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Caixa acumulado</th>
                <th className="text-left text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">Situação</th>
              </tr>
            </thead>
            <tbody>
              {cashflow.map((m, i) => (
                <tr key={i} className={`border-b border-gray-50 last:border-0 ${m.saldo < 0 ? 'bg-red-50/20' : 'hover:bg-gray-50/50'}`}>
                  <td className="py-2.5 pr-3 text-xs font-medium text-gray-700">{m.mes}</td>
                  <td className="py-2.5 pr-3 text-right text-xs text-green-700 tabular-nums font-medium">{BRL(m.receita)}</td>
                  <td className="py-2.5 pr-3 text-right text-xs text-red-500 tabular-nums">–{BRL(m.custo)}</td>
                  <td className={`py-2.5 pr-3 text-right text-xs font-semibold tabular-nums ${m.saldo >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {m.saldo >= 0 ? '+' : ''}{BRL(m.saldo)}
                  </td>
                  <td className={`py-2.5 pr-3 text-right text-xs font-bold tabular-nums ${m.acum >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {m.acum >= 0 ? '+' : ''}{BRL(m.acum)}
                  </td>
                  <td className="py-2.5">
                    <span className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full ${m.saldo >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {m.saldo >= 0 ? 'Superávit' : 'Déficit'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {resultado !== 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50">
                  <td className="py-2 text-xs font-semibold text-gray-600">Total 6 meses</td>
                  <td className="py-2 text-right text-xs font-semibold text-green-700 tabular-nums">{BRL(monthlyNet * 6)}</td>
                  <td className="py-2 text-right text-xs font-semibold text-red-600 tabular-nums">–{BRL(totalCustoMensal * 6)}</td>
                  <td colSpan={1}/>
                  <td className={`py-2 text-right text-xs font-bold tabular-nums ${resultado * 6 >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {resultado * 6 >= 0 ? '+' : ''}{BRL(resultado * 6)}
                  </td>
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {pipeline.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
            <strong>Com pipeline convertido:</strong> resultado seria {BRL(resultadoComPL)}/mês ({BRL(resultadoComPL * 6)} em 6 meses).
            Diferença: {BRL((resultadoComPL - resultado) * 6)} em 6 meses.
          </div>
        )}
      </Card>

      {/* Pipeline detail */}
      {pipeline.length > 0 && (
        <Card title="Possíveis entradas — pipeline"
          subtitle={`${pipeline.length} oportunidade${pipeline.length !== 1 ? 's' : ''} · ${BRL(pipelineNet)}/mês potencial · resultado projetado: ${BRL(resultadoComPL)}/mês`}
          action={<Link href="/clientes?status=PIPELINE" className="text-xs font-medium text-blue-600 hover:text-blue-700">Ver todos →</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: 480 }}>
              <thead><tr>{['Cliente','Serviço','Tipo','Rec. bruta','Rec. líquida','Risco'].map(h=>(<th key={h} className="text-left text-[9px] font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">{h}</th>))}</tr></thead>
              <tbody>
                {[...pipeline].sort((a, b) => b.netRevenue - a.netRevenue).map(c => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="py-2.5 pr-3 text-xs font-medium text-gray-800">{c.name}</td>
                    <td className="py-2.5 pr-3 text-[10.5px] text-gray-500">{SERVICE_TYPE_LABELS[c.serviceType]}</td>
                    <td className="py-2.5 pr-3 text-center"><span className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded-full ${c.isRecurring ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{c.isRecurring ? 'Recorrente' : 'Pontual'}</span></td>
                    <td className="py-2.5 pr-3 text-right text-xs text-gray-600 tabular-nums">{BRL(c.grossRevenue)}</td>
                    <td className="py-2.5 pr-3 text-right"><span className="text-xs font-semibold text-blue-700 tabular-nums">{BRL(c.netRevenue)}</span></td>
                    <td className="py-2.5 text-center"><Pill label={RISK_LABELS[c.riskLevel]} variant={riskColor[c.riskLevel]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href:'/clientes',      label:'Novo cliente',     icon:'👤', color:'bg-blue-50 text-blue-700',    qs:'?new=1' },
          { href:'/colaboradores', label:'Novo colaborador', icon:'👥', color:'bg-green-50 text-green-700',  qs:'' },
          { href:'/metas',         label:'Ver metas',        icon:'🎯', color:'bg-purple-50 text-purple-700', qs:'' },
          { href:'/simulador',     label:'Simular cenário',  icon:'🔮', color:'bg-orange-50 text-orange-700', qs:'' },
        ].map(item => (
          <Link key={item.href+item.qs} href={item.href+item.qs}
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all">
            <span className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center text-base`}>{item.icon}</span>
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
