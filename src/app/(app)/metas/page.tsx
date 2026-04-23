'use client';
import { useState, useEffect } from 'react';
import { Card, Grid4, Grid2, KPICard, BarRow, Alert } from '@/components/ui';
import { BRL, BRLk } from '@/lib/utils';

interface Client { netRevenue: number; grossRevenue: number; status: string; name: string; isRecurring: boolean; }
interface Stats { monthlyExpense: number; totalRevenue: number; clientCount: number; ticketMedio: number; hasExpenseData: boolean; resultado: number; folhaTotal: number; totalCustoMensal: number; despesasLancadas: number; }
interface Transaction { type: 'INCOME' | 'EXPENSE'; amount: number; status: string; }

export default function MetasPage({ searchParams }: { searchParams: { period?: string } }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [custo, setCusto] = useState(0);
  const [margem, setMargem] = useState(20);
  const [ticket, setTicket] = useState(0);
  const [loading, setLoading] = useState(true);

  const period = searchParams?.period || '30d';
  const months = ({ '90d': 3, '6m': 6, '1y': 12, '2y': 24 } as Record<string, number>)[period] || 3;
  const periodLabel = ({ '30d': '30 dias', '60d': '60 dias', '90d': '90 dias', '6m': '6 meses', '1y': '1 ano', '2y': '2 anos' } as Record<string, string>)[period] || '30 dias';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/company-stats').then(r => r.json()),
      fetch('/api/transactions').then(r => r.json()), // Integração com o financeiro
    ]).then(([cData, sData, tData]) => {
      if (Array.isArray(cData)) setClients(cData);
      
      let custoReal = 0;

      // 1. Tenta pegar o custo das transações reais (Contas a Pagar)
      if (tData?.transactions) {
        const transacoesSaida = tData.transactions
          .filter((t: Transaction) => t.type === 'EXPENSE')
          .reduce((acc: number, t: Transaction) => acc + t.amount, 0);
        custoReal = transacoesSaida;
      }

      if (sData && !sData.error) {
        setStats(sData);
        // Se não houver transações, usa o backup dos stats (folha/custo mensal)
        const baseCusto = custoReal > 0 
          ? custoReal 
          : (sData.totalCustoMensal || sData.folhaTotal || 0);
        
        setCusto(Math.round(baseCusto));
        setTicket(Math.round(sData.ticketMedio) || 0);
      }
      setLoading(false);
    });
  }, []);

  // Cálculos de Metas baseados no custo integrado
  const ativos = clients.filter(c => c.status === 'ACTIVE');
  const totalLiq = ativos.reduce((s, c) => s + c.netRevenue, 0);
  
  // Receita necessária para cobrir o custo + margem desejada
  const recNec = custo > 0 ? custo / (1 - margem / 100) : 0;
  const cliNec = ticket > 0 ? Math.ceil(recNec / ticket) : 0;
  const novos = Math.max(0, cliNec - ativos.length);
  const gap = Math.max(0, recNec - totalLiq);
  
  const sorted = [...ativos].sort((a, b) => b.netRevenue - a.netRevenue);
  const maxVal = sorted[0]?.netRevenue || 1;
  const tickets = [5000, 8000, 10000, 15000, 20000, 30000];
  const inpCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A] tabular";

  if (loading) return <div className="p-10 text-center text-gray-400">Calculando metas financeiras...</div>;

  return (
    <div className="space-y-5">
      {/* Alerta de Custo Real vs Estimado */}
      {custo === 0 && (
        <Alert variant="info">
          Lance suas contas em <strong>Contas a Pagar</strong> para que a meta de faturamento seja calculada automaticamente.
        </Alert>
      )}

      <Grid4>
        <KPICard label="Clientes ativos" value={String(ativos.length)} sub={`de ${clients.length} total`} />
        <KPICard label="Ticket médio" value={BRL(totalLiq / Math.max(ativos.length, 1))} sub="média atual" color="blue" />
        <KPICard label="Meta de clientes" value={String(cliNec)} sub={`faltam ${novos} a captar`} color={novos <= 5 ? 'amber' : 'red'} />
        <KPICard label={`Receita meta (${periodLabel})`} value={BRL(recNec * months)} sub={`${BRL(recNec)}/mês · ${margem}% margem`} color="green" />
      </Grid4>

      {gap > 0 && (
        <Alert variant="warn">
          <strong>Gap de {BRL(gap)}/mês.</strong> Para atingir {margem}% de margem, você precisa de mais {BRL(gap)} em contratos mensais.
        </Alert>
      )}

      <Grid2>
        <Card title="Simulador de Metas" subtitle="Baseado nos custos reais do financeiro">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Custo fixo mensal real (R$)</label>
              <input type="number" className={inpCls} value={custo} onChange={e => setCusto(Number(e.target.value))} />
              <p className="text-[10px] text-gray-400 mt-1">Soma de todas as despesas e folha lançadas no sistema.</p>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Margem de lucro alvo (%)</label>
              <input type="number" min="1" max="80" className={inpCls} value={margem} onChange={e => setMargem(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Ticket médio planejado (R$)</label>
              <input type="number" min="500" className={inpCls} value={ticket} onChange={e => setTicket(Number(e.target.value))} />
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-xs">
              {[
                ['Receita necessária/mês', BRL(recNec), 'var(--color-text-primary)'],
                ['Receita necessária (' + periodLabel + ')', BRL(recNec * months), '#2563EB'],
                ['Clientes necessários', cliNec + ' clientes', cliNec <= ativos.length ? '#1A6B4A' : '#E67E22'],
                ['Novos a captar', novos + ' clientes', novos === 0 ? '#1A6B4A' : '#DC3545'],
                ['Gap mensal', BRL(gap), '#DC3545']
              ].map(([l, v, c]) => (
                <div key={l as string} className="flex justify-between">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-semibold tabular" style={{ color: c as string }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Esforço por faixa de Ticket" subtitle={`Para cobrir ${BRL(custo)}/mês`}>
            {tickets.map(t => {
              const n = Math.ceil(recNec / t);
              const p = Math.min(100, (ativos.length / n) * 100);
              return (
                <BarRow 
                  key={t} 
                  label={`${BRLk(t)}/cli`} 
                  value={`${n} un`} 
                  pct={p} 
                  color={p >= 80 ? '#1A6B4A' : p >= 50 ? '#E67E22' : '#DC3545'} 
                />
              );
            })}
          </Card>
          <Card title="Ranking de Faturamento" subtitle="Top 8 clientes ativos">
            {sorted.slice(0, 8).map((c, i) => (
              <BarRow 
                key={i} 
                label={c.name.split(' ').slice(0, 2).join(' ')} 
                value={BRL(c.netRevenue)} 
                pct={(c.netRevenue / maxVal) * 100} 
                color="#2563EB" 
              />
            ))}
          </Card>
        </div>
      </Grid2>
    </div>
  );
}