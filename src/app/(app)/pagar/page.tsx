'use client';
import { useState, useEffect } from 'react';
import { Card, Grid4, KPICard, Alert, Button, Pill } from '@/components/ui';
import { BRL } from '@/lib/utils';

interface Tx { id:string; description:string; amount:number; grossAmount:number|null; taxRate:number|null; dueDate:string; paidAt:string|null; isRecurring:boolean; status:string; type:string; notes:string|null; client:{id:string;name:string}|null; category:{id:string;name:string;color:string}|null; }
interface Cat { id:string; name:string; }

const STATUS_PILL: Record<string,any> = { PENDING:'amber', PAID:'green', OVERDUE:'red', CANCELLED:'gray' };
const STATUS_LABEL: Record<string,string> = { PENDING:'Pendente', PAID:'Pago', OVERDUE:'Vencido', CANCELLED:'Cancelado' };

const EMPTY = { description:'', amount:'', grossAmount:'', taxRate:'', dueDate: new Date().toISOString().slice(0,10), paidAt:'', isRecurring:false, status:'PENDING', categoryId:'', notes:'' };

export default function PagarPage() {
  const [txs, setTxs]       = useState<Tx[]>([]);
  const [cats, setCats]      = useState<Cat[]>([]);
  const [totals, setTotals]  = useState({ totalExpense:0 });
  const [loading, setLoading]= useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]  = useState<string|null>(null);
  const [form, setForm]      = useState({ ...EMPTY });
  const [saving, setSaving]  = useState(false);
  const [saved, setSaved]    = useState('');
  const [error, setError]    = useState('');
  const [search, setSearch]  = useState('');
  const [statusF, setStatusF]= useState('');

  useEffect(() => { fetchAll(); }, [search, statusF]);

  async function fetchAll() {
    setLoading(true);
    const p = new URLSearchParams({ type: 'EXPENSE' });
    if (search)  p.set('search', search);
    if (statusF) p.set('status', statusF);
    const res = await fetch(`/api/transactions?${p}`);
    if (res.ok) {
      const d = await res.json();
      setTxs(d.transactions || []);
      setTotals({ totalExpense: d.totalExpense || 0 });
    }
    setLoading(false);
  }

  async function fetchCats() {
    const res = await fetch('/api/categories?type=EXPENSE');
    if (res.ok) setCats(await res.json());
  }

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY, dueDate: new Date().toISOString().slice(0,10) });
    fetchCats();
    setShowForm(true);
  }

  function openEdit(tx: Tx) {
    setEditId(tx.id);
    setForm({
      description: tx.description,
      amount:      String(tx.amount),
      grossAmount: String(tx.grossAmount || tx.amount),
      taxRate:     String(tx.taxRate || ''),
      dueDate:     tx.dueDate.slice(0,10),
      paidAt:      tx.paidAt?.slice(0,10) || '',
      isRecurring: tx.isRecurring,
      status:      tx.status,
      categoryId:  tx.category?.id || '',
      notes:       tx.notes || '',
    });
    fetchCats();
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const payload = {
      ...form,
      type:       'EXPENSE',
      amount:     parseFloat(form.amount as string)   || 0,
      grossAmount:parseFloat(form.grossAmount as string) || null,
      taxRate:    parseFloat(form.taxRate as string)  || null,
      paidAt:     form.paidAt || null,
      categoryId: form.categoryId || null,
    };
    const url    = editId ? `/api/transactions/${editId}` : '/api/transactions';
    const method = editId ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) { setSaved(editId ? 'Lançamento atualizado.' : 'Lançamento adicionado.'); setTimeout(()=>setSaved(''),3000); setShowForm(false); fetchAll(); }
    else { const d = await res.json(); setError(d.error || 'Erro.'); }
  }

  async function markPaid(tx: Tx) {
    await fetch(`/api/transactions/${tx.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status:'PAID', paidAt: new Date().toISOString() }) });
    setSaved('Marcado como pago.'); setTimeout(()=>setSaved(''),2500); fetchAll();
  }

  async function deleteTx(id: string) {
    if (!confirm('Excluir este lançamento?')) return;
    await fetch(`/api/transactions/${id}`, { method:'DELETE' });
    setSaved('Lançamento excluído.'); setTimeout(()=>setSaved(''),2500); fetchAll();
  }

  const pending = txs.filter(t=>t.status==='PENDING').reduce((s,t)=>s+t.amount,0);
  const paid    = txs.filter(t=>t.status==='PAID').reduce((s,t)=>s+t.amount,0);
  const overdue = txs.filter(t=>t.status==='OVERDUE');
  const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:border-[#1A6B4A]";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-lg font-semibold text-gray-900">Contas a pagar</h1><p className="text-sm text-gray-400 mt-0.5">{txs.length} lançamentos</p></div>
        {!showForm && <Button variant="primary" onClick={openNew}>+ Novo lançamento</Button>}
      </div>

      {saved && <Alert variant="ok">{saved}</Alert>}
      {overdue.length>0 && <Alert variant="danger"><strong>{overdue.length} lançamento(s) vencidos</strong> — {BRL(overdue.reduce((s,t)=>s+t.amount,0))} em atraso.</Alert>}

      {showForm && (
        <Card title={editId ? 'Editar lançamento' : 'Novo lançamento a pagar'}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="col-span-2"><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Descrição / Fornecedor *</label><input required className={inp} placeholder="Ex: Remuneração PJ — João Silva" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Categoria</label>
                <select className={inp} value={form.categoryId} onChange={e=>setForm(f=>({...f,categoryId:e.target.value}))}>
                  <option value="">Sem categoria</option>
                  {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Valor (R$) *</label><input required type="number" min="0" step="0.01" className={inp} value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></div>
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Vencimento</label><input type="date" className={inp} value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} /></div>
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                <select className={inp} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option value="PENDING">Pendente</option><option value="PAID">Pago</option><option value="OVERDUE">Vencido</option><option value="CANCELLED">Cancelado</option>
                </select>
              </div>
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Data de pagamento</label><input type="date" className={inp} value={form.paidAt} onChange={e=>setForm(f=>({...f,paidAt:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
                <select className={inp} value={form.isRecurring?'1':'0'} onChange={e=>setForm(f=>({...f,isRecurring:e.target.value==='1'}))}>
                  <option value="1">Recorrente</option><option value="0">Eventual</option>
                </select>
              </div>
              <div className="col-span-2"><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Observações</label><input className={inp} placeholder="Notas internas..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
            </div>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={saving}>{saving?'Salvando...':editId?'Salvar alterações':'Adicionar lançamento'}</Button>
              <Button type="button" variant="secondary" onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <Grid4>
        <KPICard label="Total a pagar" value={BRL(totals.totalExpense)} sub={`${txs.length} lançamentos`} color="red" accentColor="#DC3545" />
        <KPICard label="Pendente" value={BRL(pending)} sub="aguardando pagamento" color="amber" />
        <KPICard label="Pago" value={BRL(paid)} sub="lançamentos quitados" color="green" />
        <KPICard label="Vencidos" value={String(overdue.length)} sub={overdue.length>0?BRL(overdue.reduce((s,t)=>s+t.amount,0)):'nenhum vencido'} color={overdue.length>0?'red':'default'} />
      </Grid4>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 flex gap-3 items-center flex-wrap">
          <input type="text" placeholder="Buscar fornecedor ou descrição..." value={search} onChange={e=>setSearch(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1A6B4A]" />
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[['','Todos'],['PENDING','Pendentes'],['PAID','Pagos'],['OVERDUE','Vencidos']].map(([v,l])=>(
              <button key={v} onClick={()=>setStatusF(v)} className={`px-3 py-1 rounded-md text-[11px] transition-all ${statusF===v?'bg-white text-gray-800 font-medium shadow-sm':'text-gray-500'}`}>{l}</button>
            ))}
          </div>
          {!showForm && <Button size="sm" variant="primary" onClick={openNew}>+ Novo</Button>}
        </div>
        {loading ? <div className="text-center py-12 text-sm text-gray-400">Carregando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:760}}>
              <thead><tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Descrição</th>
                <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Categoria</th>
                <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Vencimento</th>
                <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Valor</th>
                <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right py-3 pr-5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr></thead>
              <tbody>
                {txs.length===0 ? <tr><td colSpan={7} className="text-center py-12 text-sm text-gray-400">Nenhum lançamento. <button onClick={openNew} className="text-[#1A6B4A] underline">Adicionar →</button></td></tr>
                : txs.map(tx=>(
                  <tr key={tx.id} className={`border-b border-gray-50 hover:bg-gray-50/40 transition-colors ${tx.status==='OVERDUE'?'bg-red-50/30':''}`}>
                    <td className="px-5 py-3"><p className="font-medium text-gray-800 truncate max-w-[200px]">{tx.description}</p>{tx.notes&&<p className="text-[10px] text-gray-400">{tx.notes}</p>}</td>
                    <td className="py-3">{tx.category?<span className="text-xs text-gray-600">{tx.category.name}</span>:<span className="text-[10px] text-gray-300">—</span>}</td>
                    <td className="py-3 text-gray-500">{new Date(tx.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3"><Pill label={tx.isRecurring?'Recorrente':'Eventual'} variant={tx.isRecurring?'blue':'gray'} /></td>
                    <td className="py-3 text-right font-medium text-red-600 tabular">{BRL(tx.amount)}</td>
                    <td className="py-3"><Pill label={STATUS_LABEL[tx.status]||tx.status} variant={STATUS_PILL[tx.status]||'gray'} /></td>
                    <td className="py-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tx.status==='PENDING'&&<button onClick={()=>markPaid(tx)} className="text-[11px] font-medium text-green-600 hover:text-green-800">Pago</button>}
                        <button onClick={()=>openEdit(tx)} className="text-[11px] font-medium text-blue-600 hover:text-blue-800">Editar</button>
                        <button onClick={()=>deleteTx(tx.id)} className="text-[11px] font-medium text-red-500 hover:text-red-700">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {txs.length>0&&<tfoot><tr className="border-t border-gray-100 bg-gray-50">
                <td colSpan={4} className="px-5 py-2.5 text-[11px] text-gray-500 font-medium">{txs.length} lançamentos</td>
                <td className="py-2.5 text-right text-[11px] font-medium text-red-600 tabular">{BRL(txs.reduce((s,t)=>s+t.amount,0))}</td>
                <td colSpan={2}></td>
              </tr></tfoot>}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
