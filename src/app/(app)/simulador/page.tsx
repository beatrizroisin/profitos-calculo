'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, Grid2 } from '@/components/ui';
import { BRL } from '@/lib/utils';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

type SimId = 'contratar' | 'demitir' | 'cliente' | 'investir' | 'crescer';
const TABS: [SimId, string][] = [
  ['contratar','Contratar'],['demitir','Demitir'],['cliente','Perder cliente'],
  ['investir','Investimento'],['crescer','Crescimento'],
];
const INP = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A]';
const LBL = 'block text-[9.5px] font-medium text-gray-400 uppercase tracking-wider mb-1.5';

export default function SimuladorPage({ searchParams }: { searchParams: { period?: string } }) {
  const period = searchParams?.period || '30d';
  const months = Math.min(
    { '30d': 1, '90d': 3, '6m': 6, '1y': 12, '2y': 24 }[period] || 1, 
    12
  );
  const [tab,     setTab]     = useState<SimId>('contratar');
  const [v1,      setV1]      = useState(6000);
  const [v2,      setV2]      = useState(1);
  const [tipo,    setTipo]    = useState(1.15);
  const [cliSel,  setCliSel]  = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [base,    setBase]    = useState(-45150);
  const [totalRev,setTotalRev]= useState(196706);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart|null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.ok ? r.json() : []),
      fetch('/api/company-stats').then(r => r.ok ? r.json() : {}),
    ]).then(([cData, sData]) => {
      if (Array.isArray(cData)) setClients(cData.filter((c: any) => c.status === 'ACTIVE'));
      if (sData?.totalRevenue !== undefined) {
        setBase(sData.totalRevenue - sData.totalExpenses);
        setTotalRev(sData.totalRevenue);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Rebuild chart after every relevant state change
  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(drawChart);
    return () => { cancelAnimationFrame(raf); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, v1, v2, tipo, months, base, loading]);

  function drawChart() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    chartRef.current?.destroy();
    chartRef.current = null;
    const n = months;
    const labels = Array.from({length:n}, (_,i) => `Mês ${i+1}`);
    let sim: number[] = [];
    const b = base;
    if (tab==='contratar') sim = Array.from({length:n}, (_,i) => Math.round(b - (i >= v2-1 ? v1*tipo : 0)));
    else if (tab==='demitir') sim = Array.from({length:n}, (_,i) => Math.round(b + (i >= v2 ? v1*tipo : 0)));
    else if (tab==='cliente') sim = Array.from({length:n}, (_,i) => Math.round(b - (i >= v2-1 ? v1 : 0)));
    else if (tab==='investir') sim = Array.from({length:n}, (_,i) => Math.round(b - v1 + (i+1)*v2));
    else sim = Array.from({length:n}, () => Math.round(b + v1*v2));
    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets: [
        { label:'Atual',    data: Array(n).fill(b),  borderColor:'#1A6B4A', backgroundColor:'rgba(26,107,74,.07)', tension:.4, pointRadius:3, fill:true },
        { label:'Simulado', data: sim, borderColor:'#DC3545', backgroundColor:'rgba(220,53,69,.06)', tension:.4, pointRadius:3, borderDash:[5,3], fill:true },
      ]},
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>c.dataset.label+': '+BRL(c.raw as number)}} },
        scales:{
          x:{ grid:{display:false}, ticks:{color:'#9CA3AF',font:{size:10}} },
          y:{ grid:{color:'rgba(0,0,0,.04)'}, ticks:{color:'#9CA3AF',font:{size:10}, callback:v=>BRL(v as number)} },
        },
      },
    });
  }

  function switchTab(id: SimId) {
    chartRef.current?.destroy(); chartRef.current = null;
    setTab(id);
    if (id==='crescer') { setV1(3); setV2(9835); }
    else if (id==='investir') { setV1(45000); setV2(15000); }
    else { setV1(6000); setV2(1); }
    setCliSel('');
  }

  const b = base, tr = Math.max(totalRev, 1);

  function getRows(): [string,string,string][] {
    if (tab==='contratar') {
      const c=v1*tipo;
      return [[`Custo/mês (×${tipo.toFixed(2)})`,BRL(c),'text-red-600'],['Novo resultado/mês',BRL(b-c),b-c>0?'text-green-700':'text-red-600'],['Clientes para cobrir',Math.ceil(c/(tr/Math.max(clients.length,1)))+' clientes','text-amber-600']];
    }
    if (tab==='demitir') {
      const e=v1*tipo;
      return [['Economia mensal',BRL(e),'text-green-700'],['Custo período de aviso',BRL(v1*v2),'text-red-600'],['Resultado após desligamento',BRL(b+e),b+e>0?'text-green-700':'text-red-600']];
    }
    if (tab==='cliente') {
      const p=(v1/tr*100).toFixed(1);
      return [[`% receita perdida`,p+'%',+p>30?'text-red-600':'text-amber-600'],['Impacto mensal',BRL(-v1),'text-red-600'],['Novo resultado/mês',BRL(b-v1),'text-red-600']];
    }
    if (tab==='investir') {
      const pb=v2>0?Math.ceil(v1/v2):999;
      return [['Investimento',BRL(-v1),'text-red-600'],['Retorno/mês',BRL(v2),'text-green-700'],['Payback',pb<=months?pb+' meses':'>'+months+'m',pb<=3?'text-green-700':pb<=months?'text-amber-600':'text-red-600']];
    }
    const add=v1*v2;
    return [['Receita adicional/mês',BRL(add),'text-green-700'],['Novo resultado/mês',BRL(b+add),b+add>0?'text-green-700':'text-red-600'],['Margem projetada',((b+add)/(tr+add)*100).toFixed(1)+'%',b+add>0?'text-green-700':'text-amber-600']];
  }

  function getAlert(): {t:'ok'|'warn'|'danger'; msg:string}|null {
    if (tab==='contratar') { const r=b-v1*tipo; return r>0?{t:'ok',msg:'Viável — resultado positivo após a contratação.'}:{t:'danger',msg:'Não recomendado — aprofunda o déficit atual.'}; }
    if (tab==='demitir') { const r=b+v1*tipo; return r>0?{t:'ok',msg:'Equilibra o caixa após o desligamento.'}:{t:'warn',msg:'Déficit persiste mesmo após o desligamento.'}; }
    if (tab==='cliente') { const p=v1/tr*100; return p>30?{t:'danger',msg:`Perda de ${p.toFixed(1)}% da receita — risco crítico.`}:{t:'warn',msg:`Perda de ${p.toFixed(1)}% — substitua em 60 dias.`}; }
    if (tab==='investir') { const pb=v2>0?Math.ceil(v1/v2):999; if(pb<=3)return{t:'ok',msg:`Payback em ${pb} meses — excelente.`}; if(pb<=months)return{t:'warn',msg:`Payback em ${pb} meses — viável com disciplina.`}; return{t:'danger',msg:'Payback acima do período — risco elevado.'}; }
    const add=v1*v2; return b+add>0?{t:'ok',msg:`Com ${v1} novos clientes: ${BRL(b+add)}/mês.`}:{t:'warn',msg:'Ainda insuficiente para cobrir os custos.'};
  }

  const al = getAlert();
  if (loading) return <div className="text-center py-16 text-sm text-gray-400">Carregando dados financeiros...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Simulador estratégico</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Projetando <strong className="text-gray-600">{months} meses</strong> · Resultado atual:&nbsp;
          <strong className={b>=0?'text-green-700':'text-red-600'}>{BRL(b)}/mês</strong>
        </p>
      </div>
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 border border-gray-100 w-fit">
        {TABS.map(([id,lbl])=>(
          <button key={id} onClick={()=>switchTab(id)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab===id?'bg-white text-gray-800 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {lbl}
          </button>
        ))}
      </div>
      <Grid2>
        <Card title={TABS.find(t=>t[0]===tab)?.[1]||''} subtitle="Campos editáveis — impacto calculado em tempo real">
          <div className="space-y-4">
            {tab==='contratar'&&<>
              <div><label className={LBL}>Salário / honorário (R$)</label><input type="number" min="0" step="500" className={INP} value={v1} onChange={e=>setV1(+e.target.value)}/></div>
              <div><label className={LBL}>Tipo de contratação</label>
                <select className={INP} value={tipo} onChange={e=>setTipo(+e.target.value)}>
                  <option value={1.15}>PJ — +15% encargos</option>
                  <option value={1.70}>CLT — +70% encargos totais</option>
                </select>
              </div>
              <div><label className={LBL}>Mês de início (1–{months})</label><input type="number" min="1" max={months} className={INP} value={v2} onChange={e=>setV2(Math.min(months,Math.max(1,+e.target.value)))}/></div>
            </>}
            {tab==='demitir'&&<>
              <div><label className={LBL}>Honorário / salário atual (R$)</label><input type="number" min="0" step="500" className={INP} value={v1} onChange={e=>setV1(+e.target.value)}/></div>
              <div><label className={LBL}>Tipo de vínculo</label>
                <select className={INP} value={tipo} onChange={e=>setTipo(+e.target.value)}>
                  <option value={1.15}>PJ</option><option value={1.70}>CLT</option>
                </select>
              </div>
              <div><label className={LBL}>Meses de aviso prévio (0–3)</label><input type="number" min="0" max="3" className={INP} value={v2} onChange={e=>setV2(Math.min(3,Math.max(0,+e.target.value)))}/></div>
            </>}
            {tab==='cliente'&&<>
              <div><label className={LBL}>Selecionar cliente existente</label>
                <select className={INP} value={cliSel} onChange={e=>{setCliSel(e.target.value);const c=clients.find((cl:any)=>cl.id===e.target.value);if(c)setV1(Math.round(c.netRevenue));}}>
                  <option value="">— Digitar valor manualmente —</option>
                  {clients.map((c:any)=><option key={c.id} value={c.id}>{c.name.slice(0,28)} — {BRL(c.netRevenue)}</option>)}
                </select>
              </div>
              <div><label className={LBL}>Receita mensal (R$)</label><input type="number" min="0" step="500" className={INP} value={v1} onChange={e=>{setV1(+e.target.value);setCliSel('');}}/></div>
              <div><label className={LBL}>Mês em que ocorre (1–{months})</label><input type="number" min="1" max={months} className={INP} value={v2} onChange={e=>setV2(Math.min(months,Math.max(1,+e.target.value)))}/></div>
            </>}
            {tab==='investir'&&<>
              <div><label className={LBL}>Valor do investimento (R$)</label><input type="number" min="0" step="1000" className={INP} value={v1} onChange={e=>setV1(+e.target.value)}/></div>
              <div><label className={LBL}>Retorno mensal esperado (R$)</label><input type="number" min="0" step="500" className={INP} value={v2} onChange={e=>setV2(+e.target.value)}/></div>
            </>}
            {tab==='crescer'&&<>
              <div><label className={LBL}>Novos clientes a captar</label><input type="number" min="1" step="1" className={INP} value={v1} onChange={e=>setV1(Math.max(1,+e.target.value))}/></div>
              <div><label className={LBL}>Ticket médio líquido (R$)</label><input type="number" min="0" step="500" className={INP} value={v2} onChange={e=>setV2(+e.target.value)}/></div>
            </>}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              {getRows().map(([l,v,c])=>(
                <div key={l} className="flex justify-between text-xs py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{l}</span>
                  <span className={`font-semibold tabular-nums ${c}`}>{v}</span>
                </div>
              ))}
            </div>
            {al&&(
              <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${al.t==='ok'?'bg-green-50 border-green-200 text-green-800':al.t==='warn'?'bg-orange-50 border-orange-200 text-orange-800':'bg-red-50 border-red-200 text-red-800'}`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${al.t==='ok'?'bg-green-500':al.t==='warn'?'bg-orange-500':'bg-red-500'}`}/>
                {al.msg}
              </div>
            )}
          </div>
        </Card>
        <Card title={`Impacto no caixa — ${months} meses`} subtitle="Verde = situação atual · Vermelho pontilhado = cenário simulado">
          <div className="flex gap-4 mb-4">
            {[{c:'#1A6B4A',l:'Atual'},{c:'#DC3545',l:'Simulado'}].map(i=>(
              <span key={i.l} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:i.c}}/>{i.l}
              </span>
            ))}
          </div>
          <div className="relative w-full" style={{height:280}}>
            <canvas ref={canvasRef}/>
          </div>
        </Card>
      </Grid2>
    </div>
  );
}
