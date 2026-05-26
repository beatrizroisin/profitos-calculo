'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, Grid4, KPICard, Alert, Button, Pill } from '@/components/ui';
import { BRL } from '@/lib/utils';

interface Bill {
  id: string; externalId: string; description: string;
  amount: number; amountPaid: number | null;
  dueDate: string; paymentDate: string | null;
  status: string; isRecurring: boolean;
  categoryName: string | null; supplierName: string | null;
  notes: string | null; monthRef: string; syncedAt: string;
}

interface ContaAzulStatus { connected: boolean; lastSyncAt: string | null; }

const STATUS_PILL:  Record<string, any>    = { PENDING: 'amber', PAID: 'green', OVERDUE: 'red', CANCELLED: 'gray' };
const STATUS_LABEL: Record<string, string> = { PENDING: 'Pendente', PAID: 'Pago', OVERDUE: 'Vencido', CANCELLED: 'Cancelado' };

export default function PagarPage() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [bills, setBills]       = useState<Bill[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [status, setStatus]     = useState<ContaAzulStatus>({ connected: false, lastSyncAt: null });
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [saved, setSaved]       = useState('');
  const [search, setSearch]     = useState('');
  const [statusF, setStatusF]   = useState('');
  const [supplierF, setSupplierF] = useState('');
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  const monthRef  = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  useEffect(() => { fetchStatus(); }, []);
  useEffect(() => { if (status.connected) { fetchBills(); fetchSuppliers(); } }, [monthRef, status.connected]);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setShowSupplierDrop(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchStatus() {
    const res = await fetch('/api/integrations/contaazul/status');
    if (res.ok) setStatus(await res.json());
    setLoading(false);
  }

  async function fetchSuppliers() {
    const res = await fetch(`/api/integrations/contaazul/bills?type=suppliers&monthRef=${monthRef}`);
    if (res.ok) setSuppliers(await res.json());
  }

  async function fetchBills() {
    setLoading(true);
    const params = new URLSearchParams({ monthRef });
    const res = await fetch(`/api/integrations/contaazul/bills?${params}`);
    if (res.ok) setBills(await res.json());
    setLoading(false);
  }

  async function syncNow() {
    setSyncing(true);
    const res = await fetch('/api/integrations/contaazul/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    setSyncing(false);
    if (res.ok) {
      setSaved('Sincronizado com sucesso!');
      setTimeout(() => setSaved(''), 3000);
      fetchBills();
    } else {
      setSaved('Erro ao sincronizar.');
      setTimeout(() => setSaved(''), 3000);
    }
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Filtros client-side
  const filtered = bills.filter(b => {
    const matchS = !search || b.description.toLowerCase().includes(search.toLowerCase()) || (b.supplierName || '').toLowerCase().includes(search.toLowerCase()) || (b.categoryName || '').toLowerCase().includes(search.toLowerCase());
    const matchF = !statusF || b.status === statusF;
    const matchSup = !supplierF || b.supplierName === supplierF;
    return matchS && matchF && matchSup;
  });

  // KPIs
  const today   = filtered.filter(b => b.dueDate.slice(0,10) === todayStr);
  const overdue = filtered.filter(b => b.status === 'OVERDUE');
  const pending = filtered.filter(b => b.status === 'PENDING' && b.dueDate.slice(0,10) > todayStr);
  const paid    = filtered.filter(b => b.status === 'PAID');
  const total    = filtered.reduce((s, b) => s + b.amount, 0);

  const overdueAmount = overdue.reduce((s, b) => s + b.amount, 0);
  const todayAmount   = today.reduce((s, b) => s + b.amount, 0);
  const pendingAmount = pending.reduce((s, b) => s + b.amount, 0);
  const paidAmount    = paid.reduce((s, b) => s + (b.amountPaid ?? b.amount), 0);

  if (!loading && !status.connected) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Contas a pagar</h1>
            <p className="text-sm text-gray-400 mt-0.5">Integração com Conta Azul</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">Conecte o Conta Azul</h2>
          <p className="text-sm text-gray-400 mb-6">Sincronize suas contas a pagar automaticamente todos os dias.</p>
          <a href="/api/integrations/contaazul/auth"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Conectar Conta Azul →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Contas a pagar</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {filtered.length} lançamentos · {monthName}
            {status.lastSyncAt && (
              <span className="ml-2 text-[10px] text-gray-300">
                · sync {new Date(status.lastSyncAt).toLocaleString('pt-BR')}
              </span>
            )}
          </p>
        </div>
        <Button variant="secondary" onClick={syncNow} disabled={syncing}>
          {syncing ? '⟳ Sincronizando...' : '⟳ Sincronizar'}
        </Button>
      </div>

      {saved && <Alert variant={saved.includes('Erro') ? 'danger' : 'ok'}>{saved}</Alert>}
      {overdue.length > 0 && (
        <Alert variant="danger">
          <strong>{overdue.length} lançamento(s) vencidos</strong> — {BRL(overdueAmount)} em atraso.
        </Alert>
      )}

      {/* Filtros superiores */}
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center">
        {/* Navegação mês */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="text-sm font-medium text-gray-700 capitalize min-w-[130px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        {/* Pesquisa */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Pesquisar no período selecionado..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-xs bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none" />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 text-xs">✕</button>
          )}
        </div>

        {/* Filtro Fornecedor */}
        <div className="relative" ref={supplierRef}>
          <button onClick={() => setShowSupplierDrop(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs transition-colors ${supplierF ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            {supplierF || 'Fornecedor'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          {showSupplierDrop && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[220px] max-h-[280px] overflow-y-auto">
              <div className="p-2">
                <button onClick={() => { setSupplierF(''); setShowSupplierDrop(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-50 ${!supplierF ? 'font-medium text-blue-600' : 'text-gray-700'}`}>
                  Selecionar todos
                </button>
                {suppliers.map(s => (
                  <button key={s} onClick={() => { setSupplierF(s); setShowSupplierDrop(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-50 flex items-center gap-2 ${supplierF === s ? 'font-medium text-blue-600' : 'text-gray-700'}`}>
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${supplierF === s ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {supplierF === s && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {supplierF && (
          <button onClick={() => setSupplierF('')} className="text-[11px] text-blue-600 hover:underline">Limpar filtros</button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-[10px] text-red-400 font-medium uppercase tracking-wide">Vencidos (R$)</p>
          <p className="text-xl font-bold text-red-500 tabular-nums mt-0.5">{BRL(overdueAmount)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-[10px] text-red-400 font-medium uppercase tracking-wide">Vencem hoje (R$)</p>
          <p className="text-xl font-bold text-red-400 tabular-nums mt-0.5">{BRL(todayAmount)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wide">A vencer (R$)</p>
          <p className="text-xl font-bold text-blue-500 tabular-nums mt-0.5">{BRL(pendingAmount)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-[10px] text-green-500 font-medium uppercase tracking-wide">Pagos (R$)</p>
          <p className="text-xl font-bold text-green-600 tabular-nums mt-0.5">{BRL(paidAmount)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 md:col-span-1 col-span-2">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Total do período (R$)</p>
          <p className="text-xl font-bold text-blue-600 tabular-nums mt-0.5">{BRL(total)}</p>
        </div>
      </div>

      {/* Filtros status */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 flex gap-3 items-center flex-wrap">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[['', 'Todos'], ['PENDING', 'Pendentes'], ['PAID', 'Pagos'], ['OVERDUE', 'Vencidos']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusF(v)}
                className={`px-3 py-1 rounded-md text-[11px] transition-all ${statusF === v ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500'}`}>{l}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-gray-400 ml-auto">{filtered.length} resultado(s)</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Nenhum lançamento para {monthName}.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 760 }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Descrição / Fornecedor</th>
                  <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Categoria</th>
                  <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Vencimento</th>
                  <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Valor</th>
                  <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 pr-5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Pgto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className={`border-b border-gray-50 hover:bg-gray-50/40 transition-colors ${b.status === 'OVERDUE' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800 truncate max-w-[200px]">{b.description}</p>
                      {b.supplierName && <p className="text-[10px] text-gray-400">{b.supplierName}</p>}
                    </td>
                    <td className="py-3">{b.categoryName ? <span className="text-xs text-gray-600">{b.categoryName}</span> : <span className="text-[10px] text-gray-300">—</span>}</td>
                    <td className="py-3 text-gray-500">{new Date(b.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3"><Pill label={b.isRecurring ? 'Recorrente' : 'Eventual'} variant={b.isRecurring ? 'blue' : 'gray'} /></td>
                    <td className="py-3 text-right font-medium text-red-600 tabular-nums">{BRL(b.amount)}</td>
                    <td className="py-3"><Pill label={STATUS_LABEL[b.status] || b.status} variant={STATUS_PILL[b.status] || 'gray'} /></td>
                    <td className="py-3 pr-5 text-gray-400 text-[10px]">
                      {b.paymentDate ? new Date(b.paymentDate).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50">
                  <td colSpan={4} className="px-5 py-2.5 text-[11px] text-gray-500 font-medium">{filtered.length} lançamentos</td>
                  <td className="py-2.5 text-right text-[11px] font-medium text-red-600 tabular-nums">{BRL(total)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-gray-400">
        <div className="w-2 h-2 rounded-full bg-green-400"/>
        Dados sincronizados do Conta Azul · atualização automática diária
      </div>
    </div>
  );
}