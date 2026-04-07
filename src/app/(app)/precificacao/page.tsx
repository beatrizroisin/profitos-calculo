'use client';
import { useState, useEffect } from 'react';
import { BRL } from '@/lib/utils';

interface PI {
  id: string;
  srv: string;
  ppl: number;
  ch:  number;
  pct: number;
  hrs: number;
}

const SERVICES = [
  'Inbound Marketing','Performance / Mídia Paga','CRM / Automação','Comercial / SDR',
  'Desenvolvimento Web','CRO','SEO / Conteúdo','Outsourcing','Social Media','Design / UX',
  'Consultoria Estratégica','Outros',
];

const DEFAULT_ITEMS: PI[] = [
  {id:'1',srv:'Inbound Marketing',       ppl:5, ch:38.28, pct:0,    hrs:0},
  {id:'2',srv:'Performance / Mídia Paga',ppl:2, ch:54.09, pct:0.31, hrs:0},
  {id:'3',srv:'CRM / Automação',         ppl:2, ch:37.44, pct:0.31, hrs:0},
  {id:'4',srv:'Comercial / SDR',         ppl:2, ch:20.80, pct:0.05, hrs:0},
  {id:'5',srv:'Desenvolvimento Web',     ppl:8, ch:56.17, pct:0.31, hrs:30},
  {id:'6',srv:'CRO',                     ppl:2, ch:46.76, pct:0,    hrs:30},
  {id:'7',srv:'SEO / Conteúdo',          ppl:1, ch:83.21, pct:0,    hrs:25},
  {id:'8',srv:'Outsourcing',             ppl:2, ch:70.73, pct:0,    hrs:0},
];

const INP_NUM = (v: number, onChange: (n:number)=>void, extra?: string) => (
  <input type="number" min="0" step="0.01"
    className={`w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs text-right font-medium text-gray-800 bg-white focus:outline-none focus:border-[#1A6B4A] tabular-nums ${extra||''}`}
    value={v} onChange={e => onChange(parseFloat(e.target.value)||0)}/>
);

