'use client';
import { useState, useEffect, useRef } from 'react';
import { Alert, Button, Pill, Card } from '@/components/ui';
import { BRL, SERVICE_TYPE_LABELS } from '@/lib/utils';

interface ClientEntry {
  clientId: string; clientName: string; serviceType: string;
  grossRevenue: number; taxRate: number; taxAmount: number; netRevenue: number;
  isRecurring: boolean; dueDay: number; dueDate: string;
  totalInstallments: number; currentInstallment: number; riskLevel: string;
  startDate?: string;
}
interface MonthlyData {
  entries: ClientEntry[]; totalGross: number; totalTax: number;
  totalNet: number; count: number;
}
interface Tx {
  id: string; description: string; amount: number; grossAmount: number|null;
  taxRate: number|null; dueDate: string; paidAt: string|null;
  isRecurring: boolean; status: string; notes: string|null;
  client: {id:string;name:string}|null;
}
interface Cat { id:string; name:string; }

const STATUS_PILL:  Record<string,any>    = { PENDING:'amber', PAID:'green', OVERDUE:'red', CANCELLED:'gray' };
const STATUS_LABEL: Record<string,string> = { PENDING:'Pendente', PAID:'Recebido', OVERDUE:'Vencido', CANCELLED:'Cancelado' };

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const EMPTY_TX = {
  description: '', amount: '', grossAmount: '', taxRate: '6',
  dueDate: new Date().toISOString().slice(0,10),
  paidAt: '', isRecurring: false, status: 'PENDING', clientId: '', categoryId: '', notes: '',
};

