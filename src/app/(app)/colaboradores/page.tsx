'use client';
import { useState, useEffect } from 'react';
import { Card, Grid4, KPICard, Alert } from '@/components/ui';
import { BRL } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Collaborator {
  id: string;
  name: string;
  position: string;
  type: string;
  salary: number;
  hoursPerMonth: number;
  isActive: boolean;
  notes: string | null;
  costPerHour: number;
  totalAllocatedCost: number;
  allocatedHours: number;
  occupancyPct: number;
  // extended fields
  birthDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;          // CPF
  pixKey?: string | null;
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  bankAccountType?: string | null;
  paymentMethod?: string | null;
  paymentDay?: number | null;
  address?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  allocations: { id:string; client:{name:string}; serviceType:string; allocatedCost:number }[];
}

const EMPTY_FORM = {
  // Identification
  name: '', position: '', type: 'PJ', document: '', email: '', phone: '',
  // Contract
  salary: '', hoursPerMonth: '160', startDate: '', endDate: '',
  // Payment
  paymentMethod: 'PIX', paymentDay: '5',
  pixKey: '', bankName: '', bankAgency: '', bankAccount: '', bankAccountType: 'CORRENTE',
  // Personal
  birthDate: '', address: '', emergencyContact: '', emergencyPhone: '',
  notes: '',
};

const TYPE_COLOR: Record<string,string> = {
  PJ: 'bg-blue-50 text-blue-700',
  CLT: 'bg-purple-50 text-purple-700',
};
const AVC = ['#1A6B4A','#2563EB','#7C3AED','#DC3545','#E67E22','#0891B2','#DB2777','#65A30D'];
const ini = (n:string) => n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const avc = (id:string) => AVC[parseInt(id.replace(/\D/g,'').slice(-2)||'0')%AVC.length];
const fmt = (d:string|null|undefined) => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—';

