'use client';
import { useState, useEffect, useRef } from 'react';
import { BRL } from '@/lib/utils';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

interface Config { id: string; syncFrequency: string; lastSyncAt: string|null; isActive: boolean; }
interface Comparison { id: string; name: string; position: string; salary: number; allocatedHours: number; realHours: number; diff: number; pct: number; status: string; linked: boolean; runrunId?: string; }
interface RRUser { id: string; name: string; email: string; time_worked: number; }
interface Link { id: string; collaboratorId: string; runrunUserId: string; runrunEmail: string|null; }
interface Colab { id: string; name: string; position: string; }

const STATUS_LABEL: Record<string,string> = { not_linked:'Não vinculado', no_data:'Sem dados', overloaded:'Sobrecarregado', underused:'Abaixo do plano', on_track:'Dentro do plano' };
const STATUS_CLS:   Record<string,string> = { not_linked:'bg-gray-100 text-gray-500', no_data:'bg-gray-100 text-gray-500', overloaded:'bg-red-50 text-red-700', underused:'bg-orange-50 text-orange-700', on_track:'bg-green-50 text-green-700' };
const AV_COLORS = ['#1A6B4A','#2563EB','#7C3AED','#DC3545','#E67E22','#0891B2','#DB2777','#65A30D'];
const ini = (n: string) => n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const avc = (id: string) => AV_COLORS[parseInt(id.replace(/\D/g,'').slice(-2)||'0') % AV_COLORS.length];

const TABS = [{id:'config',l:'Configuração'},{id:'vinculos',l:'Vínculo de usuários'},{id:'comparativo',l:'Comparativo'},{id:'projetos',l:'Por projeto'}];
const INP = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#FF6B00]';
const LBL = 'block text-[9.5px] font-medium text-gray-400 uppercase tracking-wider mb-1.5';