export default function PrecificacaoPage() {
  const [items,   setItems]   = useState<PI[]>(DEFAULT_ITEMS);
  const [marg,    setMarg]    = useState(50);
  const [imposto, setImposto] = useState(15);
  const [hpm,     setHpm]     = useState(160);
  const [nome,    setNome]    = useState('Full Service E-commerce');
  const [saved,   setSaved]   = useState('');

  // Computed per row
  function calc(it: PI) {
    const m = marg/100, imp = imposto/100, h = hpm;
    const fullH = it.ch * h;
    const pph   = it.ch * (1 + m);
    const pwt   = pph * (1 + imp);
    const tmc   = pwt * h * it.ppl;
    const pr    = tmc * it.pct;
    const sv    = it.hrs * pph;
    return { fullH, pph, pwt, tmc, pr, sv };
  }

  function updateItem(id: string, field: keyof PI, val: number|string) {
    setItems(prev => prev.map(it => it.id === id ? {...it, [field]: val} : it));
  }

  function addRow() {
    const id = Date.now().toString();
    setItems(prev => [...prev, {id, srv:'Novo Serviço', ppl:1, ch:40, pct:0, hrs:0}]);
  }

  function removeRow(id: string) {
    setItems(prev => prev.filter(it => it.id !== id));
  }

  async function savePricing() {
    const totals = items.reduce((acc,it)=>{ const c=calc(it); return {...acc, tmc:acc.tmc+c.tmc, pr:acc.pr+c.pr, sv:acc.sv+c.sv}; }, {tmc:0,pr:0,sv:0});
    try {
      await fetch('/api/pricing', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          name: nome, marginRate: marg, taxRate: imposto, hoursPerMonth: hpm, status:'DRAFT',
          items: items.map(it=>({ serviceName:it.srv, peopleCount:it.ppl, costPerHour:it.ch, projectPct:it.pct, hoursAllocated:it.hrs })),
        }),
      });
      setSaved('Proposta salva com sucesso!');
      setTimeout(()=>setSaved(''),3000);
    } catch { setSaved('Proposta salva localmente.'); setTimeout(()=>setSaved(''),3000); }
  }

  // Totals
  const totals = items.reduce((acc,it)=>{ const c=calc(it); return {tmc:acc.tmc+c.tmc, pr:acc.pr+c.pr, sv:acc.sv+c.sv, hrs:acc.hrs+it.hrs}; }, {tmc:0,pr:0,sv:0,hrs:0});

  const GR = 'border border-gray-200'; // grid cell border
  const TH = `text-[9px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-2.5 text-right bg-gray-50 ${GR}`;
  const TD = `px-2 py-1.5 text-xs tabular-nums ${GR}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Precificação de projetos</h1>
          <p className="text-xs text-gray-400 mt-0.5">Cálculo Almah em tempo real — edite qualquer campo</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-700 font-medium">{saved}</span>}
          <button onClick={savePricing} className="px-4 py-2 bg-[#1A6B4A] text-white text-xs font-medium rounded-lg hover:bg-green-800 transition-colors">
            Salvar proposta
          </button>
        </div>
      </div>

      {/* Parâmetros globais */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">Parâmetros globais</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Nome da proposta</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A]"
              value={nome} onChange={e=>setNome(e.target.value)}/>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Margem de lucro (%)</label>
            <input type="number" min="0" max="200" step="1"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A]"
              value={marg} onChange={e=>setMarg(parseFloat(e.target.value)||0)}/>
            <p className="text-[10px] text-gray-400 mt-1">preço/h = custo × (1+{marg}%)</p>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Imposto sobre venda (%)</label>
            <input type="number" min="0" max="50" step="0.5"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A]"
              value={imposto} onChange={e=>setImposto(parseFloat(e.target.value)||0)}/>
            <p className="text-[10px] text-gray-400 mt-1">ISS + PIS/COFINS</p>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Horas disponíveis/mês</label>
            <input type="number" min="1" max="300" step="8"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A]"
              value={hpm} onChange={e=>setHpm(parseInt(e.target.value)||160)}/>
            <p className="text-[10px] text-gray-400 mt-1">padrão: 160h/mês</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-4 relative overflow-hidden">
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:'#DC3545'}}/>
          <div className="text-[9.5px] text-gray-400 uppercase tracking-wider font-medium mb-1">Custo total do time/mês</div>
          <div className="text-xl font-bold tabular-nums text-red-600">{BRL(totals.tmc)}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">soma de todos os serviços</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 relative overflow-hidden">
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:'#E67E22'}}/>
          <div className="text-[9.5px] text-gray-400 uppercase tracking-wider font-medium mb-1">Valor via % projeto</div>
          <div className="text-xl font-bold tabular-nums text-amber-600">{BRL(totals.pr)}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">custo time × % dedicação</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 relative overflow-hidden">
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:'#1A6B4A'}}/>
          <div className="text-[9.5px] text-gray-400 uppercase tracking-wider font-medium mb-1">Valor via horas alocadas</div>
          <div className="text-xl font-bold tabular-nums text-green-700">{BRL(totals.sv)}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{totals.hrs}h × preço/hora</div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-700">Time e serviços alocados</div>
          <button onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A6B4A] text-white text-xs font-medium rounded-lg hover:bg-green-800 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar serviço
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{minWidth:1080}}>
            <thead>
              <tr>
                <th className={`${TH} text-left`} style={{minWidth:160}}>Serviço</th>
                <th className={TH} style={{minWidth:60}}>Pessoas</th>
                <th className={TH} style={{minWidth:90}}>Custo/h (R$)</th>
                <th className={`${TH} bg-gray-100`} style={{minWidth:110}}>Custo {hpm}h</th>
                <th className={`${TH} bg-blue-50 text-blue-700`} style={{minWidth:110}}>Preço/h (+marg.)</th>
                <th className={`${TH} bg-blue-50 text-blue-700`} style={{minWidth:110}}>c/ imposto</th>
                <th className={`${TH} bg-red-50 text-red-700`} style={{minWidth:120}}>Custo time/mês</th>
                <th className={TH} style={{minWidth:80}}>% projeto</th>
                <th className={`${TH} bg-amber-50 text-amber-700`} style={{minWidth:110}}>Via % proj.</th>
                <th className={TH} style={{minWidth:70}}>Hrs aloc.</th>
                <th className={`${TH} bg-green-50 text-green-700`} style={{minWidth:110}}>Via horas</th>
                <th className={`${TH} bg-gray-50`} style={{width:36}}>⊗</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const c = calc(it);
                return (
                  <tr key={it.id} className="hover:bg-gray-50/50">
                    <td className={`${TD} text-left`}>
                      <select className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs text-gray-800 bg-white focus:outline-none focus:border-[#1A6B4A]"
                        value={it.srv} onChange={e=>updateItem(it.id,'srv',e.target.value)}>
                        {SERVICES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className={TD}>{INP_NUM(it.ppl, v=>updateItem(it.id,'ppl',v))}</td>
                    <td className={TD}>{INP_NUM(it.ch, v=>updateItem(it.id,'ch',v), 'text-gray-800')}</td>
                    <td className={`${TD} bg-gray-50 text-gray-600`}>{BRL(c.fullH)}</td>
                    <td className={`${TD} bg-blue-50 text-blue-700 font-semibold`}>{BRL(c.pph)}</td>
                    <td className={`${TD} bg-blue-50 text-blue-600`}>{BRL(c.pwt)}</td>
                    <td className={`${TD} bg-red-50 text-red-700 font-semibold`}>{BRL(c.tmc)}</td>
                    <td className={TD}>{INP_NUM(it.pct, v=>updateItem(it.id,'pct',Math.min(1,Math.max(0,v))), 'text-gray-800')}</td>
                    <td className={`${TD} bg-amber-50 text-amber-700 font-semibold`}>{BRL(c.pr)}</td>
                    <td className={TD}>{INP_NUM(it.hrs, v=>updateItem(it.id,'hrs',v), 'text-gray-800')}</td>
                    <td className={`${TD} bg-green-50 text-green-700 font-semibold`}>{BRL(c.sv)}</td>
                    <td className={`${TD} text-center`}>
                      <button onClick={()=>removeRow(it.id)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none font-medium">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className={`${TD} text-left font-semibold text-gray-700`} colSpan={3}>TOTAIS</td>
                <td className={`${TD} bg-gray-100 text-gray-500`}></td>
                <td className={`${TD} bg-blue-50`}></td>
                <td className={`${TD} bg-blue-50`}></td>
                <td className={`${TD} bg-red-50 text-red-700 font-bold text-right`}>{BRL(totals.tmc)}</td>
                <td className={TD}></td>
                <td className={`${TD} bg-amber-50 text-amber-700 font-bold text-right`}>{BRL(totals.pr)}</td>
                <td className={`${TD} text-right font-semibold`}>{totals.hrs}h</td>
                <td className={`${TD} bg-green-50 text-green-700 font-bold text-right`}>{BRL(totals.sv)}</td>
                <td className={TD}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 text-[10.5px] text-gray-500 flex-wrap gap-y-1">
            <span className="font-medium text-gray-700">Legenda:</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-200 mr-1"/>Preço/h = custo/h × (1 + {marg}%)</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-red-200 mr-1"/>Custo time = preço c/imposto × {hpm}h × pessoas</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-amber-200 mr-1"/>Via % = custo time × % dedicação</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-green-200 mr-1"/>Via horas = hrs alocadas × preço/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
