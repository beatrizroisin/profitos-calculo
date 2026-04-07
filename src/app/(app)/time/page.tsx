'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, Grid4, Grid2, KPICard, Alert, Button } from '@/components/ui';
import { BRL } from '@/lib/utils';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

interface Colab { id:string; name:string; position:string; type:string; salary:number; hoursPerMonth:number; isActive:boolean; notes:string|null; costPerHour:number; totalAllocatedCost:number; allocatedHours:number; occupancyPct:number; allocations:Alloc[]; }
interface Alloc { id:string; collaboratorId:string; clientId:string; serviceType:string; allocationPct:number|null; allocationHours:number|null; notes:string|null; allocatedCost:number; method:string; allocatedHours:number; collaborator:{id:string;name:string;position:string;salary:number;hoursPerMonth:number;type:string}; client:{id:string;name:string;netRevenue:number;grossRevenue:number}; }
interface Client { id:string; name:string; netRevenue:number; grossRevenue:number; }

const TABS = [
  {id:'colaboradores', label:'Colaboradores'},
  {id:'alocacoes',     label:'Alocações por projeto'},
  {id:'por-colaborador',label:'Por colaborador'},
  {id:'margem-real',  label:'Margem real por projeto'},
];

const AVATAR_COLORS = ['#1A6B4A','#2563EB','#7C3AED','#DC3545','#E67E22','#0891B2','#DB2777','#65A30D'];
function initials(name: string) { return name.split(' ').slice(0,2).map((w:string) => w[0]).join('').toUpperCase(); }
function avatarColor(id: string) { return AVATAR_COLORS[parseInt(id.replace(/\D/g,'').slice(-1)) % AVATAR_COLORS.length]; }

