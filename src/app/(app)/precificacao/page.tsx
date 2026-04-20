'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BRL } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PricingItem {
  id?: string; srv: string; ppl: number; ch: number; pct: number; hrs: number;
}
interface Pricing {
  id: string; name: string; clientName?: string | null; status: string;
  marginRate: number; taxRate: number; hoursPerMonth: number;
  totalCost: number; totalSale: number; notes?: string | null;
  createdAt: string; updatedAt: string;
  items: PricingItem[];
  proposalNumber?: number | null;
}

const SERVICES = [
  'Inbound Marketing','Performance / Mídia Paga','CRM / Automação','Comercial / SDR',
  'Desenvolvimento Web','CRO','SEO / Conteúdo','Outsourcing','Social Media','Design / UX',
  'Consultoria Estratégica','Outros',
];
const DEFAULT_ITEMS: PricingItem[] = [
  {srv:'Inbound Marketing',       ppl:5, ch:38.28, pct:0,    hrs:0},
  {srv:'Performance / Mídia Paga',ppl:2, ch:54.09, pct:0.31, hrs:0},
  {srv:'CRM / Automação',         ppl:2, ch:37.44, pct:0.31, hrs:0},
  {srv:'Comercial / SDR',         ppl:2, ch:20.80, pct:0.05, hrs:0},
  {srv:'Desenvolvimento Web',     ppl:8, ch:56.17, pct:0.31, hrs:30},
  {srv:'CRO',                     ppl:2, ch:46.76, pct:0,    hrs:30},
  {srv:'SEO / Conteúdo',          ppl:1, ch:83.21, pct:0,    hrs:25},
  {srv:'Outsourcing',             ppl:2, ch:70.73, pct:0,    hrs:0},
];
const STATUS_LABEL: Record<string,string> = {DRAFT:'Rascunho',SENT:'Enviada',APPROVED:'Aprovada',REJECTED:'Rejeitada',EXPIRED:'Expirada'};
const STATUS_COLOR: Record<string,string> = {DRAFT:'bg-gray-100 text-gray-600',SENT:'bg-blue-50 text-blue-700',APPROVED:'bg-green-50 text-green-700',REJECTED:'bg-red-50 text-red-700',EXPIRED:'bg-amber-50 text-amber-700'};

// ─── Calc helper ─────────────────────────────────────────────────────────────
function calcRow(it: PricingItem, marg: number, imp: number, hpm: number) {
  const m=marg/100, i=imp/100, h=hpm;
  const fullH=it.ch*h, pph=it.ch*(1+m), pwt=pph*(1+i), tmc=pwt*h*it.ppl, pr=tmc*it.pct, sv=it.hrs*pph;
  return {fullH,pph,pwt,tmc,pr,sv};
}

