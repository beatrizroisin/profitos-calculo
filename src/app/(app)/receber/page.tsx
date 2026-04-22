'use client';
import { useState, useEffect } from 'react';
import { Grid4, KPICard, Alert, Button, Pill, Card } from '@/components/ui';
import { BRL, SERVICE_TYPE_LABELS } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ClientEntry {
  clientId: string; clientName: string; serviceType: string;
  grossRevenue: number; taxRate: number; taxAmount: number; netRevenue: number;
  isRecurring: boolean; dueDay: number; dueDate: string;
  totalInstallments: number; currentInstallment: number; riskLevel: string;
}
interface MonthlyData {
  entries: ClientEntry[]; totalGross: number; totalTax: number;
  totalNet: number; count: number;
}
// Manual transaction (extra/eventual income)
interface Tx {
  id: string; description: string; amount: number; grossAmount: number|null;
  taxRate: number|null; dueDate: string; paidAt: string|null;
  isRecurring: boolean; status: string; notes: string|null;
  client: {id:string;name:string}|null;
}
interface Cat { id:string; name:string; }

const STATUS_PILL:  Record<string,any>    = { PENDING:'amber', PAID:'green', OVERDUE:'red', CANCELLED:'gray' };
const STATUS_LABEL: Record<string,string> = { PENDING:'Pendente', PAID:'Recebido', OVERDUE:'Vencido', CANCELLED:'Cancelado' };
const RISK_COLOR:   Record<string,string> = { LOW:'text-green-700', MEDIUM:'text-amber-600', HIGH:'text-red-600', CRITICAL:'text-red-700' };
const RISK_LABEL:   Record<string,string> = { LOW:'Baixo', MEDIUM:'Médio', HIGH:'Alto', CRITICAL:'Crítico' };

const EMPTY_TX = {
  description: '', amount: '', grossAmount: '', taxRate: '6',
  dueDate: new Date().toISOString().slice(0,10),
  paidAt: '', isRecurring: false, status: 'PENDING', clientId: '', categoryId: '', notes: '',
};