function OccupBar({ pct }: { pct: number }) {
  const c = pct > 95 ? '#DC3545' : pct > 75 ? '#E67E22' : '#1A6B4A';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:5, background:'#F3F4F6', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.min(100,pct).toFixed(0)}%`, background:c, borderRadius:3 }} />
      </div>
      <span style={{ fontSize:11, fontWeight:500, color:c, minWidth:38 }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function TimePage() {
  const [tab,    setTab]    = useState('colaboradores');
  const [colabs, setColabs] = useState<Colab[]>([]);
  const [allocs, setAllocs] = useState<Alloc[]>([]);
  const [clients,setClients]= useState<Client[]>([]);
  const [loading,setLoading]= useState(true);
  const [saved,  setSaved]  = useState('');
  const [error,  setError]  = useState('');
  const [selColab,setSelColab]=useState('');
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInst= useRef<Chart|null>(null);

  // Forms
  const [cForm, setCForm] = useState({ name:'', position:'', type:'PJ', salary:'', hoursPerMonth:'160', notes:'' });
  const [aForm, setAForm] = useState({ collaboratorId:'', clientId:'', serviceType:'SEO / Conteúdo', allocationPct:'', allocationHours:'', notes:'' });

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (tab === 'margem-real') setTimeout(renderChart, 200); }, [tab, allocs, colabs]);

  async function fetchAll() {
    setLoading(true);
    const [cRes, aRes, clRes] = await Promise.all([
      fetch('/api/collaborators').then(r => r.ok ? r.json() : []),
      fetch('/api/collaborators/allocations').then(r => r.ok ? r.json() : []),
      fetch('/api/clients').then(r => r.ok ? r.json() : []),
    ]);
    setColabs(Array.isArray(cRes) ? cRes : []);
    setAllocs(Array.isArray(aRes) ? aRes : []);
    setClients(Array.isArray(clRes) ? clRes : []);
    setLoading(false);
  }

  async function saveColab(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const res = await fetch('/api/collaborators', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...cForm, salary: parseFloat(cForm.salary)||0, hoursPerMonth: parseInt(cForm.hoursPerMonth)||160 }),
    });
    if (res.ok) { setSaved('Colaborador adicionado!'); setTimeout(()=>setSaved(''),3000); setCForm({name:'',position:'',type:'PJ',salary:'',hoursPerMonth:'160',notes:''}); fetchAll(); }
    else { const d = await res.json(); setError(d.error || 'Erro.'); }
  }

  async function saveAlloc(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const payload = {
      collaboratorId: aForm.collaboratorId,
      clientId:       aForm.clientId,
      serviceType:    aForm.serviceType,
      allocationPct:  aForm.allocationPct ? parseFloat(aForm.allocationPct) : null,
      allocationHours:aForm.allocationHours ? parseFloat(aForm.allocationHours) : null,
      notes: aForm.notes || undefined,
    };
    const res = await fetch('/api/collaborators/allocations', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.warning) setError(data.warning);
      setSaved('Alocação salva!'); setTimeout(()=>setSaved(''),3000);
      setAForm({collaboratorId:'',clientId:'',serviceType:'SEO / Conteúdo',allocationPct:'',allocationHours:'',notes:''});
      fetchAll();
    } else { setError(data.error || 'Erro.'); }
  }

  async function deleteAlloc(id: string) {
    await fetch(`/api/collaborators/allocations/${id}`, { method:'DELETE' });
    setSaved('Alocação removida.'); setTimeout(()=>setSaved(''),2500); fetchAll();
  }

  async function deleteColab(id: string) {
    if (!confirm('Remover colaborador e todas as suas alocações?')) return;
    await fetch(`/api/collaborators/${id}`, { method:'DELETE' });
    setSaved('Colaborador removido.'); setTimeout(()=>setSaved(''),2500); fetchAll();
  }

  function calcCost(a: Alloc) { return a.allocatedCost; }

  function custoCliente(clientId: string) {
    return allocs.filter(a => a.clientId === clientId).reduce((s,a) => s + calcCost(a), 0);
  }

  function renderChart() {
    if (!chartRef.current) return;
    const srvMap: Record<string,number> = {};
    allocs.forEach(a => { srvMap[a.serviceType] = (srvMap[a.serviceType]||0) + calcCost(a); });
    const labels = Object.keys(srvMap);
    const values = labels.map(k => Math.round(srvMap[k]));
    const COLORS = ['#1A6B4A','#2563EB','#7C3AED','#DC3545','#E67E22','#0891B2','#DB2777','#65A30D'];
    chartInst.current?.destroy();
    chartInst.current = new Chart(chartRef.current, {
      type:'bar',
      data:{ labels, datasets:[{ data:values, backgroundColor:COLORS.slice(0,labels.length), borderRadius:5, borderSkipped:false }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>' '+BRL(c.raw as number)}} },
        scales:{ x:{ ticks:{callback:v=>BRL(v as number),font:{size:10},color:'#9CA3AF'}, grid:{color:'rgba(0,0,0,.04)'} }, y:{ ticks:{font:{size:10},color:'#6B7280'}, grid:{display:false} } }
      },
    });
  }

  // KPI summaries
  const ativos   = colabs.filter(c => c.isActive);
  const folhaTot = ativos.reduce((s,c) => s+c.salary, 0);
  const custoAloc= allocs.reduce((s,a) => s+calcCost(a), 0);
  const ocupMed  = ativos.length > 0 ? ativos.reduce((s,c) => s+c.occupancyPct,0)/ativos.length : 0;
  const sobrecarr= ativos.filter(c => c.occupancyPct > 95).length;
  const clientsWithAlloc = clients.filter(c => allocs.some(a => a.clientId === c.id));
  const totalLiq = clientsWithAlloc.reduce((s,c) => s+c.netRevenue, 0);
  const totalMarg= totalLiq - custoAloc;

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#1A6B4A] tabular-nums';
  const lbl = 'block text-[9.5px] font-medium text-gray-400 uppercase tracking-wider mb-1';
  const SERVICES = ['SEO / Conteúdo','CRM / Automação','Performance / Mídia Paga','Gestão de E-commerce','Desenvolvimento Web','Inbound Marketing','Social Media','Design / UX','Comercial / SDR','Consultoria Estratégica','Outros'];

  const selColabData = colabs.find(c => c.id === selColab);
  const selColabAllocs = allocs.filter(a => a.collaboratorId === selColab);

  if (loading) return <div className="text-center py-16 text-sm text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-5 max-w-screen-xl">
      <div><h1 className="text-lg font-semibold text-gray-900">Alocação de colaboradores</h1><p className="text-sm text-gray-400 mt-0.5">Custo real por projeto · Margem por cliente · Capacidade do time</p></div>

      {saved && <Alert variant="ok">{saved}</Alert>}
      {error && <Alert variant="warn">{error} <button onClick={()=>setError('')} className="ml-2">×</button></Alert>}

      {/* KPIs globais */}
      <div className="grid grid-cols-5 gap-3">
        <div style={{background:'var(--color-background-secondary)',borderRadius:9,padding:12,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:'#2563EB'}}/>
          <div style={{fontSize:'9.5px',color:'var(--color-text-tertiary)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:3}}>Time ativo</div>
          <div style={{fontSize:19,fontWeight:500,color:'#2563EB'}}>{ativos.length}</div>
          <div style={{fontSize:10,color:'var(--color-text-tertiary)',marginTop:2}}>colaboradores</div>
        </div>
        <div style={{background:'var(--color-background-secondary)',borderRadius:9,padding:12,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:'#DC3545'}}/>
          <div style={{fontSize:'9.5px',color:'var(--color-text-tertiary)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:3}}>Folha total</div>
          <div style={{fontSize:19,fontWeight:500,color:'#DC3545'}}>{BRL(folhaTot)}</div>
          <div style={{fontSize:10,color:'var(--color-text-tertiary)',marginTop:2}}>/mês</div>
        </div>
        <div style={{background:'var(--color-background-secondary)',borderRadius:9,padding:12,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:'#E67E22'}}/>
          <div style={{fontSize:'9.5px',color:'var(--color-text-tertiary)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:3}}>Custo alocado</div>
          <div style={{fontSize:19,fontWeight:500,color:'#E67E22'}}>{BRL(custoAloc)}</div>
          <div style={{fontSize:10,color:'var(--color-text-tertiary)',marginTop:2}}>{folhaTot > 0 ? (custoAloc/folhaTot*100).toFixed(1)+'% da folha' : '—'}</div>
        </div>
        <div style={{background:'var(--color-background-secondary)',borderRadius:9,padding:12,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:ocupMed>90?'#DC3545':'#1A6B4A'}}/>
          <div style={{fontSize:'9.5px',color:'var(--color-text-tertiary)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:3}}>Ocupação média</div>
          <div style={{fontSize:19,fontWeight:500,color:ocupMed>90?'#DC3545':'#1A6B4A'}}>{ocupMed.toFixed(0)}%</div>
          <div style={{fontSize:10,color:'var(--color-text-tertiary)',marginTop:2}}>{sobrecarr > 0 ? sobrecarr+' sobrecarregado(s)' : 'dentro da capacidade'}</div>
        </div>
        <div style={{background:'var(--color-background-secondary)',borderRadius:9,padding:12,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:totalMarg>=0?'#1A6B4A':'#DC3545'}}/>
          <div style={{fontSize:'9.5px',color:'var(--color-text-tertiary)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:3}}>Margem real</div>
          <div style={{fontSize:19,fontWeight:500,color:totalMarg>=0?'#1A6B4A':'#DC3545'}}>{BRL(totalMarg)}</div>
          <div style={{fontSize:10,color:'var(--color-text-tertiary)',marginTop:2}}>receita − custo time</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 border border-gray-100">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab===t.id?'bg-white text-gray-800 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: COLABORADORES ─────────────────────────────── */}
      {tab === 'colaboradores' && (
        <div className="space-y-4">
          <Card title="Cadastrar colaborador" subtitle="Salário bruto — PJ: valor do contrato; CLT: salário + encargos totais">
            <form onSubmit={saveColab}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="col-span-2"><label className={lbl}>Nome completo *</label><input required className={inp} value={cForm.name} onChange={e=>setCForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Danilo Costa Silva"/></div>
                <div><label className={lbl}>Cargo / função *</label><input required className={inp} value={cForm.position} onChange={e=>setCForm(f=>({...f,position:e.target.value}))} placeholder="Ex: Especialista SEO"/></div>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div><label className={lbl}>Tipo</label><select className={inp} value={cForm.type} onChange={e=>setCForm(f=>({...f,type:e.target.value}))}><option value="PJ">PJ</option><option value="CLT">CLT (+encargos)</option></select></div>
                <div><label className={lbl}>Salário / honorário (R$) *</label><input required type="number" min="0" step="100" className={inp} value={cForm.salary} onChange={e=>setCForm(f=>({...f,salary:e.target.value}))} placeholder="6000"/></div>
                <div>
                  <label className={lbl}>Horas disponíveis/mês</label>
                  <input type="number" min="1" max="300" className={inp} value={cForm.hoursPerMonth} onChange={e=>setCForm(f=>({...f,hoursPerMonth:e.target.value}))}/>
                </div>
                <div>
                  <label className={lbl}>Custo/hora (calculado)</label>
                  <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-800 tabular-nums">
                    {cForm.salary && cForm.hoursPerMonth ? BRL(parseFloat(cForm.salary)/parseInt(cForm.hoursPerMonth))+'/h' : '—'}
                  </div>
                </div>
              </div>
              <button type="submit" className="px-5 py-2 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-[#0F4A33]">Adicionar colaborador</button>
            </form>
          </Card>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">{ativos.length} colaboradores ativos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{minWidth:800}}>
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase">Colaborador</th>
                  <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase">Tipo</th>
                  <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase">Salário</th>
                  <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase">Horas disp.</th>
                  <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase">Custo/hora</th>
                  <th className="py-3 text-[10px] font-medium text-gray-400 uppercase">Ocupação</th>
                  <th className="text-right py-3 pr-5 text-[10px] font-medium text-gray-400 uppercase">Ações</th>
                </tr></thead>
                <tbody>
                  {colabs.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-sm text-gray-400">Nenhum colaborador cadastrado.</td></tr>}
                  {colabs.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div style={{width:28,height:28,borderRadius:7,background:avatarColor(c.id),display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:500,color:'#fff',flexShrink:0}}>{initials(c.name)}</div>
                          <div><p className="font-medium text-gray-800">{c.name}</p><p className="text-[10px] text-gray-400">{c.position}</p></div>
                        </div>
                      </td>
                      <td><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${c.type==='CLT'?'bg-purple-50 text-purple-700':'bg-blue-50 text-blue-700'}`}>{c.type}</span></td>
                      <td className="text-right text-xs font-medium text-gray-700 tabular-nums pr-2">{BRL(c.salary)}</td>
                      <td className="text-right text-xs text-gray-500">{c.hoursPerMonth}h</td>
                      <td className="text-right text-xs font-medium text-green-700 tabular-nums pr-3">{BRL(c.costPerHour)}/h</td>
                      <td className="pr-4"><OccupBar pct={c.occupancyPct}/></td>
                      <td className="pr-5 text-right"><button onClick={()=>deleteColab(c.id)} className="text-[11px] text-red-500 hover:text-red-700">Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ALOCAÇÕES ────────────────────────────────── */}
      {tab === 'alocacoes' && (
        <div className="space-y-4">
          <Card title="Alocar colaborador em projeto" subtitle="Define quanto do tempo de cada pessoa vai para cada cliente">
            <form onSubmit={saveAlloc}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div><label className={lbl}>Colaborador *</label>
                  <select required className={inp} value={aForm.collaboratorId} onChange={e=>setAForm(f=>({...f,collaboratorId:e.target.value}))}>
                    <option value="">— Selecione —</option>
                    {colabs.filter(c=>c.isActive).map(c=><option key={c.id} value={c.id}>{c.name} — {c.position} ({c.occupancyPct.toFixed(0)}% ocupado)</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Projeto / cliente *</label>
                  <select required className={inp} value={aForm.clientId} onChange={e=>setAForm(f=>({...f,clientId:e.target.value}))}>
                    <option value="">— Selecione —</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Serviço prestado</label>
                  <select className={inp} value={aForm.serviceType} onChange={e=>setAForm(f=>({...f,serviceType:e.target.value}))}>
                    {SERVICES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div><label className={lbl}>% do tempo</label><input type="number" min="0" max="100" step="5" className={inp} value={aForm.allocationPct} onChange={e=>setAForm(f=>({...f,allocationPct:e.target.value}))} placeholder="ex: 30"/><p className="text-[9.5px] text-gray-400 mt-1">Deixe vazio para usar horas</p></div>
                <div><label className={lbl}>Horas/mês</label><input type="number" min="0" step="4" className={inp} value={aForm.allocationHours} onChange={e=>setAForm(f=>({...f,allocationHours:e.target.value}))} placeholder="ex: 40"/><p className="text-[9.5px] text-gray-400 mt-1">Deixe vazio para usar %</p></div>
                <div>
                  <label className={lbl}>Custo calculado</label>
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-800 tabular-nums">
                    {(() => {
                      const col = colabs.find(c=>c.id===aForm.collaboratorId);
                      if (!col) return '—';
                      const pct   = parseFloat(aForm.allocationPct)  || null;
                      const horas = parseFloat(aForm.allocationHours) || null;
                      const custoH = col.salary / col.hoursPerMonth;
                      const vP = pct   != null ? col.salary * pct / 100 : null;
                      const vH = horas != null ? custoH * horas : null;
                      if (!vP && !vH) return '—';
                      if (vP && vH) return BRL(Math.max(vP, vH));
                      return BRL(vP ?? vH ?? 0);
                    })()}
                  </div>
                </div>
                <div><label className={lbl}>Observações</label><input className={inp} value={aForm.notes} onChange={e=>setAForm(f=>({...f,notes:e.target.value}))} placeholder="notas internas..."/></div>
              </div>
              <button type="submit" className="px-5 py-2 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-[#0F4A33]">Salvar alocação</button>
            </form>
          </Card>

          {/* Tabela por cliente */}
          {clients.filter(c => allocs.some(a=>a.clientId===c.id)).map(cli => {
            const cAllocs = allocs.filter(a=>a.clientId===cli.id);
            const custCli = cAllocs.reduce((s,a)=>s+calcCost(a),0);
            const marg    = cli.netRevenue - custCli;
            const mColor  = marg < 0 ? '#DC3545' : marg < cli.netRevenue*0.15 ? '#E67E22' : '#1A6B4A';
            return (
              <div key={cli.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-800">{cli.name}</span>
                  <div className="flex gap-4 text-xs">
                    <span>Receita: <strong className="text-green-700">{BRL(cli.netRevenue)}</strong></span>
                    <span>Custo time: <strong className="text-red-600">{BRL(custCli)}</strong></span>
                    <span>Margem: <strong style={{color:mColor}}>{BRL(marg)} ({(marg/cli.netRevenue*100).toFixed(1)}%)</strong></span>
                  </div>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-50">
                    <th className="text-left px-5 py-2 text-[10px] font-medium text-gray-400 uppercase">Colaborador</th>
                    <th className="text-left py-2 text-[10px] font-medium text-gray-400 uppercase">Serviço</th>
                    <th className="text-right py-2 text-[10px] font-medium text-gray-400 uppercase">Alocação</th>
                    <th className="text-right py-2 text-[10px] font-medium text-gray-400 uppercase">Custo/mês</th>
                    <th className="text-right py-2 pr-5 text-[10px] font-medium text-gray-400 uppercase">Ação</th>
                  </tr></thead>
                  <tbody>
                    {cAllocs.map(a=>(
                      <tr key={a.id} className="border-b border-gray-50">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div style={{width:22,height:22,borderRadius:5,background:avatarColor(a.collaboratorId),display:'flex',alignItems:'center',justifyContent:'center',fontSize:8.5,fontWeight:500,color:'#fff',flexShrink:0}}>{initials(a.collaborator.name)}</div>
                            <span className="font-medium text-gray-800">{a.collaborator.name}</span>
                          </div>
                        </td>
                        <td><span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px]">{a.serviceType}</span></td>
                        <td className="text-right text-gray-500">{a.allocationPct != null && a.allocationHours != null ? `${a.allocationPct}% / ${a.allocationHours}h` : a.allocationPct != null ? `${a.allocationPct}%` : `${a.allocationHours}h`}</td>
                        <td className="text-right font-medium text-red-600 tabular-nums">{BRL(calcCost(a))}</td>
                        <td className="text-right pr-5"><button onClick={()=>deleteAlloc(a.id)} className="text-[11px] text-red-500 hover:text-red-700">Remover</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 3: POR COLABORADOR ───────────────────────────── */}
      {tab === 'por-colaborador' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Ver colaborador:</label>
            <select className={inp} style={{maxWidth:320}} value={selColab} onChange={e=>setSelColab(e.target.value)}>
              <option value="">— Selecione —</option>
              {colabs.map(c=><option key={c.id} value={c.id}>{c.name} — {c.position}</option>)}
            </select>
          </div>
          {!selColab && <div className="text-center py-10 text-sm text-gray-400">Selecione um colaborador para ver sua visão completa.</div>}
          {selColab && selColabData && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl">
                <div style={{width:46,height:46,borderRadius:12,background:avatarColor(selColab),display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:500,color:'#fff',flexShrink:0}}>{initials(selColabData.name)}</div>
                <div className="flex-1"><p className="font-semibold text-gray-900">{selColabData.name}</p><p className="text-xs text-gray-500">{selColabData.position} · <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${selColabData.type==='CLT'?'bg-purple-50 text-purple-700':'bg-blue-50 text-blue-700'}`}>{selColabData.type}</span></p></div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Salário',v:BRL(selColabData.salary),c:'#2563EB'},
                    {l:'Custo alocado',v:BRL(selColabData.totalAllocatedCost),c:'#DC3545'},
                    {l:'Horas alocadas',v:`${selColabData.allocatedHours.toFixed(0)}h`,c:'#E67E22'},
                    {l:'Ocupação',v:`${selColabData.occupancyPct.toFixed(0)}%`,c:selColabData.occupancyPct>95?'#DC3545':'#1A6B4A'},
                  ].map(k=>(
                    <div key={k.l} className="text-right">
                      <div className="text-[9.5px] text-gray-400 uppercase tracking-wider">{k.l}</div>
                      <div className="text-sm font-semibold tabular-nums" style={{color:k.c}}>{k.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {selColabData.occupancyPct > 95 && (
                <div className="flex gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-1"/>
                  <span><strong>Sobrecarga detectada:</strong> {selColabData.name} está com {selColabData.occupancyPct.toFixed(0)}% de ocupação. Considere redistribuir projetos ou contratar reforço.</span>
                </div>
              )}

              {selColabAllocs.length === 0 && <div className="text-center py-8 text-sm text-gray-400">Nenhuma alocação cadastrada para este colaborador.</div>}

              {selColabAllocs.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-50"><span className="text-xs font-medium text-gray-700">{selColabAllocs.length} projeto(s) atribuídos</span></div>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-gray-50">
                      <th className="text-left px-5 py-2.5 text-[10px] font-medium text-gray-400 uppercase">Projeto</th>
                      <th className="text-left py-2.5 text-[10px] font-medium text-gray-400 uppercase">Serviço</th>
                      <th className="text-right py-2.5 text-[10px] font-medium text-gray-400 uppercase">Alocação</th>
                      <th className="text-right py-2.5 text-[10px] font-medium text-gray-400 uppercase">Horas/mês</th>
                      <th className="text-right py-2.5 text-[10px] font-medium text-gray-400 uppercase">Custo gerado</th>
                      <th className="text-right py-2.5 pr-5 text-[10px] font-medium text-gray-400 uppercase">% da receita</th>
                    </tr></thead>
                    <tbody>
                      {selColabAllocs.map(a=>{
                        const pctRec = (calcCost(a)/a.client.netRevenue*100).toFixed(1);
                        const modo = a.allocationPct != null && a.allocationHours != null ? `${a.allocationPct}% / ${a.allocationHours}h` : a.allocationPct != null ? `${a.allocationPct}%` : `${a.allocationHours}h`;
                        return <tr key={a.id} className="border-b border-gray-50">
                          <td className="px-5 py-2.5 font-medium text-gray-800">{a.client.name}</td>
                          <td><span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px]">{a.serviceType}</span></td>
                          <td className="text-right text-gray-500">{modo}</td>
                          <td className="text-right text-gray-500">{a.allocatedHours.toFixed(0)}h</td>
                          <td className="text-right font-medium text-red-600 tabular-nums">{BRL(calcCost(a))}</td>
                          <td className="text-right pr-5 text-gray-400">{pctRec}%</td>
                        </tr>;
                      })}
                      <tr className="bg-gray-50 border-t border-gray-100 font-medium">
                        <td colSpan={3} className="px-5 py-2.5 text-gray-600">Total</td>
                        <td className="text-right text-gray-700">{selColabAllocs.reduce((s,a)=>s+a.allocatedHours,0).toFixed(0)}h</td>
                        <td className="text-right text-red-600 tabular-nums">{BRL(selColabData.totalAllocatedCost)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Barra de capacidade */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-500">Capacidade utilizada</span>
                  <span style={{color:selColabData.occupancyPct>95?'#DC3545':'#1A6B4A',fontWeight:500}}>{selColabData.allocatedHours.toFixed(0)}h / {selColabData.hoursPerMonth}h</span>
                </div>
                <div className="h-3 bg-white border border-gray-200 rounded-full overflow-hidden">
                  <div style={{height:'100%',width:`${Math.min(100,selColabData.occupancyPct).toFixed(0)}%`,background:selColabData.occupancyPct>95?'#DC3545':selColabData.occupancyPct>75?'#E67E22':'#1A6B4A',borderRadius:'9999px',transition:'width .3s'}}/>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: MARGEM REAL ───────────────────────────────── */}
      {tab === 'margem-real' && (
        <div className="space-y-4">
          {clientsWithAlloc.filter(c => c.netRevenue - custoCliente(c.id) < 0).map(c => (
            <div key={c.id} className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1"/>
              <span><strong>{c.name}:</strong> Custo do time ({BRL(custoCliente(c.id))}) supera a receita líquida ({BRL(c.netRevenue)}). Déficit de {BRL(custoCliente(c.id)-c.netRevenue)}.</span>
            </div>
          ))}

          {[...clientsWithAlloc].sort((a,b)=>{
            const mA=(a.netRevenue-custoCliente(a.id))/a.netRevenue;
            const mB=(b.netRevenue-custoCliente(b.id))/b.netRevenue;
            return mB-mA;
          }).map(cli => {
            const cAllocs  = allocs.filter(a=>a.clientId===cli.id);
            const custTime = custoCliente(cli.id);
            const marg     = cli.netRevenue - custTime;
            const mPct     = (marg/cli.netRevenue*100);
            const mColor   = marg < 0 ? '#DC3545' : mPct < 15 ? '#E67E22' : '#1A6B4A';
            return (
              <div key={cli.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div><div className="text-sm font-semibold text-gray-900">{cli.name}</div><div className="text-[10px] text-gray-400 mt-0.5">{cAllocs.length} colaborador(es)</div></div>
                  <div className="flex gap-4 text-xs">
                    <div className="text-right"><div className="text-[9.5px] text-gray-400">Receita líq.</div><div className="text-sm font-semibold text-green-700 tabular-nums">{BRL(cli.netRevenue)}</div></div>
                    <div className="text-right"><div className="text-[9.5px] text-gray-400">Custo time</div><div className="text-sm font-semibold text-red-600 tabular-nums">{BRL(custTime)}</div></div>
                    <div className="text-right"><div className="text-[9.5px] text-gray-400">Margem real</div><div className="text-sm font-semibold tabular-nums" style={{color:mColor}}>{BRL(marg)} ({mPct.toFixed(1)}%)</div></div>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-[10.5px] text-gray-400 mb-1.5">
                    <span>Margem real</span><span style={{color:mColor,fontWeight:500}}>{mPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div style={{height:'100%',width:`${Math.max(0,Math.min(100,mPct)).toFixed(0)}%`,background:mColor,borderRadius:'9999px'}}/>
                  </div>
                </div>
                <div className="space-y-2">
                  {cAllocs.map(a=>(
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div style={{width:22,height:22,borderRadius:5,background:avatarColor(a.collaboratorId),display:'flex',alignItems:'center',justifyContent:'center',fontSize:8.5,fontWeight:500,color:'#fff',flexShrink:0}}>{initials(a.collaborator.name)}</div>
                        <div><div className="text-xs font-medium text-gray-800">{a.collaborator.name}</div><div className="text-[10px] text-gray-400">{a.serviceType}</div></div>
                      </div>
                      <div className="text-right"><div className="text-xs font-medium text-red-600 tabular-nums">{BRL(calcCost(a))}</div><div className="text-[10px] text-gray-400">{(calcCost(a)/cli.netRevenue*100).toFixed(1)}% da receita</div></div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 text-xs font-semibold">
                    <span className="text-gray-600">Total custo time</span>
                    <span className="text-red-600 tabular-nums">{BRL(custTime)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="text-sm font-medium text-gray-800 mb-1">Custo do time por serviço</div>
            <div className="text-xs text-gray-400 mb-4">Total alocado em cada área de serviço</div>
            <div style={{position:'relative',width:'100%',height:`${Math.max(180, Object.keys(allocs.reduce((m:any,a)=>{m[a.serviceType]=1;return m},{})).length * 40 + 80)}px`}}>
              <canvas ref={chartRef}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