// ─── Section title ────────────────────────────────────────────────────────────
function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full mt-2 mb-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-100">
        {children}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ColaboradoresPage() {
  const [colabs,    setColabs]    = useState<Collaborator[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string|null>(null);
  const [viewId,    setViewId]    = useState<string|null>(null);
  const [form,      setForm]      = useState({...EMPTY_FORM});
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [search,    setSearch]    = useState('');
  const [typeF,     setTypeF]     = useState('');
  const [activeF,   setActiveF]   = useState('active');
  const [error,     setError]     = useState('');

  useEffect(() => { fetchColabs(); }, []);

  async function fetchColabs() {
    setLoading(true);
    try {
      const res = await fetch('/api/collaborators');
      if (res.ok) setColabs(await res.json());
    } finally { setLoading(false); }
  }

  const F = (k: string, v: any) => setForm(f => ({...f, [k]: v}));

  function openNew() {
    setEditId(null); setViewId(null);
    setForm({...EMPTY_FORM, startDate: new Date().toISOString().slice(0,10)});
    setError('');
    setShowForm(true);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function openEdit(c: Collaborator) {
    setEditId(c.id); setViewId(null);
    setForm({
      name: c.name, position: c.position, type: c.type,
      document: (c as any).document || '',
      email: c.email || '', phone: c.phone || '',
      salary: String(c.salary), hoursPerMonth: String(c.hoursPerMonth),
      startDate: (c as any).startDate?.slice(0,10) || '',
      endDate: (c as any).endDate?.slice(0,10) || '',
      paymentMethod: (c as any).paymentMethod || 'PIX',
      paymentDay: String((c as any).paymentDay || 5),
      pixKey: (c as any).pixKey || '',
      bankName: (c as any).bankName || '',
      bankAgency: (c as any).bankAgency || '',
      bankAccount: (c as any).bankAccount || '',
      bankAccountType: (c as any).bankAccountType || 'CORRENTE',
      birthDate: (c as any).birthDate?.slice(0,10) || '',
      address: (c as any).address || '',
      emergencyContact: (c as any).emergencyContact || '',
      emergencyPhone: (c as any).emergencyPhone || '',
      notes: c.notes || '',
    });
    setError('');
    setShowForm(true);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const payload = {
      name: form.name, position: form.position, type: form.type,
      salary: parseFloat(form.salary)||0, hoursPerMonth: parseInt(form.hoursPerMonth)||160,
      document: form.document||null, email: form.email||null, phone: form.phone||null,
      startDate: form.startDate||null, endDate: form.endDate||null,
      paymentMethod: form.paymentMethod||null, paymentDay: parseInt(form.paymentDay)||5,
      pixKey: form.pixKey||null, bankName: form.bankName||null,
      bankAgency: form.bankAgency||null, bankAccount: form.bankAccount||null,
      bankAccountType: form.bankAccountType||null,
      birthDate: form.birthDate||null, address: form.address||null,
      emergencyContact: form.emergencyContact||null, emergencyPhone: form.emergencyPhone||null,
      notes: form.notes||null,
    };
    try {
      const url    = editId ? `/api/collaborators/${editId}` : '/api/collaborators';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true); setTimeout(()=>setSaved(false), 3000);
        setShowForm(false); setEditId(null); fetchColabs();
      } else {
        const d = await res.json(); setError(d.error||'Erro ao salvar.');
      }
    } catch { setError('Erro de conexão.'); }
    finally { setSaving(false); }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/collaborators/${id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({isActive: !active}),
    });
    fetchColabs();
  }

  async function deleteColab(id: string, name: string) {
    if (!confirm(`Remover ${name}? As alocações existentes serão desvinculadas.`)) return;
    await fetch(`/api/collaborators/${id}`, {method:'DELETE'});
    fetchColabs();
  }

  // Filters
  const filtered = colabs.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.position.toLowerCase().includes(q);
    const matchT = !typeF || c.type === typeF;
    const matchA = activeF === 'active' ? c.isActive : activeF === 'inactive' ? !c.isActive : true;
    return matchQ && matchT && matchA;
  });

  const active   = colabs.filter(c=>c.isActive);
  const folha    = active.reduce((s,c)=>s+c.salary, 0);
  const custAloc = active.reduce((s,c)=>s+c.totalAllocatedCost, 0);
  const avgOcup  = active.length>0 ? active.reduce((s,c)=>s+c.occupancyPct,0)/active.length : 0;

  const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors bg-white";
  const lbl = "block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  // ── Detail view ─────────────────────────────────────────────────────────────
  const viewColab = viewId ? colabs.find(c=>c.id===viewId) : null;
  if (viewColab) {
    const oc = viewColab.occupancyPct>95?'text-red-600':viewColab.occupancyPct>75?'text-amber-600':'text-green-700';
    const bc = viewColab.occupancyPct>95?'bg-red-500':viewColab.occupancyPct>75?'bg-amber-500':'bg-[#1A6B4A]';
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={()=>setViewId(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Ficha do colaborador</h1>
          <div className="ml-auto flex gap-2">
            <button onClick={()=>openEdit(viewColab)}
              className="px-4 py-1.5 text-sm font-medium text-[#1A6B4A] border border-[#1A6B4A] rounded-lg hover:bg-[#E8F5EF] transition-colors">
              Editar
            </button>
          </div>
        </div>

        {/* Header card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-semibold text-white flex-shrink-0"
              style={{background:avc(viewColab.id)}}>
              {ini(viewColab.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900">{viewColab.name}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLOR[viewColab.type]||'bg-gray-100 text-gray-600'}`}>{viewColab.type}</span>
                {!viewColab.isActive && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Inativo</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{viewColab.position}</p>
              {(viewColab as any).email && <p className="text-xs text-gray-400 mt-0.5">{(viewColab as any).email}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {l:'Salário/honorário', v:BRL(viewColab.salary), c:'#2563EB'},
              {l:'Custo/hora',        v:BRL(viewColab.costPerHour)+'/h', c:'#374151'},
              {l:'Custo alocado',     v:BRL(viewColab.totalAllocatedCost), c:'#DC3545'},
              {l:'Ocupação',          v:viewColab.occupancyPct.toFixed(0)+'%', c:viewColab.occupancyPct>95?'#DC3545':'#1A6B4A'},
            ].map(k=>(
              <div key={k.l} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[9.5px] text-gray-400 uppercase tracking-wider">{k.l}</p>
                <p className="text-base font-semibold mt-1 tabular-nums" style={{color:k.c}}>{k.v}</p>
              </div>
            ))}
          </div>
          {/* Occupation bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500">Capacidade utilizada</span>
              <span className={`font-medium ${oc}`}>{viewColab.allocatedHours.toFixed(0)}h / {viewColab.hoursPerMonth}h</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${bc}`}
                style={{width:`${Math.min(100,viewColab.occupancyPct).toFixed(0)}%`}}/>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contract info */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">Informações contratuais</h3>
            <dl className="space-y-2.5">
              {[
                ['Tipo de contrato', viewColab.type==='PJ'?'Pessoa Jurídica (PJ)':'CLT'],
                ['CPF/Documento', (viewColab as any).document || '—'],
                ['Telefone', (viewColab as any).phone || '—'],
                ['Data de entrada', fmt((viewColab as any).startDate)],
                ['Data de saída', fmt((viewColab as any).endDate)],
                ['Horas disponíveis', viewColab.hoursPerMonth+'h/mês'],
              ].map(([l,v])=>(
                <div key={l} className="flex justify-between text-sm">
                  <dt className="text-gray-500">{l}</dt>
                  <dd className="font-medium text-gray-800 text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Payment info */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">Dados de pagamento</h3>
            <dl className="space-y-2.5">
              {[
                ['Método', (viewColab as any).paymentMethod || '—'],
                ['Dia de pagamento', (viewColab as any).paymentDay ? `Dia ${(viewColab as any).paymentDay}` : '—'],
                ['Chave PIX', (viewColab as any).pixKey || '—'],
                ['Banco', (viewColab as any).bankName || '—'],
                ['Agência', (viewColab as any).bankAgency || '—'],
                ['Conta', (viewColab as any).bankAccount ? `${(viewColab as any).bankAccount} (${(viewColab as any).bankAccountType||'—'})` : '—'],
              ].map(([l,v])=>(
                <div key={l} className="flex justify-between text-sm">
                  <dt className="text-gray-500">{l}</dt>
                  <dd className="font-medium text-gray-800 text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Personal info */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">Informações pessoais</h3>
            <dl className="space-y-2.5">
              {[
                ['Data de nascimento', fmt((viewColab as any).birthDate)],
                ['Endereço', (viewColab as any).address || '—'],
                ['Contato de emergência', (viewColab as any).emergencyContact || '—'],
                ['Tel. emergência', (viewColab as any).emergencyPhone || '—'],
              ].map(([l,v])=>(
                <div key={l} className="flex justify-between text-sm">
                  <dt className="text-gray-500">{l}</dt>
                  <dd className="font-medium text-gray-800 text-right max-w-[60%] text-right">{v}</dd>
                </div>
              ))}
              {viewColab.notes && (
                <div className="pt-2 border-t border-gray-50">
                  <p className="text-xs text-gray-500 mb-1">Observações</p>
                  <p className="text-sm text-gray-700">{viewColab.notes}</p>
                </div>
              )}
            </dl>
          </div>

          {/* Allocations */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Projetos alocados ({viewColab.allocations.length})
            </h3>
            {viewColab.allocations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sem alocações — acesse Time / Alocações para atribuir projetos</p>
            ) : (
              <div className="space-y-2">
                {viewColab.allocations.map(a=>(
                  <div key={a.id} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800">{a.client.name.slice(0,24)}</p>
                      <p className="text-[10.5px] text-gray-400">{a.serviceType}</p>
                    </div>
                    <span className="font-semibold text-red-600 tabular-nums">{BRL(a.allocatedCost)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── List + Form view ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Colaboradores</h1>
          <p className="text-xs text-gray-400 mt-0.5">{active.length} ativos · {colabs.length} cadastrados</p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <a href="/api/export?type=collaborators" download>
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar CSV
              </button>
            </a>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo colaborador
            </button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <Grid4>
        <KPICard label="Ativos"         value={String(active.length)}     sub={`de ${colabs.length} cadastrados`} color="blue"/>
        <KPICard label="Folha total"    value={BRL(folha)}                sub="/mês" color="red"   accentColor="#DC3545"/>
        <KPICard label="Custo alocado" value={BRL(custAloc)}             sub={`${folha>0?(custAloc/folha*100).toFixed(0):0}% da folha`} color="amber" accentColor="#E67E22"/>
        <KPICard label="Ocupação média" value={`${avgOcup.toFixed(0)}%`} sub="do time" color={avgOcup>90?'red':avgOcup>70?'amber':'green'}/>
      </Grid4>

      {saved && <Alert variant="ok">Colaborador salvo com sucesso!</Alert>}

      {/* Form */}
      {showForm && (
        <Card title={editId?'Editar colaborador':'Novo colaborador'} subtitle="Preencha os campos — os marcados com * são obrigatórios">
          <form onSubmit={handleSubmit} className="space-y-0">
            {error && <Alert variant="danger">{error}</Alert>}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">

              {/* ── IDENTIFICAÇÃO ── */}
              <SecTitle>Identificação</SecTitle>

              <div className="sm:col-span-2">
                <label className={lbl}>Nome completo *</label>
                <input required className={inp} value={form.name}
                  onChange={e=>F('name',e.target.value)} placeholder="Ex: Beatriz Roisin Rodrigues"/>
              </div>
              <div>
                <label className={lbl}>Cargo / função *</label>
                <input required className={inp} value={form.position}
                  onChange={e=>F('position',e.target.value)} placeholder="Ex: Performance Manager"/>
              </div>
              <div>
                <label className={lbl}>CPF</label>
                <input className={inp} value={form.document}
                  onChange={e=>F('document',e.target.value)} placeholder="000.000.000-00"/>
              </div>
              <div>
                <label className={lbl}>E-mail</label>
                <input type="email" className={inp} value={form.email}
                  onChange={e=>F('email',e.target.value)} placeholder="nome@empresa.com"/>
              </div>
              <div>
                <label className={lbl}>Telefone / WhatsApp</label>
                <input className={inp} value={form.phone}
                  onChange={e=>F('phone',e.target.value)} placeholder="(11) 99999-9999"/>
              </div>

              {/* ── CONTRATO ── */}
              <SecTitle>Contrato e remuneração</SecTitle>

              <div>
                <label className={lbl}>Tipo de vínculo *</label>
                <select className={inp} value={form.type} onChange={e=>F('type',e.target.value)}>
                  <option value="PJ">PJ — Pessoa Jurídica</option>
                  <option value="CLT">CLT — incluir todos os encargos</option>
                </select>
              </div>
              <div>
                <label className={lbl}>
                  {form.type==='CLT' ? 'Salário + encargos totais (R$) *' : 'Honorário mensal (R$) *'}
                </label>
                <input required type="number" min="0" step="100" className={inp}
                  value={form.salary} onChange={e=>F('salary',e.target.value)} placeholder="6000"/>
                {form.salary && form.hoursPerMonth && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Custo/hora: {BRL(parseFloat(form.salary)/parseInt(form.hoursPerMonth))}
                  </p>
                )}
              </div>
              <div>
                <label className={lbl}>Horas disponíveis/mês</label>
                <input type="number" min="1" max="300" className={inp}
                  value={form.hoursPerMonth} onChange={e=>F('hoursPerMonth',e.target.value)}/>
                <p className="text-[10px] text-gray-400 mt-1">Padrão: 160h</p>
              </div>
              <div>
                <label className={lbl}>Data de entrada</label>
                <input type="date" className={inp} value={form.startDate}
                  onChange={e=>F('startDate',e.target.value)}/>
              </div>
              <div>
                <label className={lbl}>Data de saída (se encerrado)</label>
                <input type="date" className={inp} value={form.endDate}
                  onChange={e=>F('endDate',e.target.value)}/>
                <p className="text-[10px] text-gray-400 mt-1">Deixe em branco se ainda ativo</p>
              </div>

              {/* ── PAGAMENTO ── */}
              <SecTitle>Dados de pagamento</SecTitle>

              <div>
                <label className={lbl}>Método de pagamento</label>
                <select className={inp} value={form.paymentMethod} onChange={e=>F('paymentMethod',e.target.value)}>
                  <option value="PIX">PIX</option>
                  <option value="TED">TED</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="DINHEIRO">Dinheiro</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Dia de pagamento</label>
                <input type="number" min="1" max="31" className={inp}
                  value={form.paymentDay} onChange={e=>F('paymentDay',e.target.value)}
                  placeholder="5"/>
                <p className="text-[10px] text-gray-400 mt-1">Dia do mês para efetuar o pagamento</p>
              </div>
              {(form.paymentMethod==='PIX'||form.paymentMethod==='') && (
                <div>
                  <label className={lbl}>Chave PIX</label>
                  <input className={inp} value={form.pixKey}
                    onChange={e=>F('pixKey',e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória"/>
                </div>
              )}
              {(form.paymentMethod==='TED'||form.paymentMethod==='BOLETO') && (
                <>
                  <div>
                    <label className={lbl}>Banco</label>
                    <input className={inp} value={form.bankName}
                      onChange={e=>F('bankName',e.target.value)} placeholder="Ex: Itaú, Bradesco, Nubank"/>
                  </div>
                  <div>
                    <label className={lbl}>Agência</label>
                    <input className={inp} value={form.bankAgency}
                      onChange={e=>F('bankAgency',e.target.value)} placeholder="0000"/>
                  </div>
                  <div>
                    <label className={lbl}>Número da conta</label>
                    <input className={inp} value={form.bankAccount}
                      onChange={e=>F('bankAccount',e.target.value)} placeholder="00000-0"/>
                  </div>
                  <div>
                    <label className={lbl}>Tipo de conta</label>
                    <select className={inp} value={form.bankAccountType} onChange={e=>F('bankAccountType',e.target.value)}>
                      <option value="CORRENTE">Conta Corrente</option>
                      <option value="POUPANCA">Conta Poupança</option>
                      <option value="PAGAMENTO">Conta de Pagamento</option>
                    </select>
                  </div>
                </>
              )}

              {/* ── PESSOAL ── */}
              <SecTitle>Informações pessoais</SecTitle>

              <div>
                <label className={lbl}>Data de nascimento</label>
                <input type="date" className={inp} value={form.birthDate}
                  onChange={e=>F('birthDate',e.target.value)}/>
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Endereço completo</label>
                <input className={inp} value={form.address}
                  onChange={e=>F('address',e.target.value)}
                  placeholder="Rua, número, complemento, bairro, cidade, UF"/>
              </div>
              <div>
                <label className={lbl}>Contato de emergência</label>
                <input className={inp} value={form.emergencyContact}
                  onChange={e=>F('emergencyContact',e.target.value)} placeholder="Nome do contato"/>
              </div>
              <div>
                <label className={lbl}>Telefone de emergência</label>
                <input className={inp} value={form.emergencyPhone}
                  onChange={e=>F('emergencyPhone',e.target.value)} placeholder="(11) 99999-9999"/>
              </div>

              {/* ── OBSERVAÇÕES ── */}
              <SecTitle>Observações internas</SecTitle>

              <div className="sm:col-span-3">
                <textarea className={`${inp} resize-none`} rows={2}
                  value={form.notes} onChange={e=>F('notes',e.target.value)}
                  placeholder="Especialidades, ferramentas, contexto, observações gerais..."/>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-5 border-t border-gray-100 mt-5">
              <button type="submit" disabled={saving}
                className="px-5 py-2.5 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-green-800 disabled:opacity-60 transition-colors">
                {saving ? 'Salvando...' : editId ? 'Atualizar colaborador' : 'Cadastrar colaborador'}
              </button>
              <button type="button"
                onClick={()=>{setShowForm(false);setEditId(null);setError('');}}
                className="px-5 py-2.5 text-gray-600 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 flex-wrap">
          <input
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#1A6B4A] w-52"
            placeholder="Buscar por nome ou cargo..."
            value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="flex gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
            {[['','Todos'],['PJ','PJ'],['CLT','CLT']].map(([v,l])=>(
              <button key={v} onClick={()=>setTypeF(v)}
                className={`px-3 py-1 rounded-md text-[11px] transition-all ${typeF===v?'bg-white text-gray-800 font-medium shadow-sm':'text-gray-500'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
            {[['active','Ativos'],['inactive','Inativos'],['','Todos']].map(([v,l])=>(
              <button key={v} onClick={()=>setActiveF(v)}
                className={`px-3 py-1 rounded-md text-[11px] transition-all ${activeF===v?'bg-white text-gray-800 font-medium shadow-sm':'text-gray-500'}`}>
                {l}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} resultado{filtered.length!==1?'s':''}</span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">👥</div>
            <p className="text-sm font-medium text-gray-600">
              {colabs.length===0 ? 'Nenhum colaborador cadastrado' : 'Nenhum resultado para o filtro aplicado'}
            </p>
            {colabs.length===0 && (
              <p className="text-xs text-gray-400 mt-1 mb-4">Cadastre a equipe para calcular alocações e custos reais por projeto</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(c=>{
              const occColor = c.occupancyPct>95?'text-red-600':c.occupancyPct>75?'text-amber-600':'text-green-700';
              const barColor = c.occupancyPct>95?'bg-red-500':c.occupancyPct>75?'bg-amber-500':'bg-[#1A6B4A]';
              return (
                <div key={c.id}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer ${!c.isActive?'opacity-55':''}`}
                  onClick={()=>setViewId(c.id)}>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                    style={{background:avc(c.id)}}>
                    {ini(c.name)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TYPE_COLOR[c.type]||'bg-gray-100 text-gray-600'}`}>{c.type}</span>
                      {!c.isActive && <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded">Inativo</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{c.position}</p>
                    {(c as any).email && <p className="text-[10.5px] text-gray-400 mt-0.5">{(c as any).email}</p>}
                    {c.allocations.length>0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.allocations.slice(0,3).map(a=>(
                          <span key={a.id} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                            {a.client.name.slice(0,14)}
                          </span>
                        ))}
                        {c.allocations.length>3&&<span className="text-[10px] text-gray-400">+{c.allocations.length-3}</span>}
                      </div>
                    )}
                  </div>
                  {/* Numbers */}
                  <div className="hidden sm:flex items-center gap-5 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide">Salário</div>
                      <div className="text-sm font-semibold text-gray-800 tabular-nums">{BRL(c.salary)}</div>
                      <div className="text-[10px] text-gray-400">{BRL(c.costPerHour)}/h</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide">Custo aloc.</div>
                      <div className="text-sm font-semibold text-red-600 tabular-nums">{BRL(c.totalAllocatedCost)}</div>
                      <div className="text-[10px] text-gray-400">{c.allocatedHours.toFixed(0)}h/{c.hoursPerMonth}h</div>
                    </div>
                    <div className="w-28">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Ocupação</span>
                        <span className={`text-[11px] font-semibold tabular-nums ${occColor}`}>{c.occupancyPct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`}
                          style={{width:`${Math.min(100,c.occupancyPct).toFixed(0)}%`}}/>
                      </div>
                    </div>
                  </div>
                  {/* Actions — stop propagation so row click doesn't interfere */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>openEdit(c)}
                      className="px-3 py-1 text-[11px] font-medium text-[#1A6B4A] border border-[#1A6B4A] rounded-lg hover:bg-[#E8F5EF] transition-colors">
                      Editar
                    </button>
                    <button onClick={()=>toggleActive(c.id,c.isActive)}
                      className={`px-3 py-1 text-[11px] font-medium border rounded-lg transition-colors ${c.isActive?'text-amber-600 border-amber-200 hover:bg-amber-50':'text-green-600 border-green-200 hover:bg-green-50'}`}>
                      {c.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={()=>deleteColab(c.id,c.name)}
                      className="px-3 py-1 text-[11px] font-medium text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
