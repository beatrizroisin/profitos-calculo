'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Grid4, KPICard, Button, Input, Select, Alert, Pill } from '@/components/ui';
import { BRL, SERVICE_TYPE_LABELS, RISK_LABELS, STATUS_LABELS } from '@/lib/utils';

interface Client {
  id: string; name: string; document?: string; email?: string; phone?: string;
  serviceType: string; grossRevenue: number; taxRate: number; netRevenue: number;
  isRecurring: boolean; totalInstallments: number; currentInstallment: number;
  startDate: string; dueDay: number; status: string; riskLevel: string; notes?: string;
}

const EMPTY: Omit<Client, 'id'> = {
  name: '', document: '', email: '', phone: '', serviceType: 'ECOMMERCE_MANAGEMENT',
  grossRevenue: 0, taxRate: 6, netRevenue: 0, isRecurring: true,
  totalInstallments: 12, currentInstallment: 1, startDate: new Date().toISOString().slice(0, 10),
  dueDay: 5, status: 'ACTIVE', riskLevel: 'LOW', notes: '',
};

const STATUS_PILL: Record<string, any> = { ACTIVE: 'green', INACTIVE: 'gray', PROSPECT: 'amber', PIPELINE: 'blue', CHURNED: 'red' };
const RISK_PILL:    Record<string, any> = { LOW: 'green', MEDIUM: 'amber', HIGH: 'red', CRITICAL: 'red' };

export default function ClientesPage() {
  const searchParams                     = useSearchParams();
  const [clients, setClients]       = useState<Client[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState({ ...EMPTY });
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Auto-open new form when navigated from dashboard ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') openNew();
  }, []);

  useEffect(() => { fetchClients(); }, []);

  async function fetchClients() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search)       params.set('search', search);
    const res = await fetch(`/api/clients?${params}`);
    if (res.ok) {
      const data = await res.json();
      // Ordenação para garantir que os números sigam a ordem de cadastro
      setClients(data.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
    }
    setLoading(false);
  }

  useEffect(() => { fetchClients(); }, [search, statusFilter]);

  const F = (k: string, v: any) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      next.netRevenue = next.grossRevenue * (1 - next.taxRate / 100);
      return next;
    });
  };

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY, startDate: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEdit(c: Client) {
    setEditId(c.id);
    setForm({ ...c, startDate: c.startDate.slice(0, 10) });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url    = editId ? `/api/clients/${editId}` : '/api/clients';
    const method = editId ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) {
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      setShowForm(false); setEditId(null);
      fetchClients();
    }
  }

  async function deleteClient(id: string, name: string) {
    if (!confirm(`Remover ${name}?`)) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    fetchClients();
  }

  const ativos      = clients.filter(c => c.status === 'ACTIVE');
  const pipeline    = clients.filter(c => c.status === 'PIPELINE');
  const totalLiq    = ativos.reduce((s, c) => s + c.netRevenue, 0);
  const totalBruto  = ativos.reduce((s, c) => s + c.grossRevenue, 0);
  const totalImposto= totalBruto - totalLiq;
  const ticketMedio = ativos.length > 0 ? totalLiq / ativos.length : 0;
  const pipelineNet = pipeline.reduce((s, c) => s + c.netRevenue, 0);

  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-400 mt-0.5">{clients.length} cadastrados · {ativos.length} ativos</p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <a href="/api/export?type=clients" download>
              <Button variant="secondary">⬇ Exportar CSV</Button>
            </a>
            <Button variant="primary" onClick={openNew}>+ Novo cliente</Button>
          </div>
        )}
      </div>

      {saved && <Alert variant="ok">Cliente {editId ? 'atualizado' : 'adicionado'} com sucesso e integrado em toda a ferramenta.</Alert>}

      {/* Pipeline guide (Omitido para brevidade, mantenha o seu original) */}

      {showForm && (
        <Card title={editId ? 'Editar cliente' : 'Novo cliente'} subtitle="Preencha os dados — o sistema calcula automaticamente">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="col-span-1">
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5 text-[#1A6B4A]">Contrato Nº</label>
                <div className={`${inputCls} bg-gray-50 font-bold text-[#1A6B4A] cursor-default`}>
                  {editId ? (clients.findIndex(x => x.id === editId) + 1).toString().padStart(3, '0') : '---'}
                </div>
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nome do cliente *</label>
                <input required className={inputCls} placeholder="Razão social ou nome fantasia" value={form.name} onChange={e => F('name', e.target.value)} />
              </div>
            </div>
            
            {/* Restante dos campos do formulário (Mantenha o seu original abaixo) */}
            <div className="grid grid-cols-3 gap-3 mb-3">
               <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">CNPJ / CPF</label><input className={inputCls} value={form.document} onChange={e => F('document', e.target.value)} /></div>
               <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">E-mail</label><input type="email" className={inputCls} value={form.email} onChange={e => F('email', e.target.value)} /></div>
               <div><label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Telefone</label><input className={inputCls} value={form.phone} onChange={e => F('phone', e.target.value)} /></div>
            </div>
            {/* ... adicione o restante dos seus campos originais ... */}

            <div className="flex gap-3 mt-4">
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
              <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {/* KPIs (Mantenha o seu original) */}

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3 flex-wrap">
          <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1A6B4A]" />
          <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-100">
            {[['', 'Todos'], ['ACTIVE', 'Ativos'], ['PROSPECT', 'Prospects'], ['PIPELINE', 'Pipeline'], ['CHURNED', 'Churned']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1 rounded-md text-[11px] transition-all ${statusFilter === v ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500'}`}>{l}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 900 }}>
            <thead>
              <tr className="border-b border-gray-100">
                {statusFilter === 'PROSPECT' ? (
                  <>
                    <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Contrato Nº</th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Contrato Nº</th>
                    <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                  </>
                )}
                <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Serviço</th>
                <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Líquido/mês</th>
                <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right py-3 pr-5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c, index) => {
                const contractNum = (index + 1).toString().padStart(3, '0');
                const commonCells = (
                  <>
                    <td className="py-3 text-gray-500 max-w-[130px]"><span className="truncate block">{SERVICE_TYPE_LABELS[c.serviceType]}</span></td>
                    <td className="py-3 text-right font-medium text-green-700 tabular">{BRL(c.netRevenue)}</td>
                    <td className="py-3"><Pill label={STATUS_LABELS[c.status]} variant={STATUS_PILL[c.status]} /></td>
                    <td className="py-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                        <button onClick={() => deleteClient(c.id, c.name)} className="text-[11px] text-red-500 hover:text-red-700 font-medium">Remover</button>
                      </div>
                    </td>
                  </>
                );

                return (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                    {statusFilter === 'PROSPECT' ? (
                      <>
                        <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                        <td className="py-3 font-mono font-bold text-gray-400">{contractNum}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 font-mono font-bold text-[#1A6B4A]">{contractNum}</td>
                        <td className="py-3 font-medium text-gray-800">{c.name}</td>
                      </>
                    )}
                    {commonCells}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}