export default function ReceberPage() {
  const now = new Date();
  const todayDay = now.getDate();
  const todayStr = getToday();

  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthly, setMonthly]         = useState<MonthlyData|null>(null);
  const [txs, setTxs]                 = useState<Tx[]>([]);
  const [cats, setCats]               = useState<Cat[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState<string|null>(null);
  const [form, setForm]               = useState({ ...EMPTY_TX });
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState('');
  const [error, setError]             = useState('');
  const [tab, setTab]                 = useState<'clientes'|'extras'>('clientes');
  const [statusF, setStatusF]         = useState('');
  const [paidClients, setPaidClients] = useState<Set<string>>(new Set());
  const [search, setSearch]           = useState('');
  const [clientF, setClientF]         = useState('');
  const [showClientDrop, setShowClientDrop] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  const monthRef  = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  useEffect(() => { fetchAll(); }, [monthRef]);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientDrop(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchAll() {
    setLoading(true);
    const from = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const to   = new Date(year, month, 0).toISOString().slice(0, 10);
    const [mRes, tRes, catRes, paidRes] = await Promise.all([
      fetch(`/api/clients/monthly-revenue?year=${year}&month=${month}`),
      fetch(`/api/transactions?type=INCOME&from=${from}&to=${to}`),
      fetch('/api/categories?type=INCOME'),
      fetch(`/api/transactions?type=INCOME&status=PAID&from=${from}&to=${to}`),
    ]);
    if (mRes.ok)   setMonthly(await mRes.json());
    if (tRes.ok) {
      const d = await tRes.json();
      const sorted = (d.transactions || []).sort((a: any, b: any) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      setTxs(sorted);
    }
    if (catRes.ok) setCats(await catRes.json());
    if (paidRes.ok) {
      const paidData = await paidRes.json();
      const paidIds = new Set<string>(
        (paidData.transactions || [])
          .filter((t: any) => t.client?.id)
          .map((t: any) => t.client.id as string)
      );
      setPaidClients(paidIds);
    }
    setLoading(false);
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY_TX, dueDate: new Date().toISOString().slice(0,10) });
    setError(''); setShowForm(true);
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
    setError(''); setShowForm(true);
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

  async function toggleClientPaid(clientId: string, entry: ClientEntry) {
    const isPaid = paidClients.has(clientId);
    if (!isPaid) {
      const dueDay  = Math.min(entry.dueDay, 28);
      const dueDate = new Date(year, month - 1, dueDay);
      const payload = {
        type: 'INCOME', description: `Mensalidade — ${entry.clientName}`,
        amount: entry.netRevenue, grossAmount: entry.grossRevenue, taxRate: entry.taxRate,
        dueDate: dueDate.toISOString().slice(0, 10), paidAt: new Date().toISOString(),
        status: 'PAID', isRecurring: entry.isRecurring, clientId,
      };
      const res = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        setPaidClients(prev => new Set([...Array.from(prev), clientId]));
        setSaved('Recebimento registrado.'); setTimeout(() => setSaved(''), 3000);
      }
    } else {
      const from = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const to   = new Date(year, month, 0).toISOString().slice(0, 10);
      const res = await fetch(`/api/transactions?type=INCOME&status=PAID&from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        const tx = (data.transactions || []).find((t: any) => t.client?.id === clientId);
        if (tx) await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
      }
      setPaidClients(prev => { const next = new Set(prev); next.delete(clientId); return next; });
      setSaved('Recebimento desmarcado.'); setTimeout(() => setSaved(''), 3000);
    }
  }

  // Filtra por startDate — só mostra clientes cuja data de início já passou
  const selectedMonthEnd = new Date(year, month, 0);
  const validEntries = (monthly?.entries || []).filter(e => {
    if (!e.startDate) return true;
    return new Date(e.startDate) <= selectedMonthEnd;
  });

  // Ordena por dueDay ASC
  const sortedEntries = [...validEntries].sort((a, b) => a.dueDay - b.dueDay);

  // Determina status de cada entrada baseado em data
  function getEntryStatus(e: ClientEntry) {
    if (paidClients.has(e.clientId)) return 'PAID';
    if (isCurrentMonth) {
      if (e.dueDay < todayDay)  return 'OVERDUE';
      if (e.dueDay === todayDay) return 'TODAY';
      return 'PENDING';
    }
    // Mês passado = todos vencidos, mês futuro = todos a vencer
    const refDate = new Date(year, month - 1, e.dueDay);
    const today   = new Date(); today.setHours(0,0,0,0);
    if (refDate < today) return 'OVERDUE';
    if (refDate.toISOString().slice(0,10) === todayStr) return 'TODAY';
    return 'PENDING';
  }

  // Filtros
  const filteredClients = sortedEntries.filter(e => {
    const matchSearch = !search || e.clientName.toLowerCase().includes(search.toLowerCase());
    const matchClient = !clientF || e.clientId === clientF;
    const st = getEntryStatus(e);
    let matchStatus = true;
    if (statusF === 'PAID')    matchStatus = st === 'PAID';
    if (statusF === 'PENDING') matchStatus = st !== 'PAID';
    if (statusF === 'OVERDUE') matchStatus = st === 'OVERDUE';
    return matchSearch && matchClient && matchStatus;
  });

  // KPIs
  const vencidos  = filteredClients.filter(e => getEntryStatus(e) === 'OVERDUE');
  const venceHoje = filteredClients.filter(e => getEntryStatus(e) === 'TODAY');
  const aVencer   = filteredClients.filter(e => getEntryStatus(e) === 'PENDING');
  const pagos     = filteredClients.filter(e => getEntryStatus(e) === 'PAID');

  const vencidosAmt = vencidos.reduce((s, e)  => s + e.netRevenue, 0);
  const hojeAmt     = venceHoje.reduce((s, e) => s + e.netRevenue, 0);
  const aVencerAmt  = aVencer.reduce((s, e)   => s + e.netRevenue, 0);
  const pagosAmt    = pagos.reduce((s, e)     => s + e.netRevenue, 0);
  const totalAmt    = filteredClients.reduce((s, e) => s + e.netRevenue, 0);

  const uniqueClients = [...new Map(validEntries.map(e => [e.clientId, e.clientName])).entries()];

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#1A6B4A]';
  const lbl = 'block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Contas a receber</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filteredClients.length} clientes · {monthName}</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors">
          + Lançamento extra
        </button>
      </div>

      {saved && <Alert variant="ok">{saved}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filtros */}
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center">
        {/* Navegação mês */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="text-sm font-medium text-gray-700 capitalize min-w-[130px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        {/* Pesquisa */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="Pesquisar no período selecionado..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-xs bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none" />
          {search && <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 text-xs">✕</button>}
        </div>

        {/* Filtro cliente */}
        <div className="relative" ref={clientRef}>
          <button onClick={() => setShowClientDrop(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs transition-colors ${clientF ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            {clientF ? (uniqueClients.find(([id]) => id === clientF)?.[1] || 'Cliente').slice(0, 18) : 'Cliente'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          {showClientDrop && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[240px] max-h-[280px] overflow-y-auto">
              <div className="p-2">
                <button onClick={() => { setClientF(''); setShowClientDrop(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-50 ${!clientF ? 'font-medium text-blue-600' : 'text-gray-700'}`}>
                  Todos os clientes
                </button>
                {uniqueClients.map(([id, name]) => (
                  <button key={id} onClick={() => { setClientF(id); setShowClientDrop(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-50 flex items-center gap-2 ${clientF === id ? 'font-medium text-blue-600' : 'text-gray-700'}`}>
                    <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${clientF === id ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {clientF === id && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {clientF && <button onClick={() => setClientF('')} className="text-[11px] text-blue-600 hover:underline">Limpar filtros</button>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-[10px] text-red-400 font-medium uppercase tracking-wide">Vencidos (R$)</p>
          <p className="text-xl font-bold text-red-500 tabular-nums mt-0.5">{BRL(vencidosAmt)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{vencidos.length} clientes</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-[10px] text-orange-400 font-medium uppercase tracking-wide">Vencem hoje (R$)</p>
          <p className="text-xl font-bold text-orange-400 tabular-nums mt-0.5">{BRL(hojeAmt)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{venceHoje.length} clientes</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wide">A vencer (R$)</p>
          <p className="text-xl font-bold text-blue-500 tabular-nums mt-0.5">{BRL(aVencerAmt)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{aVencer.length} clientes</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-[10px] text-green-500 font-medium uppercase tracking-wide">Pagos (R$)</p>
          <p className="text-xl font-bold text-green-600 tabular-nums mt-0.5">{BRL(pagosAmt)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{pagos.length} clientes</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 md:col-span-1 col-span-2">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Total do período (R$)</p>
          <p className="text-xl font-bold text-blue-600 tabular-nums mt-0.5">{BRL(totalAmt)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{filteredClients.length} clientes</p>
        </div>
      </div>

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

      {/* TAB: Mensalidades */}
      {tab === 'clientes' && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3 flex-wrap">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[['','Todos'],['PAID','Recebidos'],['PENDING','Pendentes'],['OVERDUE','Vencidos']].map(([v,l]) => (
                <button key={v} onClick={() => setStatusF(v)}
                  className={`px-3 py-1 rounded-md text-[11px] transition-all ${statusF===v?'bg-white text-gray-800 font-medium shadow-sm':'text-gray-500'}`}>{l}</button>
              ))}
            </div>
            <span className="text-[11px] text-gray-400 ml-auto">{filteredClients.length} resultado(s)</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-gray-400">Carregando...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-medium text-gray-600">Nenhum cliente para este período</p>
              <p className="text-xs text-gray-400 mt-1">Clientes com data de início futura não aparecem aqui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 820 }}>
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Serviço</th>
                    <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Tipo</th>
                    <th className="text-center py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Vencimento</th>
                    <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Bruto/mês</th>
                    <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Imposto</th>
                    <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Líquido/mês</th>
                    <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 pr-5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map(e => {
                    const isPaid   = paidClients.has(e.clientId);
                    const st       = getEntryStatus(e);
                    const isOverdue = st === 'OVERDUE';
                    const isToday  = st === 'TODAY';
                    return (
                      <tr key={e.clientId}
                        className={`border-b border-gray-50 transition-colors ${isPaid ? 'bg-green-50/40' : isOverdue ? 'bg-red-50/30' : 'hover:bg-gray-50/40'}`}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800 truncate max-w-[160px]">{e.clientName}</p>
                          {e.totalInstallments > 0 && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Parcela {e.currentInstallment}/{e.totalInstallments}</p>
                          )}
                        </td>
                        <td className="py-3 text-gray-500 max-w-[120px]">
                          <span className="truncate block text-[10.5px]">{SERVICE_TYPE_LABELS[e.serviceType] || e.serviceType}</span>
                        </td>
                        <td className="py-3">
                          <span className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded-full ${e.isRecurring ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                            {e.isRecurring ? 'Recorrente' : 'Pontual'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`font-medium ${isOverdue ? 'text-red-500' : isToday ? 'text-orange-500' : 'text-gray-500'}`}>
                            dia {e.dueDay}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-500 tabular-nums">{BRL(e.grossRevenue)}</td>
                        <td className="py-3 text-right text-amber-600 tabular-nums">
                          –{BRL(e.taxAmount)}
                          <span className="block text-[9px] text-gray-400">{e.taxRate}%</span>
                        </td>
                        <td className="py-3 text-right font-semibold text-green-700 tabular-nums">{BRL(e.netRevenue)}</td>
                        <td className="py-3">
                          {isPaid ? (
                            <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">Recebido</span>
                          ) : isOverdue ? (
                            <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">Vencido</span>
                          ) : isToday ? (
                            <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">Vence hoje</span>
                          ) : (
                            <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">A vencer</span>
                          )}
                        </td>
                        <td className="py-3 pr-5 text-right">
                          <button onClick={() => toggleClientPaid(e.clientId, e)}
                            className={`px-3 py-1 rounded-lg text-[10.5px] font-medium transition-colors border ${
                              isPaid
                                ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'
                            }`}>
                            {isPaid ? '✓ Recebido' : 'Marcar pago'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
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
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Extras */}
      {tab === 'extras' && (
        <>
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
                  <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Salvando...' : editId ? 'Salvar' : 'Adicionar'}</Button>
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
              {!showForm && <button onClick={openNew} className="text-xs font-medium text-[#1A6B4A] hover:underline">+ Novo lançamento</button>}
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