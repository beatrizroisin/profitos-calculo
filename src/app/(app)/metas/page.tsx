'use client';
import { useState, useEffect } from 'react';
import { Card, Grid4, Grid2, KPICard, BarRow, Alert } from '@/components/ui';
import { BRL, BRLk } from '@/lib/utils';

export default function MetasPage({ searchParams }: { searchParams: { period?: string } }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para o simulador (valores iniciais vêm da API)
  const [custo, setCusto] = useState(0);
  const [margem, setMargem] = useState(20);
  const [ticket, setTicket] = useState(0);

  const period = searchParams?.period || '30d';
  const months = ({ '90d': 3, '6m': 6, '1y': 12, '2y': 24 } as Record<string, number>)[period] || 1;
  const periodLabel = ({ '30d': '30 dias', '60d': '60 dias', '90d': '90 dias', '6m': '6 meses', '1y': '1 ano', '2y': '2 anos' } as Record<string, string>)[period] || '30 dias';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch('/api/company-stats');
        const data = await res.json();
        if (!data.error) {
          setStats(data);
          // Sincroniza o simulador com os dados REAIS da API
          setCusto(Math.round(data.totalCustoMensal));
          setTicket(Math.round(data.ticketMedio));
        }
      } catch (e) {
        console.error("Erro ao buscar stats", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Cálculos do simulador (Reativos)
  const recNec = custo > 0 ? custo / (1 - margem / 100) : 0;
  const cliNec = ticket > 0 ? Math.ceil(recNec / ticket) : 0;
  const ativosCount = stats?.clientCount || 0;
  const novos = Math.max(0, cliNec - ativosCount);
  const totalLiqAtual = stats?.totalRevenue || 0;
  const gap = Math.max(0, recNec - totalLiqAtual);

  const ticketsSimulacao = [5000, 8000, 10000, 15000, 20000, 30000];
  const inpCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A] tabular";

  if (loading) return <div className="p-10 text-center text-gray-400">Calculando metas com dados reais...</div>;

  return (
    <div className="space-y-5">
      {!stats?.hasExpenseData && (
        <Alert variant="info">Lance seus custos no financeiro para automatizar esta página.</Alert>
      )}

      <Grid4>
        <KPICard label="Clientes ativos" value={String(ativosCount)} sub="base atual" />
        <KPICard label="Ticket médio atual" value={BRL(stats?.ticketMedio || 0)} color="blue" />
        <KPICard label="Meta de clientes" value={String(cliNec)} sub={`faltam ${novos}`} color={novos <= 2 ? 'green' : 'amber'} />
        <KPICard label={`Meta Bruta (${periodLabel})`} value={BRL(recNec * months)} sub={`${margem}% de margem alvo`} color="green" />
      </Grid4>

      {gap > 0 && (
        <Alert variant="warn">
          <strong>Gap de faturamento:</strong> Você precisa de mais {BRL(gap)}/mês para atingir a margem de {margem}%.
        </Alert>
      )}

      <Grid2>
        <Card title="Simulador de Metas" subtitle="Ajuste os valores para simular cenários">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Custo Mensal Real (R$)</label>
              <input type="number" className={inpCls} value={custo} onChange={e => setCusto(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Margem Alvo (%)</label>
              <input type="number" className={inpCls} value={margem} onChange={e => setMargem(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Ticket Médio Alvo (R$)</label>
              <input type="number" className={inpCls} value={ticket} onChange={e => setTicket(Number(e.target.value))} />
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between"><span>Receita necessária/mês</span><span className="font-bold">{BRL(recNec)}</span></div>
              <div className="flex justify-between"><span>Clientes necessários</span><span className="font-bold">{cliNec} un</span></div>
              <div className="flex justify-between text-red-600"><span>Gap de Receita</span><span className="font-bold">{BRL(gap)}</span></div>
            </div>
          </div>
        </Card>

        <Card title="Esforço por Ticket" subtitle="Quantos clientes você precisaria se o ticket fosse:">
          <div className="space-y-1">
            {ticketsSimulacao.map(t => {
              const n = Math.ceil(recNec / t);
              const p = Math.min(100, (ativosCount / n) * 100);
              return (
                <BarRow 
                  key={t} 
                  label={`${BRLk(t)}/mês`} 
                  value={`${n} cli`} 
                  pct={p} 
                  color={p >= 100 ? '#1A6B4A' : '#2563EB'} 
                />
              );
            })}
          </div>
        </Card>
      </Grid2>
    </div>
  );
}