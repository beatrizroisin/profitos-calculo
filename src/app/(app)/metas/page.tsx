'use client';
import { useState, useEffect } from 'react';
import { Card, Grid4, Grid2, KPICard, BarRow, Alert } from '@/components/ui';
import { BRL, BRLk } from '@/lib/utils';

interface Client { netRevenue:number; grossRevenue:number; status:string; name:string; isRecurring:boolean; }
interface Stats  { totalExpenses:number; totalRevenue:number; clientCount:number; ticketMedio:number; hasData:boolean; }

export default function MetasPage({ searchParams }: { searchParams: { period?: string } }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [custo,   setCusto]   = useState(0);
  const [margem,  setMargem]  = useState(20);
  const [ticket,  setTicket]  = useState(0);

  const period      = searchParams?.period || '30d'; 
  const months      = { 
    '30d': 1,   
    '90d': 3, 
    '6m': 6, 
    '1y': 12, 
    '2y': 24 
  }[period] || 1;

  const periodLabel = { 
    '30d': '30 dias', 
    '90d': '90 dias', 
    '6m': '6 meses', 
    '1y': '1 ano', 
    '2y': '2 anos' 
  }[period] || '30 dias';
  
  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r=>r.json()),
      fetch('/api/company-stats').then(r=>r.json()),
    ]).then(([cData, sData]) => {
      if (Array.isArray(cData)) setClients(cData);
      if (sData && !sData.error) {
        setStats(sData);
        setCusto(Math.round(sData.totalExpenses) || 241856);
        setTicket(Math.round(sData.ticketMedio)  || 9835);
      } else {
        setCusto(241856); setTicket(9835);
      }
    });
  }, []);

  const ativos  = clients.filter(c => c.status === 'ACTIVE');
  const totalLiq= ativos.reduce((s,c)=>s+c.netRevenue,0);
  const recNec  = custo > 0 ? custo / (1 - margem / 100) : 0;
  const cliNec  = ticket > 0 ? Math.ceil(recNec / ticket) : 0;
  const novos   = Math.max(0, cliNec - ativos.length);
  const gap     = Math.max(0, recNec - totalLiq);
  const sorted  = [...ativos].sort((a,b)=>b.netRevenue-a.netRevenue);
  const maxVal  = sorted[0]?.netRevenue || 1;
  const tickets = [5000,8000,10000,15000,20000,30000];
  const inpCls  = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A] tabular";

  return (
    <div className="space-y-5">
      {stats && !stats.hasData && (
        <Alert variant="info">Nenhum lançamento de despesa importado ainda. Usando custo estimado de R$ 241.856. Importe suas contas a pagar para valores reais.</Alert>
      )}
      <Grid4>
        <KPICard label="Clientes ativos"  value={String(ativos.length)} sub={`de ${clients.length} total`} />
        <KPICard label="Ticket médio"     value={BRL(totalLiq/Math.max(ativos.length,1))} sub="média atual" color="blue" />
        <KPICard label="Meta de clientes" value={String(cliNec)} sub={`faltam ${novos} a captar`} color={novos<=5?'amber':'red'} />
        <KPICard label={`Receita meta (${periodLabel})`} value={BRL(recNec*months)} sub={`${BRL(recNec)}/mês · ${margem}% margem`} color="green" />
      </Grid4>
      {gap>0&&<Alert variant="warn"><strong>Gap de {BRL(gap)}/mês.</strong> Em {periodLabel}, acumula {BRL(gap*months)} de déficit.</Alert>}
      <Grid2>
        <Card title="Calculadora de metas" subtitle="Edite os campos — atualiza em tempo real">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Custo fixo mensal (R$)</label>
              <input type="number" className={inpCls} value={custo} onChange={e=>setCusto(Number(e.target.value))} />
              {stats?.hasData && <p className="text-[10px] text-gray-400 mt-1">Calculado de {stats.hasData?'lançamentos reais':'estimativa'}.</p>}
            </div>
            <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Margem de lucro alvo (%)</label><input type="number" min="1" max="80" className={inpCls} value={margem} onChange={e=>setMargem(Number(e.target.value))} /></div>
            <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Ticket médio por cliente (R$)</label><input type="number" min="500" className={inpCls} value={ticket} onChange={e=>setTicket(Number(e.target.value))} /></div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-xs">
              {[['Receita necessária/mês',BRL(recNec),'var(--color-text-primary)'],['Receita necessária ('+periodLabel+')',BRL(recNec*months),'#2563EB'],['Clientes necessários',cliNec+' clientes',cliNec<=ativos.length?'#1A6B4A':'#E67E22'],['Novos a captar',novos+' clientes',novos===0?'#1A6B4A':'#DC3545'],['Gap mensal',BRL(gap),'#DC3545']].map(([l,v,c])=>(
                <div key={l as string} className="flex justify-between"><span className="text-gray-500">{l}</span><span className="font-semibold tabular" style={{color:c as string}}>{v}</span></div>
              ))}
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Clientes necessários por ticket" subtitle={`Para ${BRL(custo)}/mês com ${margem}% de margem`}>
            {tickets.map(t=>{const n=Math.ceil(recNec/t),p=Math.min(100,ativos.length/n*100);return<BarRow key={t} label={`${BRLk(t)}/cliente`} value={`${n} (+${Math.max(0,n-ativos.length)})`} pct={p} color={p>=80?'#1A6B4A':p>=50?'#E67E22':'#DC3545'}/>;}) }
          </Card>
          <Card title="Receita por cliente" subtitle="Ranking atual">
            {sorted.slice(0,8).map((c,i)=><BarRow key={i} label={c.name.split(' ').slice(0,2).join(' ')} value={BRL(c.netRevenue)} pct={c.netRevenue/maxVal*100} color="#2563EB"/>)}
          </Card>
        </div>
      </Grid2>
    </div>
  );
}
