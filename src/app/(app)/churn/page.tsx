'use client';
import { useState, useEffect } from 'react';
import { Card, Grid4, Grid2, KPICard, Alert } from '@/components/ui';
import { BRL } from '@/lib/utils';

interface Client { id:string;name:string;netRevenue:number;riskLevel:string;status:string;serviceType:string; }

export default function ChurnPage({ searchParams }: { searchParams: { period?: string } }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [churnPct, setChurnPct] = useState(5);
  const [cliCount, setCliCount] = useState(0);
  const [ticket,   setTicket]   = useState(0);
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
    fetch('/api/clients').then(r=>r.json()).then(data=>{
      if(!Array.isArray(data)) return;
      setClients(data);
      const a=data.filter((c:Client)=>c.status==='ACTIVE');
      setCliCount(a.length);
      if(a.length>0) setTicket(Math.round(a.reduce((s:number,c:Client)=>s+c.netRevenue,0)/a.length));
    });
  },[]);

  const rate=churnPct/100, perdMes=Math.round(cliCount*rate), recPerd=perdMes*ticket;
  let cN=cliCount; for(let i=0;i<months;i++) cN=Math.max(0,cN-Math.round(cN*rate));
  const rN=cN*ticket, ltv=rate>0?Math.round(ticket/rate):ticket*24;
  const riscos=clients.filter(c=>c.riskLevel==='HIGH'||c.riskLevel==='CRITICAL');
  const RISK: Record<string,string>={LOW:'Baixo',MEDIUM:'Médio',HIGH:'Alto',CRITICAL:'Crítico'};
  const inp="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A] tabular";

  return (
    <div className="space-y-5">
      <Grid4>
        <KPICard label="Churn simulado"  value={`${churnPct}%/mês`} color={churnPct>10?'red':churnPct>5?'amber':'green'} />
        <KPICard label="Clientes em risco" value={String(riscos.length)} sub="alto e crítico" color="amber" />
        <KPICard label={`Clientes em ${periodLabel}`} value={String(cN)} sub={`de ${cliCount} atuais`} color={cN<cliCount*0.7?'red':'amber'} />
        <KPICard label="LTV médio" value={BRL(ltv)} sub={`com ${churnPct}% de churn`} color={churnPct<5?'green':'amber'} />
      </Grid4>
      {churnPct>=10&&<Alert variant="danger"><strong>Churn crítico de {churnPct}%!</strong> Em {periodLabel} restarão apenas {cN} clientes gerando {BRL(rN)}/mês.</Alert>}
      <Grid2>
        <Card title="Simulador de churn" subtitle="Campos editáveis — projeção em tempo real">
          <div className="space-y-4">
            <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Taxa de churn mensal (%)</label><input type="number" min="0" max="100" step="0.5" className={inp} value={churnPct} onChange={e=>setChurnPct(Number(e.target.value))}/><p className="text-[10px] text-gray-400 mt-1">Saudável &lt;3% · Atenção 3–8% · Crítico &gt;10%</p></div>
            <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Clientes na carteira</label><input type="number" min="1" className={inp} value={cliCount} onChange={e=>setCliCount(Number(e.target.value))}/></div>
            <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Ticket médio líquido (R$)</label><input type="number" min="0" step="500" className={inp} value={ticket} onChange={e=>setTicket(Number(e.target.value))}/></div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-xs">
              {[['Clientes perdidos/mês',String(perdMes),'#DC3545'],['Receita perdida/mês',BRL(recPerd),'#DC3545'],['Clientes em '+periodLabel,String(cN),cN<cliCount*0.7?'#DC3545':'#E67E22'],['Receita em '+periodLabel,BRL(rN),rN<ticket*cliCount*0.8?'#DC3545':'#E67E22'],['LTV médio',BRL(ltv),'var(--color-text-primary)']].map(([l,v,c])=>(
                <div key={l as string} className="flex justify-between"><span className="text-gray-500">{l}</span><span className="font-semibold tabular" style={{color:c as string}}>{v}</span></div>
              ))}
            </div>
          </div>
        </Card>
        <Card title="Clientes em alerta de risco" subtitle="Alto e crítico dos cadastros">
          {riscos.length===0?<div className="text-center py-8 text-sm text-gray-400">Nenhum cliente de alto risco.</div>:riscos.map(c=>(
            <div key={c.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div><p className="text-xs font-medium text-gray-800">{c.name.slice(0,30)}</p><p className="text-[10px] text-orange-600">{RISK[c.riskLevel]}</p></div>
              <span className="text-xs font-medium text-red-600 tabular">{BRL(c.netRevenue)}</span>
            </div>
          ))}
        </Card>
      </Grid2>
    </div>
  );
}
