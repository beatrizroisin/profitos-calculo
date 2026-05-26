'use client';
import { useState, useEffect } from 'react';
import { Card, Grid4, KPICard, Button, Alert, Pill } from '@/components/ui';
import { BRL } from '@/lib/utils';

interface Client { id: string; name: string; netRevenue: number; grossRevenue: number; }
interface Commission { id: string; clientId: string; pct: number; client: Client; }
interface Partner {
  id: string; name: string; email?: string; phone?: string; document?: string;
  pixKey?: string; bankName?: string; bankAgency?: string; bankAccount?: string;
  paymentDay?: number; notes?: string; isActive: boolean;
  commissions: Commission[];
}

const EMPTY = {
  name: '', email: '', phone: '', document: '', pixKey: '',
  bankName: '', bankAgency: '', bankAccount: '', paymentDay: '', notes: '', isActive: true,
};

export default function ParceirosPage() {
  const [partners, setPartners]   = useState<Partner[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...EMPTY });
  const [commissions, setCommissions] = useState<{ clientId: string; pct: string }[]>([]);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState('');
  const [error, setError]         = useState('');
  const [viewId, setViewId]       = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      fetch('/api/partners'),
      fetch('/api/clients'),
    ]);
    if (pRes.ok) setPartners(await pRes.json());
    if (cRes.ok) {
      const data = await cRes.json();
      setClients(data.filter((c: any) => c.status === 'ACTIVE'));
    }
    setLoading(false);
  }

  function openNew() {
    setEditId(null); setViewId(null);
    setForm({ ...EMPTY });
    setCommissions([{ clientId: '', pct: '' }]);
    setError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEdit(p: Partner) {
    setEditId(p.id); setViewId(null);
    setForm({
      name: p.name, email: p.email || '', phone: p.phone || '',
      document: p.document || '', pixKey: p.pixKey || '',
      bankName: p.bankName || '', bankAgency: p.bankAgency || '',
      bankAccount: p.bankAccount || '', paymentDay: String(p.paymentDay || ''),
      notes: p.notes || '', isActive: p.isActive,
    });
    setCommissions(p.commissions.length > 0
      ? p.commissions.map(c => ({ clientId: c.clientId, pct: String(c.pct) }))
      : [{ clientId: '', pct: '' }]
    );
    setError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const validComm = commissions.filter(c => c.clientId && c.pct);
    const payload = {
      ...form,
      paymentDay: parseInt(form.paymentDay) || null,
      commissions: validComm.map(c => ({ clientId: c.clientId, pct: parseFloat(c.pct) })),
    };
    const url    = editId ? `/api/partners/${editId}` : '/api/partners';
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      setSaved(editId ? 'Parceiro atualizado.' : 'Parceiro cadastrado.');
      setTimeout(() => setSaved(''), 3000);
      setShowForm(false); setEditId(null); fetchAll();
    } else {
      const d = await res.json(); setError(d.error || 'Erro ao salvar.');
    }
  }

  async function deletePartner(id: string, name: string) {
    if (!confirm(`Remover ${name}?`)) return;
    await fetch(`/api/partners/${id}`, { method: 'DELETE' });
    setSaved('Parceiro removido.'); setTimeout(() => setSaved(''), 2500); fetchAll();
  }

  // Totais do mês vigente
  const totalComissao = partners.filter(p => p.isActive).reduce((sum, p) => {
    return sum + p.commissions.reduce((s, c) => s + (c.client.netRevenue * c.pct / 100), 0);
  }, 0);
  const totalParceiros = partners.filter(p => p.isActive).length;

  const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors";
  const lbl = "block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  // View detail
  const viewPartner = viewId ? partners.find(p => p.id === viewId) : null;
  if (viewPartner) {
    const totalV = viewPartner.commissions.reduce((s, c) => s + (c.client.netRevenue * c.pct / 100), 0);
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewId(null)} className="text-gray-400 hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{viewPartner.name}</h1>
          <div className="ml-auto">
            <Button variant="secondary" onClick={() => openEdit(viewPartner)}>Editar</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">Dados do parceiro</h3>
            <dl className="space-y-2.5">
              {[
                ['E-mail', viewPartner.email || '—'],
                ['Telefone', viewPartner.phone || '—'],
                ['CPF/Documento', viewPartner.document || '—'],
                ['Chave PIX', viewPartner.pixKey || '—'],
                ['Banco', viewPartner.bankName || '—'],
                ['Agência', viewPartner.bankAgency || '—'],
                ['Conta', viewPartner.bankAccount || '—'],
                ['Dia de pagamento', viewPartner.paymentDay ? `Dia ${viewPartner.paymentDay}` : '—'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <dt className="text-gray-500">{l}</dt>
                  <dd className="font-medium text-gray-800">{v}</dd>
                </div>
              ))}
              {viewPartner.notes && <div className="pt-2 border-t border-gray-50"><p className="text-xs text-gray-500 mb-1">Observações</p><p className="text-sm text-gray-700">{viewPartner.notes}</p></div>}
            </dl>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Comissões — <span className="text-[#1A6B4A]">{BRL(totalV)}/mês</span>
            </h3>
            {viewPartner.commissions.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma comissão cadastrada.</p>
            ) : (
              <div className="space-y-3">
                {viewPartner.commissions.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.client.name}</p>
                      <p className="text-[10px] text-gray-400">Receita líquida: {BRL(c.client.netRevenue)}/mês</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#1A6B4A]">{BRL(c.client.netRevenue * c.pct / 100)}</p>
                      <p className="text-[10px] text-gray-400">{c.pct}% de comissão</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Parceiros Comissionados</h1>
          <p className="text-sm text-gray-400 mt-0.5">{partners.length} parceiros · {BRL(totalComissao)}/mês em comissões</p>
        </div>
        {!showForm && <Button variant="primary" onClick={openNew}>+ Novo parceiro</Button>}
      </div>

      {saved && <Alert variant="ok">{saved}</Alert>}

      {/* KPIs */}
      <Grid4>
        <KPICard label="Parceiros ativos" value={String(totalParceiros)} sub={`de ${partners.length} cadastrados`} color="blue" />
        <KPICard label="Comissão mês vigente" value={BRL(totalComissao)} sub="total a pagar este mês" color="red" accentColor="#DC3545" />
        <KPICard label="Média por parceiro" value={totalParceiros > 0 ? BRL(totalComissao / totalParceiros) : '—'} sub="comissão média/mês" color="amber" />
        <KPICard label="Clientes comissionados" value={String(new Set(partners.flatMap(p => p.commissions.map(c => c.clientId))).size)} sub="clientes com parceiro" color="green" />
      </Grid4>

      {/* Form */}
      {showForm && (
        <Card title={editId ? 'Editar parceiro' : 'Novo parceiro'} subtitle="Preencha os dados do parceiro e vincule os clientes indicados">
          <form onSubmit={handleSubmit}>
            {/* Identificação */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-[#1A6B4A] uppercase tracking-widest pb-1 border-b border-green-100 mb-3">Identificação</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={lbl}>Nome *</label>
                  <input required className={inp} placeholder="Nome completo do parceiro" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>CPF / Documento</label>
                  <input className={inp} placeholder="000.000.000-00" value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>E-mail</label>
                  <input type="email" className={inp} placeholder="parceiro@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Telefone</label>
                  <input className={inp} placeholder="(11) 99999-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <select className={inp} value={form.isActive ? '1' : '0'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === '1' }))}>
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pagamento */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-[#1A6B4A] uppercase tracking-widest pb-1 border-b border-green-100 mb-3">Dados de pagamento</p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className={lbl}>Chave PIX</label>
                  <input className={inp} placeholder="CPF, e-mail ou aleatória" value={form.pixKey} onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Banco</label>
                  <input className={inp} placeholder="Itaú, Nubank..." value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Agência</label>
                  <input className={inp} placeholder="0000" value={form.bankAgency} onChange={e => setForm(f => ({ ...f, bankAgency: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Conta</label>
                  <input className={inp} placeholder="00000-0" value={form.bankAccount} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Dia de pagamento</label>
                  <input type="number" min="1" max="31" className={inp} placeholder="5" value={form.paymentDay} onChange={e => setForm(f => ({ ...f, paymentDay: e.target.value }))} />
                </div>
                <div className="col-span-3">
                  <label className={lbl}>Observações</label>
                  <input className={inp} placeholder="Notas internas..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Comissões */}
            <div className="mb-4">
              <div className="flex items-center justify-between pb-1 border-b border-green-100 mb-3">
                <p className="text-[10px] font-bold text-[#1A6B4A] uppercase tracking-widest">Clientes indicados e comissões</p>
                <button type="button" onClick={() => setCommissions(c => [...c, { clientId: '', pct: '' }])}
                  className="text-[10px] font-medium text-[#1A6B4A] hover:underline">+ Adicionar cliente</button>
              </div>
              <div className="space-y-2">
                {commissions.map((c, i) => {
                  const client = clients.find(cl => cl.id === c.clientId);
                  const valor = client && c.pct ? client.netRevenue * parseFloat(c.pct) / 100 : 0;
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select className={inp} value={c.clientId}
                          onChange={e => setCommissions(prev => prev.map((x, j) => j === i ? { ...x, clientId: e.target.value } : x))}>
                          <option value="">Selecione o cliente...</option>
                          {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" max="100" step="0.1" className={inp} placeholder="% comissão"
                          value={c.pct}
                          onChange={e => setCommissions(prev => prev.map((x, j) => j === i ? { ...x, pct: e.target.value } : x))} />
                      </div>
                      <div className="col-span-3">
                        <div className={`${inp} bg-green-50 border-green-200 text-green-800 font-medium cursor-default`}>
                          {valor > 0 ? BRL(valor) + '/mês' : '—'}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {commissions.length > 1 && (
                          <button type="button" onClick={() => setCommissions(prev => prev.filter((_, j) => j !== i))}
                            className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {commissions.some(c => c.clientId && c.pct) && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
                  💰 Total de comissão este parceiro: <strong>{BRL(commissions.reduce((s, c) => {
                    const cl = clients.find(x => x.id === c.clientId);
                    return s + (cl && c.pct ? cl.netRevenue * parseFloat(c.pct) / 100 : 0);
                  }, 0))}/mês</strong>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Salvando...' : editId ? 'Salvar alterações' : 'Cadastrar parceiro'}</Button>
              <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Carregando...</div>
        ) : partners.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-medium text-gray-600">Nenhum parceiro cadastrado</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Cadastre parceiros e vincule os clientes que eles indicaram</p>
            <Button variant="primary" onClick={openNew}>+ Novo parceiro</Button>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Parceiro</th>
                <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Clientes indicados</th>
                <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Comissão/mês</th>
                <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right py-3 pr-5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {partners.map(p => {
                const total = p.commissions.reduce((s, c) => s + (c.client.netRevenue * c.pct / 100), 0);
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors cursor-pointer"
                    onClick={() => setViewId(p.id)}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{p.name}</p>
                      {p.email && <p className="text-[10px] text-gray-400">{p.email}</p>}
                    </td>
                    <td className="py-3">
                      {p.commissions.length === 0 ? (
                        <span className="text-[10px] text-gray-300">Nenhum</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.commissions.slice(0, 2).map(c => (
                            <span key={c.id} className="text-[9.5px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                              {c.client.name.slice(0, 16)} ({c.pct}%)
                            </span>
                          ))}
                          {p.commissions.length > 2 && <span className="text-[9.5px] text-gray-400">+{p.commissions.length - 2}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right font-semibold text-red-600 tabular-nums">{BRL(total)}</td>
                    <td className="py-3">
                      <Pill label={p.isActive ? 'Ativo' : 'Inativo'} variant={p.isActive ? 'green' : 'gray'} />
                    </td>
                    <td className="py-3 pr-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                        <button onClick={() => deletePartner(p.id, p.name)} className="text-[11px] text-red-500 hover:text-red-700 font-medium">Remover</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100 bg-gray-50">
                <td colSpan={2} className="px-5 py-2.5 text-[11px] text-gray-500 font-medium">{partners.length} parceiros</td>
                <td className="py-2.5 text-right text-[11px] font-medium text-red-600 tabular-nums">{BRL(totalComissao)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}