export default function RunRunPage() {
  const [tab,        setTab]        = useState('config');
  const [config,     setConfig]     = useState<Config|null>(null);
  const [comparison, setComparison] = useState<Comparison[]>([]);
  const [rrUsers,    setRRUsers]    = useState<RRUser[]>([]);
  const [links,      setLinks]      = useState<Link[]>([]);
  const [colabs,     setColabs]     = useState<Colab[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [syncing,    setSyncing]    = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [saved,      setSaved]      = useState('');
  const [error,      setError]      = useState('');
  const [form,       setForm]       = useState({ appKey:'', userToken:'', syncFrequency:'daily' });
  const compRef = useRef<HTMLCanvasElement>(null);
  const compCI  = useRef<Chart|null>(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (tab === 'comparativo' && comparison.length > 0) {
      const raf = requestAnimationFrame(drawChart);
      return () => cancelAnimationFrame(raf);
    }
  }, [tab, comparison]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [cfgRes, syncRes, colabsRes] = await Promise.all([
        fetch('/api/integrations/runrunit').then(r => r.ok ? r.json() : null),
        fetch('/api/integrations/runrunit/sync').then(r => r.ok ? r.json() : null),
        fetch('/api/collaborators').then(r => r.ok ? r.json() : []),
      ]);
      setConfig(cfgRes);
      if (syncRes?.comparison) setComparison(syncRes.comparison);
      setColabs(Array.isArray(colabsRes) ? colabsRes : []);
    } catch {}
    setLoading(false);
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/integrations/runrunit/users');
      if (res.ok) { const d = await res.json(); setRRUsers(d.users||[]); setLinks(d.links||[]); }
      else setError('Não foi possível carregar usuários. Verifique se a integração está configurada.');
    } catch { setError('Erro ao carregar usuários do RunRun.it.'); }
  }

  async function testConn() {
    if (!form.appKey || !form.userToken) { setError('Preencha App-Key e User-Token antes de testar.'); return; }
    setTesting(true); setError(''); setSaved('');
    const res = await fetch('/api/integrations/runrunit', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, testOnly: true }),
    });
    const d = await res.json();
    setTesting(false);
    if (res.ok) setSaved(`Conexão bem-sucedida! Empresa: ${d.enterprise?.name||'RunRun.it'}`);
    else setError(d.error || 'Falha na conexão. Verifique as credenciais.');
    setTimeout(() => setSaved(''), 5000);
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!form.appKey || !form.userToken) { setError('Preencha todos os campos obrigatórios.'); return; }
    setError(''); setSaved('');
    const res = await fetch('/api/integrations/runrunit', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (res.ok) { setSaved('Integração salva e ativada com sucesso!'); setTimeout(()=>setSaved(''),4000); fetchAll(); }
    else setError(d.error || 'Erro ao salvar configuração.');
  }

  async function syncNow() {
    if (!config) { setError('Configure a integração primeiro.'); return; }
    setSyncing(true); setError('');
    const res = await fetch('/api/integrations/runrunit/sync', { method:'POST' });
    const d   = await res.json();
    setSyncing(false);
    if (res.ok) { setSaved(`Sincronizado! ${d.synced} registros importados.`); fetchAll(); }
    else setError(d.error || 'Erro na sincronização.');
    setTimeout(() => setSaved(''), 5000);
  }

  async function saveLink(collaboratorId: string, runrunUserId: string) {
    if (!runrunUserId) return;
    const rrUser = rrUsers.find(u => u.id === runrunUserId);
    const res = await fetch('/api/integrations/runrunit/users', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ collaboratorId, runrunUserId, runrunEmail: rrUser?.email, runrunName: rrUser?.name }),
    });
    if (res.ok) { setSaved('Vínculo salvo.'); setTimeout(()=>setSaved(''),2500); fetchUsers(); }
  }

  function drawChart() {
    const canvas = compRef.current;
    if (!canvas) return;
    compCI.current?.destroy(); compCI.current = null;
    const linked = comparison.filter(c => c.linked && (c.allocatedHours > 0 || c.realHours > 0));
    if (linked.length === 0) return;
    compCI.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: linked.map(c => c.name.split(' ')[0]),
        datasets: [
          { label:'Alocadas (profitOS)', data: linked.map(c => c.allocatedHours), backgroundColor:'rgba(37,99,235,.75)', borderRadius:4, borderSkipped:false },
          { label:'Reais (RunRun.it)',   data: linked.map(c => c.realHours),      backgroundColor:'rgba(255,107,0,.8)',  borderRadius:4, borderSkipped:false },
        ],
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{mode:'index',intersect:false,callbacks:{label:c=>c.dataset.label+': '+c.raw+'h'}} },
        scales:{ x:{grid:{display:false},ticks:{color:'#9CA3AF',font:{size:10}}}, y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{color:'#9CA3AF',font:{size:10},callback:v=>v+'h'}} },
      },
    });
  }

  const totAloc  = comparison.reduce((s,c)=>s+c.allocatedHours,0);
  const totReal  = comparison.reduce((s,c)=>s+c.realHours,0);
  const overload = comparison.filter(c=>c.status==='overloaded').length;
  const under    = comparison.filter(c=>c.status==='underused').length;

  if (loading) return <div className="text-center py-16 text-sm text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Integração RunRun.it</h1>
            <p className="text-xs text-gray-400 mt-0.5">Horas reais vs. horas alocadas no profitOS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${config ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${config ? 'bg-green-500' : 'bg-gray-400'}`}/>
            {config ? 'Conectado' : 'Não configurado'}
          </div>
          {config && (
            <button onClick={syncNow} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white text-xs font-medium rounded-lg hover:bg-orange-600 disabled:opacity-60 transition-colors">
              {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
          )}
        </div>
      </div>

      {saved && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800"><div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"/>{saved}</div>}
      {error && <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800"><span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"/>{error}</span><button onClick={()=>setError('')} className="text-red-400 hover:text-red-600 font-bold text-sm leading-none">×</button></div>}
      {config?.lastSyncAt && <p className="text-xs text-gray-400">Última sincronização: {new Date(config.lastSyncAt).toLocaleString('pt-BR')}</p>}

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 border border-gray-100 flex-wrap">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{ setTab(t.id); if(t.id==='vinculos') fetchUsers(); }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all min-w-[100px] ${tab===t.id?'bg-white text-gray-800 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── CONFIG ── */}
      {tab==='config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="text-sm font-semibold text-gray-900 mb-1">Credenciais RunRun.it</div>
            <p className="text-xs text-gray-400 mb-5">Salvas criptografadas no banco de dados — nunca expostas ao navegador</p>
            {config && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"/>
                Integração ativa desde {new Date(config.lastSyncAt||'').toLocaleDateString('pt-BR') || 'configuração inicial'}
              </div>
            )}
            <form onSubmit={saveConfig} className="space-y-4">
              <div>
                <label className={LBL}>App-Key (chave da empresa) *</label>
                <input type="password" required className={INP} value={form.appKey} onChange={e=>setForm(f=>({...f,appKey:e.target.value}))} placeholder="ex: 1a219437eab893dc115509bb85e06d77"/>
                <p className="text-[10px] text-gray-400 mt-1">Encontre em: RunRun.it → Configurações → API e Integrações</p>
              </div>
              <div>
                <label className={LBL}>User-Token (token do usuário master) *</label>
                <input type="password" required className={INP} value={form.userToken} onChange={e=>setForm(f=>({...f,userToken:e.target.value}))} placeholder="ex: 9flMUzLxQtxohKGZjU5"/>
                <p className="text-[10px] text-gray-400 mt-1">Token do usuário com acesso admin/master</p>
              </div>
              <div>
                <label className={LBL}>Sincronização automática</label>
                <select className={INP} value={form.syncFrequency} onChange={e=>setForm(f=>({...f,syncFrequency:e.target.value}))}>
                  <option value="manual">Somente manual</option>
                  <option value="daily">Diária (todo dia às 7h BRT)</option>
                  <option value="weekly">Semanal (segunda-feira)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={testConn} disabled={testing}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors">
                  {testing ? 'Testando...' : 'Testar conexão'}
                </button>
                <button type="submit" className="px-4 py-2 bg-[#FF6B00] text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors">
                  Salvar e ativar integração
                </button>
              </div>
            </form>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="text-sm font-semibold text-gray-900 mb-4">Como obter as credenciais</div>
            <div className="space-y-4">
              {[
                {n:1,t:'Acesse o RunRun.it como administrador',d:'Entre na sua conta com usuário master (admin)'},
                {n:2,t:'Vá em Configurações',d:'Menu superior direito → Configurações → aba "API e Integrações"'},
                {n:3,t:'Copie a App-Key',d:'É a chave única da empresa — compartilhada por todos os usuários'},
                {n:4,t:'Copie o User-Token',d:'Token pessoal do usuário master — necessário para acesso a todos os dados'},
                {n:5,t:'Cole os dois campos ao lado',d:'Clique em "Testar conexão" para validar e depois "Salvar e ativar"'},
              ].map(s=>(
                <div key={s.n} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center text-[10px] font-semibold text-orange-600 flex-shrink-0 mt-0.5">{s.n}</div>
                  <div><div className="text-xs font-medium text-gray-800">{s.t}</div><div className="text-[11px] text-gray-400 mt-0.5">{s.d}</div></div>
                </div>
              ))}
            </div>
            <div className="mt-5 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="text-xs font-medium text-orange-800 mb-1">Endpoints utilizados</div>
              {[
                'GET /api/v1.0/users — usuários com time_worked',
                'GET /api/v1.0/timesheets — registros de horas por período',
                'GET /api/v1.0/clients — clientes com budgeted_hours_month',
              ].map(e=><div key={e} className="text-[10.5px] text-orange-700 font-mono mt-0.5">{e}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* ── VÍNCULOS ── */}
      {tab==='vinculos' && (
        <div className="space-y-4">
          {!config && <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0"/>Configure a integração na aba "Configuração" antes de vincular usuários.</div>}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-medium text-gray-800">Vínculo profitOS ↔ RunRun.it</div>
              <div className="text-xs text-gray-400 mt-0.5">{links.length} de {colabs.length} colaboradores vinculados</div>
            </div>
            {rrUsers.length === 0 && config && (
              <button onClick={fetchUsers} className="px-4 py-2 bg-[#FF6B00] text-white text-xs font-medium rounded-lg hover:bg-orange-600">
                Carregar usuários do RunRun.it
              </button>
            )}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase">Colaborador (profitOS)</th>
                <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase">Usuário RunRun.it</th>
                <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase">Horas este mês (RR)</th>
                <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase">Status</th>
              </tr></thead>
              <tbody>
                {colabs.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Nenhum colaborador cadastrado. Acesse Time / Alocações para adicionar.</td></tr>}
                {colabs.map(c => {
                  const link = links.find(l => l.collaboratorId === c.id);
                  const rrU  = rrUsers.find(u => u.id === link?.runrunUserId);
                  return (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div style={{width:24,height:24,borderRadius:6,background:avc(c.id),display:'flex',alignItems:'center',justifyContent:'center',fontSize:8.5,fontWeight:500,color:'#fff',flexShrink:0}}>{ini(c.name)}</div>
                          <div><div className="font-medium text-gray-800">{c.name}</div><div className="text-[10px] text-gray-400">{c.position}</div></div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <select className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-800 w-full max-w-[260px]"
                          value={link?.runrunUserId || ''} onChange={e => saveLink(c.id, e.target.value)}>
                          <option value="">— Selecionar usuário RunRun.it —</option>
                          {rrUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                        </select>
                        {rrUsers.length === 0 && <span className="text-[11px] text-gray-400 italic">Carregue os usuários acima</span>}
                      </td>
                      <td className="text-right text-xs font-medium text-orange-600 tabular-nums pr-4">{rrU ? Math.round(rrU.time_worked/60)+'h' : '—'}</td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${link ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {link ? 'Vinculado' : 'Não vinculado'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── COMPARATIVO ── */}
      {tab==='comparativo' && (
        <div className="space-y-4">
          {!config && <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0"/>Configure a integração primeiro e clique em "Sincronizar agora".</div>}
          <div className="grid grid-cols-4 gap-3">
            {[
              {l:'Horas alocadas',v:totAloc.toFixed(0)+'h',s:'profitOS este mês',c:'#2563EB',acc:'#2563EB'},
              {l:'Horas reais (RR)',v:totReal.toFixed(0)+'h',s:'RunRun.it este mês',c:'#FF6B00',acc:'#FF6B00'},
              {l:'Acima do plano',v:String(overload),s:'colaboradores >115%',c:overload>0?'#DC3545':'#1A6B4A',acc:overload>0?'#DC3545':'#1A6B4A'},
              {l:'Abaixo do plano',v:String(under),s:'colaboradores <85%',c:under>0?'#E67E22':'#1A6B4A',acc:under>0?'#E67E22':'#1A6B4A'},
            ].map(k=>(
              <div key={k.l} className="bg-gray-50 rounded-xl p-3 relative overflow-hidden">
                <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:k.acc}}/>
                <div className="text-[9.5px] text-gray-400 uppercase tracking-wider font-medium mb-1">{k.l}</div>
                <div className="text-lg font-semibold tabular-nums" style={{color:k.c}}>{k.v}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{k.s}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mb-1">
            {[{c:'#2563EB',l:'Alocadas (profitOS)'},{c:'#FF6B00',l:'Reais (RunRun.it)'}].map(i=>(
              <span key={i.l} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:i.c}}/>{i.l}
              </span>
            ))}
          </div>
          {comparison.length > 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div style={{position:'relative',width:'100%',height:280}}><canvas ref={compRef}/></div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
              </div>
              <div className="text-sm font-medium text-gray-700 mb-1">Nenhum dado ainda</div>
              <div className="text-xs text-gray-400 mb-4">Configure a integração, vincule os usuários e clique em "Sincronizar agora"</div>
              <button onClick={()=>setTab('config')} className="px-4 py-2 bg-[#FF6B00] text-white text-xs font-medium rounded-lg hover:bg-orange-600">
                Configurar agora
              </button>
            </div>
          )}
          {comparison.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100"><span className="text-xs font-medium text-gray-700">Detalhamento por colaborador</span></div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-[10px] font-medium text-gray-400 uppercase">Colaborador</th>
                  <th className="text-right py-2.5 text-[10px] font-medium text-gray-400 uppercase">Alocadas</th>
                  <th className="text-right py-2.5 text-[10px] font-medium text-gray-400 uppercase">Reais (RR)</th>
                  <th className="text-right py-2.5 text-[10px] font-medium text-gray-400 uppercase">Diferença</th>
                  <th className="py-2.5 text-[10px] font-medium text-gray-400 uppercase">% realizado</th>
                  <th className="py-2.5 text-[10px] font-medium text-gray-400 uppercase">Diagnóstico</th>
                </tr></thead>
                <tbody>
                  {comparison.map(c => {
                    const dColor = c.diff > 5 ? '#E67E22' : c.diff < -5 ? '#DC3545' : '#1A6B4A';
                    return (
                      <tr key={c.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div style={{width:24,height:24,borderRadius:6,background:avc(c.id),display:'flex',alignItems:'center',justifyContent:'center',fontSize:8.5,fontWeight:500,color:'#fff',flexShrink:0}}>{ini(c.name)}</div>
                            <div><div className="font-medium text-gray-800">{c.name}</div><div className="text-[10px] text-gray-400">{c.position}</div></div>
                          </div>
                        </td>
                        <td className="text-right font-medium text-blue-600 tabular-nums pr-2">{c.allocatedHours}h</td>
                        <td className="text-right font-medium tabular-nums pr-2" style={{color:'#FF6B00'}}>{c.realHours}h</td>
                        <td className="text-right font-medium tabular-nums pr-3" style={{color:dColor}}>{c.diff>0?'+':''}{c.diff}h</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div style={{height:'100%',width:`${Math.min(150,c.pct)}%`,background:c.pct>115?'#DC3545':c.pct<85?'#E67E22':'#1A6B4A',borderRadius:'9999px'}}/>
                            </div>
                            <span className="text-[11px] font-medium" style={{color:c.pct>115?'#DC3545':c.pct<85?'#E67E22':'#1A6B4A'}}>{c.pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_CLS[c.status]||'bg-gray-100 text-gray-500'}`}>
                            {STATUS_LABEL[c.status]||c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── POR PROJETO ── */}
      {tab==='projetos' && (
        <div className="space-y-4">
          {!config || comparison.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
              </div>
              <div className="text-sm font-medium text-gray-700 mb-1">Sincronize para ver os dados por projeto</div>
              <div className="text-xs text-gray-400 mb-4">Os timesheets do RunRun.it são agrupados por cliente/projeto após a sincronização</div>
              <button onClick={()=>setTab('config')} className="px-4 py-2 bg-[#FF6B00] text-white text-xs font-medium rounded-lg hover:bg-orange-600">
                {config ? 'Sincronizar na aba comparativo' : 'Configurar integração'}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="text-sm font-medium text-gray-800 mb-1">Horas por projeto (via RunRun.it)</div>
              <p className="text-xs text-gray-400 mb-4">Dados agrupados por cliente com base nos timesheets sincronizados</p>
              <div className="text-xs text-gray-400 text-center py-8">Após a sincronização com credenciais reais, os projetos aparecerão aqui agrupados por cliente.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