export default function ReceberPage() {
  const [monthly,   setMonthly]   = useState<MonthlyData|null>(null);
  const [txs,       setTxs]       = useState<Tx[]>([]);
  const [cats,      setCats]      = useState<Cat[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string|null>(null);
  const [form,      setForm]      = useState({ ...EMPTY_TX });
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState('');
  const [error,     setError]     = useState('');
  const [tab,       setTab]       = useState<'clientes'|'extras'>('clientes');
  // Paid tracking for client entries (in-memory toggle per session)
  const [paidClients, setPaidClients] = useState<Set<string>>(new Set());
  const [search,    setSearch]    = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [mRes, tRes, catRes] = await Promise.all([
      fetch('/api/clients/monthly-revenue'),
      fetch('/api/transactions?type=INCOME'),
      fetch('/api/categories?type=INCOME'),
    ]);
    if (mRes.ok)   setMonthly(await mRes.json());
    if (tRes.ok)   { const d = await tRes.json(); setTxs(d.transactions || []); }
    if (catRes.ok) setCats(await catRes.json());
    setLoading(false);
  }

  // ── Extra transaction form ────────────────────────────────────────────────
  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY_TX, dueDate: new Date().toISOString().slice(0,10) });
    setError('');
    setShowForm(true);
  }

  function openEdit(tx: Tx) {
    setEditId(tx.id);
    setForm({
      description: tx.description, amount: String(tx.amount),
      grossAmount: String(tx.grossAmount || tx.amount),
      taxRate: String(tx.taxRate || 6),
      dueDate: tx.dueDate.slice(0,10), paidAt: tx.paidAt?.slice(0,10) || '',
      isRecurring: tx.isRecurring, status: tx.status,
      clientId: tx.client?.id || '', categoryId: '', notes: tx.notes || '',
    });
    setError('');
    setShowForm(true);
  }

  function calcLiq() {
    const gr  = parseFloat(form.grossAmount as string) || 0;
    const tax = parseFloat(form.taxRate as string) || 0;
    return gr > 0 ? gr * (1 - tax / 100) : parseFloat(form.amount as string) || 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const gross = parseFloat(form.grossAmount as string) || null;
    const tax   = parseFloat(form.taxRate as string)    || null;
    const liq   = gross && tax !== null ? gross * (1 - (tax||0) / 100) : parseFloat(form.amount as string) || 0;
    const payload = {
      type: 'INCOME', description: form.description, amount: liq,
      grossAmount: gross, taxRate: tax, dueDate: form.dueDate,
      paidAt: form.paidAt || null, isRecurring: form.isRecurring,
      status: form.status, clientId: form.clientId || null,
      categoryId: (form as any).categoryId || null, notes: form.notes || null,
    };
    const url    = editId ? `/api/transactions/${editId}` : '/api/transactions';
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      setSaved(editId ? 'Lançamento atualizado.' : 'Lançamento extra adicionado.');
      setTimeout(() => setSaved(''), 3000);
      setShowForm(false); fetchAll();
    } else {
      const d = await res.json();
      setError(d.error || 'Erro ao salvar.');
    }
  }

  async function deleteTx(id: string) {
    if (!confirm('Excluir este lançamento?')) return;
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    setSaved('Excluído.'); setTimeout(() => setSaved(''), 2500); fetchAll();
  }

  function toggleClientPaid(clientId: string) {
    setPaidClients(prev => {
      const next = new Set(prev);
      next.has(clientId) ? next.delete(clientId) : next.add(clientId);
      return next;
    });
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredClients = (monthly?.entries || []).filter(e =>
    !search || e.clientName.toLowerCase().includes(search.toLowerCase())
  );
  const paidNet    = filteredClients.filter(e => paidClients.has(e.clientId)).reduce((s,e) => s + e.netRevenue, 0);
  const pendingNet = filteredClients.filter(e => !paidClients.has(e.clientId)).reduce((s,e) => s + e.netRevenue, 0);

  const txReceived = txs.filter(t => t.status === 'PAID').reduce((s,t)  => s + t.amount, 0);
  const txPending  = txs.filter(t => t.status === 'PENDING').reduce((s,t) => s + t.amount, 0);

  const totalMensalGross = monthly?.totalGross || 0;
  const totalMensalNet   = monthly?.totalNet   || 0;
  const totalMensalTax   = monthly?.totalTax   || 0;

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#1A6B4A]';
  const lbl = 'block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5';

  const now = new Date();
  const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Contas a receber</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {monthly?.count || 0} clientes ativos · {monthName}
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors">
          + Lançamento extra
        </button>
      </div>

      {saved && <Alert variant="ok">{saved}</Alert>}

      {/* KPIs */}
      <Grid4>
        <KPICard
          label="Receita líquida/mês"
          value={BRL(totalMensalNet)}
          sub={`bruto: ${BRL(totalMensalGross)}`}
          color="green" accentColor="#1A6B4A"
        />
        <KPICard
          label="Imposto mensal"
          value={BRL(totalMensalTax)}
          sub={`${totalMensalGross > 0 ? ((totalMensalTax/totalMensalGross)*100).toFixed(1) : 0}% da receita bruta`}
          color="amber"
        />
        <KPICard
          label="Recebido este mês"
          value={BRL(paidNet)}
          sub={`${paidClients.size} de ${monthly?.count||0} clientes`}
          color="green"
        />
        <KPICard
          label="Pendente este mês"
          value={BRL(pendingNet)}
          sub={`${(monthly?.count||0) - paidClients.size} clientes aguardando`}
          color="amber"
        />
      </Grid4>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 border border-gray-100 w-fit">
        {([['clientes','Mensalidades por cliente'],['extras','Lançamentos extras']] as const).map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab===k?'bg-white text-gray-800 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {l}
            {k==='extras' && txs.length > 0 && (
              <span className="ml-1.5 bg-blue-100 text-blue-700 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">{txs.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Mensalidades por cliente ── */}
      {tab === 'clientes' && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3 flex-wrap">
            <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1A6B4A]" />
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block"/>Recebido
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block ml-2"/>Pendente
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-gray-400">Carregando...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-medium text-gray-600">Nenhum cliente ativo encontrado</p>
              <p className="text-xs text-gray-400 mt-1">
                Cadastre clientes com status <strong>Ativo</strong> em{' '}
                <a href="/clientes" className="text-[#1A6B4A] underline">Clientes</a> para ver as mensalidades aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 780 }}>
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Serviço</th>
                    <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Tipo</th>
                    <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Vencimento</th>
                    <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Bruto/mês</th>
                    <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Imposto</th>
                    <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Líquido/mês</th>
                    <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Risco</th>
                    <th className="text-right py-3 pr-5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map(e => {
                    const isPaid = paidClients.has(e.clientId);
                    return (
                      <tr key={e.clientId}
                        className={`border-b border-gray-50 transition-colors ${isPaid ? 'bg-green-50/40' : 'hover:bg-gray-50/40'}`}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800 truncate max-w-[160px]">{e.clientName}</p>
                          {e.totalInstallments > 0 && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Parcela {e.currentInstallment}/{e.totalInstallments}
                            </p>
                          )}
                        </td>
                        <td className="py-3 text-gray-500 max-w-[120px]">
                          <span className="truncate block text-[10.5px]">{SERVICE_TYPE_LABELS[e.serviceType] || e.serviceType}</span>
                        </td>
                        <td className="py-3">
                          <span className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded-full ${
                            e.isRecurring ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {e.isRecurring ? 'Recorrente' : 'Pontual'}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-500">
                          dia {e.dueDay}
                        </td>
                        <td className="py-3 text-right text-gray-500 tabular-nums">{BRL(e.grossRevenue)}</td>
                        <td className="py-3 text-right text-amber-600 tabular-nums">
                          –{BRL(e.taxAmount)}
                          <span className="block text-[9px] text-gray-400">{e.taxRate}%</span>
                        </td>
                        <td className="py-3 text-right font-semibold text-green-700 tabular-nums">{BRL(e.netRevenue)}</td>
                        <td className="py-3">
                          <span className={`text-[10.5px] font-medium ${RISK_COLOR[e.riskLevel] || 'text-gray-500'}`}>
                            {RISK_LABEL[e.riskLevel] || e.riskLevel}
                          </span>
                        </td>
                        <td className="py-3 pr-5 text-right">
                          <button
                            onClick={() => toggleClientPaid(e.clientId)}
                            className={`px-3 py-1 rounded-lg text-[10.5px] font-medium transition-colors border ${
                              isPaid
                                ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'
                            }`}>
                            {isPaid ? '✓ Recebido' : 'Pendente'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filteredClients.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-100 bg-gray-50">
                      <td colSpan={4} className="px-5 py-2.5 text-[11px] text-gray-600 font-semibold">
                        Total — {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
                      </td>
                      <td className="py-2.5 text-right text-[11px] text-gray-600 tabular-nums font-semibold">
                        {BRL(filteredClients.reduce((s,e) => s + e.grossRevenue, 0))}
                      </td>
                      <td className="py-2.5 text-right text-[11px] text-amber-600 tabular-nums font-semibold">
                        –{BRL(filteredClients.reduce((s,e) => s + e.taxAmount, 0))}
                      </td>
                      <td className="py-2.5 text-right text-[11px] text-green-700 tabular-nums font-bold">
                        {BRL(filteredClients.reduce((s,e) => s + e.netRevenue, 0))}
                      </td>
                      <td colSpan={2}/>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Lançamentos extras ── */}
      {tab === 'extras' && (
        <>
          {/* Extra form */}
          {showForm && (
            <Card title={editId ? 'Editar lançamento extra' : 'Novo lançamento extra'}>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className={lbl}>Descrição *</label>
                    <input required className={inp} placeholder="Ex: Bônus projeto, ajuste de cobrança..."
                      value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
                  </div>
                  <div>
                    <label className={lbl}>Categoria</label>
                    <select className={inp} value={(form as any).categoryId} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))}>
                      <option value="">Sem categoria</option>
                      {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className={lbl}>Valor bruto (R$) *</label>
                    <input required type="number" min="0" step="0.01" className={inp}
                      value={form.grossAmount} onChange={e => setForm(f => ({...f, grossAmount: e.target.value}))} />
                  </div>
                  <div>
                    <label className={lbl}>Imposto (%)</label>
                    <input type="number" min="0" max="100" step="0.1" className={inp}
                      value={form.taxRate} onChange={e => setForm(f => ({...f, taxRate: e.target.value}))} />
                  </div>
                  <div>
                    <label className={lbl}>Líquido (calculado)</label>
                    <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-800 tabular-nums">
                      {BRL(calcLiq())}
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Vencimento</label>
                    <input type="date" className={inp} value={form.dueDate}
                      onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className={lbl}>Status</label>
                    <select className={inp} value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                      <option value="PENDING">Pendente</option>
                      <option value="PAID">Recebido</option>
                      <option value="OVERDUE">Vencido</option>
                      <option value="CANCELLED">Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Data de recebimento</label>
                    <input type="date" className={inp} value={form.paidAt}
                      onChange={e => setForm(f => ({...f, paidAt: e.target.value}))} />
                  </div>
                  <div>
                    <label className={lbl}>Observações</label>
                    <input className={inp} placeholder="Notas..."
                      value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
                  </div>
                </div>
                {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
                <div className="flex gap-3">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Salvando...' : editId ? 'Salvar' : 'Adicionar'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {txs.length} lançamento{txs.length !== 1 ? 's' : ''} extra{txs.length !== 1 ? 's' : ''}
                {txs.length > 0 && ` · ${BRL(txs.reduce((s,t) => s+t.amount, 0))} total`}
              </p>
              {!showForm && (
                <button onClick={openNew}
                  className="text-xs font-medium text-[#1A6B4A] hover:underline">
                  + Novo lançamento
                </button>
              )}
            </div>
            {txs.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">
                Nenhum lançamento extra. <button onClick={openNew} className="text-[#1A6B4A] underline">Adicionar →</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ minWidth: 700 }}>
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Descrição</th>
                      <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Vencimento</th>
                      <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Bruto</th>
                      <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Imposto</th>
                      <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Líquido</th>
                      <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-right py-3 pr-5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map(tx => {
                      const gross = tx.grossAmount || tx.amount;
                      const impV  = gross - tx.amount;
                      return (
                        <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-800 truncate max-w-[200px]">{tx.description}</p>
                            {tx.client && <p className="text-[10px] text-gray-400">{tx.client.name}</p>}
                          </td>
                          <td className="py-3 text-gray-500">{new Date(tx.dueDate).toLocaleDateString('pt-BR')}</td>
                          <td className="py-3 text-right text-gray-500 tabular-nums">{BRL(gross)}</td>
                          <td className="py-3 text-right text-amber-600 tabular-nums">–{BRL(impV)}</td>
                          <td className="py-3 text-right font-medium text-green-700 tabular-nums">{BRL(tx.amount)}</td>
                          <td className="py-3"><Pill label={STATUS_LABEL[tx.status]||tx.status} variant={STATUS_PILL[tx.status]||'gray'} /></td>
                          <td className="py-3 pr-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEdit(tx)} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                              <button onClick={() => deleteTx(tx.id)} className="text-[11px] text-red-500 hover:text-red-700">Excluir</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