// ─── Number input component ───────────────────────────────────────────────────
function NI({v,onChange,extra}:{v:number;onChange:(n:number)=>void;extra?:string}) {
  return (
    <input type="number" min="0" step="0.01"
      className={`w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs text-right font-medium text-gray-800 bg-white focus:outline-none focus:border-[#1A6B4A] tabular-nums ${extra||''}`}
      value={v} onChange={e=>onChange(parseFloat(e.target.value)||0)}/>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PrecificacaoPage() {
  const searchParams = useSearchParams();
  const [pricings, setPricings] = useState<Pricing[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [mode,     setMode]     = useState<'list'|'editor'>('list');
  const [editId,   setEditId]   = useState<string|null>(null);

  // Editor state
  const [items,   setItems]   = useState<PricingItem[]>(DEFAULT_ITEMS.map((it,i)=>({...it,id:String(i)})));
  const [marg,    setMarg]    = useState(50);
  const [imposto, setImposto] = useState(15);
  const [hpm,     setHpm]     = useState(160);
  const [nome,    setNome]    = useState('Full Service E-commerce');
  const [cliente, setCliente] = useState('');
  const [status,  setStatus]  = useState('DRAFT');
  const [notas,   setNotas]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState('');

  useEffect(() => { fetchAll(); }, []);

  // Auto-open new form when navigated from dashboard ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') openNew();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/pricing');
      if (res.ok) setPricings(await res.json());
    } finally { setLoading(false); }
  }

  function openNew() {
    setEditId(null);
    setItems(DEFAULT_ITEMS.map((it,i)=>({...it,id:String(i)})));
    setMarg(50); setImposto(15); setHpm(160);
    setNome('Nova precificação'); setCliente(''); setStatus('DRAFT'); setNotas('');
    setMode('editor');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function openEdit(p: Pricing) {
    setEditId(p.id);
    setItems(p.items.map((it,i)=>({...it,id:String(i)})));
    setMarg(p.marginRate); setImposto(p.taxRate); setHpm(p.hoursPerMonth);
    setNome(p.name); setCliente(p.clientName||''); setStatus(p.status); setNotas(p.notes||'');
    setMode('editor');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function addRow() {
    setItems(prev=>[...prev,{id:Date.now().toString(),srv:'Novo Serviço',ppl:1,ch:40,pct:0,hrs:0}]);
  }
  function removeRow(id: string) { setItems(prev=>prev.filter(it=>it.id!==id)); }
  function updateItem(id: string, field: keyof PricingItem, val: number|string) {
    setItems(prev=>prev.map(it=>it.id===id?{...it,[field]:val}:it));
  }

  async function handleSave() {
    setSaving(true); setSaved('');
    try {
      const url    = editId ? `/api/pricing/${editId}` : '/api/pricing';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          name:nome, clientName:cliente||null, status, marginRate:marg, taxRate:imposto,
          hoursPerMonth:hpm, notes:notas||null,
          items: items.map(it=>({
            serviceName:it.srv, peopleCount:it.ppl, costPerHour:it.ch,
            projectPct:it.pct, hoursAllocated:it.hrs,
          })),
        }),
      });
      if (res.ok) {
        setSaved(editId ? 'Proposta atualizada!' : 'Proposta salva!');
        await fetchAll();
        setTimeout(()=>{ setSaved(''); setMode('list'); },1200);
      } else {
        const d=await res.json(); setSaved('Erro: '+(d.error||'tente novamente'));
      }
    } catch { setSaved('Erro de conexão.'); }
    finally { setSaving(false); }
  }

  async function deletePricing(id: string, name: string) {
    if (!confirm(`Excluir "${name}"?`)) return;
    await fetch(`/api/pricing/${id}`, {method:'DELETE'});
    fetchAll();
  }

  // Computed totals
  const totals = items.reduce((acc,it)=>{
    const c=calcRow(it,marg,imposto,hpm);
    return {tmc:acc.tmc+c.tmc,pr:acc.pr+c.pr,sv:acc.sv+c.sv,hrs:acc.hrs+it.hrs};
  },{tmc:0,pr:0,sv:0,hrs:0});

  const GR='border border-gray-200';
  const TH=`text-[9px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-2.5 text-right bg-gray-50 ${GR}`;
  const TD=`px-2 py-1.5 text-xs tabular-nums ${GR}`;

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Precificações</h1>
            <p className="text-xs text-gray-400 mt-0.5">{pricings.length} proposta{pricings.length!==1?'s':''} salva{pricings.length!==1?'s':''}</p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova precificação
          </button>
        </div>

        {loading && <div className="text-sm text-gray-400 py-8 text-center">Carregando...</div>}

        {!loading && pricings.length === 0 && (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm font-medium text-gray-600">Nenhuma precificação ainda</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Crie sua primeira proposta com a calculadora Almah</p>
            <button onClick={openNew} className="px-5 py-2.5 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-green-800">
              Criar agora
            </button>
          </div>
        )}

        {!loading && pricings.length > 0 && (
          <div className="space-y-3">
            {pricings.map((p, idx) => {
              const num = pricings.length - idx; // most recent = highest number
              return (
                <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#E8F5EF] flex items-center justify-center text-[#1A6B4A] font-bold text-sm flex-shrink-0">
                        #{num}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{p.name}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status]||'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABEL[p.status]||p.status}
                          </span>
                        </div>
                        {p.clientName && <p className="text-xs text-gray-500 mt-0.5">Cliente: {p.clientName}</p>}
                        <p className="text-[10.5px] text-gray-400 mt-0.5">
                          Criada em {new Date(p.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}
                          {p.updatedAt!==p.createdAt&&' · Atualizada em '+new Date(p.updatedAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Custo time/mês</div>
                        <div className="text-sm font-semibold text-red-600">{BRL(p.totalCost)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Via horas</div>
                        <div className="text-sm font-semibold text-green-700">{BRL(p.totalSale)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>openEdit(p)}
                          className="px-3 py-1.5 text-xs font-medium text-[#1A6B4A] border border-[#1A6B4A] rounded-lg hover:bg-[#E8F5EF] transition-colors">
                          Editar
                        </button>
                        <button onClick={()=>deletePricing(p.id,p.name)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Itens resumo */}
                  {p.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-1.5">
                      {p.items.map((it,i)=>(
                        <span key={i} className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {it.srv}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR VIEW ────────────────────────────────────────────────────────────
  const proposalNum = editId
    ? pricings.length - pricings.findIndex(p=>p.id===editId)
    : pricings.length + 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={()=>setMode('list')} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">
                {editId ? 'Editar proposta' : 'Nova precificação'}
              </h1>
              <span className="text-sm font-bold text-[#1A6B4A] bg-[#E8F5EF] px-2.5 py-0.5 rounded-full">
                #{proposalNum}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Cálculo Almah em tempo real — edite qualquer campo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className={`text-xs font-medium ${saved.startsWith('Erro')?'text-red-600':'text-green-700'}`}>
              {saved}
            </span>
          )}
          <button onClick={()=>setMode('list')} className="px-4 py-2 text-gray-600 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-[#1A6B4A] text-white text-xs font-medium rounded-lg hover:bg-green-800 disabled:opacity-60 transition-colors">
            {saving ? 'Salvando...' : editId ? 'Atualizar proposta' : 'Salvar proposta'}
          </button>
        </div>
      </div>

      {/* Parâmetros globais */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">Informações da proposta</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Nome da proposta *</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A]"
              value={nome} onChange={e=>setNome(e.target.value)}/>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Cliente (opcional)</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A]"
              value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Nome do cliente"/>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
            <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A]"
              value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="DRAFT">Rascunho</option>
              <option value="SENT">Enviada</option>
              <option value="APPROVED">Aprovada</option>
              <option value="REJECTED">Rejeitada</option>
              <option value="EXPIRED">Expirada</option>
            </select>
          </div>
        </div>
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4 mt-5">Parâmetros de cálculo</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
        {notas !== undefined && (
          <div className="mt-4">
            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Observações (opcional)</label>
            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A] resize-none" rows={2}
              value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Notas internas sobre esta proposta..."/>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-4 relative overflow-hidden">
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:'#DC3545'}}/>
          <div className="text-[9.5px] text-gray-400 uppercase tracking-wider font-medium mb-1">Custo total do time/mês</div>
          <div className="text-xl font-bold tabular-nums text-red-600">{BRL(totals.tmc)}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 relative overflow-hidden">
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:'#E67E22'}}/>
          <div className="text-[9.5px] text-gray-400 uppercase tracking-wider font-medium mb-1">Via % projeto</div>
          <div className="text-xl font-bold tabular-nums text-amber-600">{BRL(totals.pr)}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 relative overflow-hidden">
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:'#1A6B4A'}}/>
          <div className="text-[9.5px] text-gray-400 uppercase tracking-wider font-medium mb-1">Via horas alocadas</div>
          <div className="text-xl font-bold tabular-nums text-green-700">{BRL(totals.sv)}</div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-700">Time e serviços</div>
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
                <th className={`${TH} bg-blue-50 text-blue-700`} style={{minWidth:110}}>Preço/h</th>
                <th className={`${TH} bg-blue-50 text-blue-700`} style={{minWidth:110}}>c/ imposto</th>
                <th className={`${TH} bg-red-50 text-red-700`} style={{minWidth:120}}>Custo time/mês</th>
                <th className={TH} style={{minWidth:80}}>% projeto</th>
                <th className={`${TH} bg-amber-50 text-amber-700`} style={{minWidth:110}}>Via %</th>
                <th className={TH} style={{minWidth:70}}>Hrs aloc.</th>
                <th className={`${TH} bg-green-50 text-green-700`} style={{minWidth:110}}>Via horas</th>
                <th className={`${TH} bg-gray-50`} style={{width:36}}>⊗</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it=>{
                const c=calcRow(it,marg,imposto,hpm);
                return (
                  <tr key={it.id} className="hover:bg-gray-50/50">
                    <td className={`${TD} text-left`}>
                      <select className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs text-gray-800 bg-white focus:outline-none focus:border-[#1A6B4A]"
                        value={it.srv} onChange={e=>updateItem(it.id!,'srv',e.target.value)}>
                        {SERVICES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className={TD}><NI v={it.ppl} onChange={v=>updateItem(it.id!,'ppl',v)}/></td>
                    <td className={TD}><NI v={it.ch} onChange={v=>updateItem(it.id!,'ch',v)}/></td>
                    <td className={`${TD} bg-gray-50 text-gray-600`}>{BRL(c.fullH)}</td>
                    <td className={`${TD} bg-blue-50 text-blue-700 font-semibold`}>{BRL(c.pph)}</td>
                    <td className={`${TD} bg-blue-50 text-blue-600`}>{BRL(c.pwt)}</td>
                    <td className={`${TD} bg-red-50 text-red-700 font-semibold`}>{BRL(c.tmc)}</td>
                    <td className={TD}><NI v={it.pct} onChange={v=>updateItem(it.id!,'pct',Math.min(1,Math.max(0,v)))}/></td>
                    <td className={`${TD} bg-amber-50 text-amber-700 font-semibold`}>{BRL(c.pr)}</td>
                    <td className={TD}><NI v={it.hrs} onChange={v=>updateItem(it.id!,'hrs',v)}/></td>
                    <td className={`${TD} bg-green-50 text-green-700 font-semibold`}>{BRL(c.sv)}</td>
                    <td className={`${TD} text-center`}>
                      <button onClick={()=>removeRow(it.id!)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none font-medium">×</button>
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
            <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-200 mr-1"/>Preço/h = custo/h × (1+{marg}%)</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-red-200 mr-1"/>Custo time = preço c/imp × {hpm}h × pessoas</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-amber-200 mr-1"/>Via % = custo time × % dedicação</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-green-200 mr-1"/>Via horas = hrs × preço/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
