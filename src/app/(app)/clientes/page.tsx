'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Grid4, KPICard, Button, Alert, Pill } from '@/components/ui';
import { BRL, SERVICE_TYPE_LABELS, RISK_LABELS, STATUS_LABELS } from '@/lib/utils';

interface Client {
  id: string; orderId?: number; name: string; document?: string; email?: string; phone?: string;
  serviceType: string; grossRevenue: number; taxRate: number; netRevenue: number;
  isRecurring: boolean; totalInstallments: number; currentInstallment: number;
  startDate: string; dueDay: number; status: string; riskLevel: string; notes?: string;
  endRua?: string; endNumero?: string; endBairro?: string;
  endCidade?: string; endEstado?: string; endCep?: string;
  repNome?: string; repRG?: string; repCPF?: string; repEstadoCivil?: string;
  testNome?: string; testCPF?: string; testEmail?: string;
  finNome?: string; finEmail?: string; finTelefone?: string;
  projNome?: string; projEmail?: string; projTelefone?: string;
  formaPagamento?: string; regimeTributario?: string;
  tipoProjeto?: string; servicosContratados?: string;
  aniversario?: string;
}

const EMPTY: Omit<Client, 'id'> = {
  name: '', document: '', email: '', phone: '', serviceType: 'ECOMMERCE_MANAGEMENT',
  grossRevenue: 0, taxRate: 6, netRevenue: 0, isRecurring: true,
  totalInstallments: 12, currentInstallment: 1,
  startDate: new Date().toISOString().slice(0, 10),
  dueDay: 5, status: 'ACTIVE', riskLevel: 'LOW', notes: '',
  endRua: '', endNumero: '', endBairro: '', endCidade: '', endEstado: '', endCep: '',
  repNome: '', repRG: '', repCPF: '', repEstadoCivil: '',
  testNome: '', testCPF: '', testEmail: '',
  finNome: '', finEmail: '', finTelefone: '',
  projNome: '', projEmail: '', projTelefone: '',
  formaPagamento: 'Boleto', regimeTributario: '', tipoProjeto: '', servicosContratados: '',
  aniversario: '',
};

const STATUS_PILL: Record<string, any> = { ACTIVE: 'green', INACTIVE: 'gray', PROSPECT: 'amber', PIPELINE: 'blue', CHURNED: 'red' };
const RISK_PILL:   Record<string, any> = { LOW: 'green', MEDIUM: 'amber', HIGH: 'red', CRITICAL: 'red' };

function SecLabel({ t }: { t: string }) {
  return (
    <div className="col-span-full mt-4 mb-1 border-b border-gray-100 pb-1">
      <p className="text-[10px] font-bold text-[#1A6B4A] uppercase tracking-widest">{t}</p>
    </div>
  );
}

export default function ClientesPage() {
  const searchParams = useSearchParams();
  const [clients, setClients]           = useState<Client[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<Omit<Client,'id'>>({ ...EMPTY });
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showExtra, setShowExtra]       = useState(false);

  useEffect(() => { if (searchParams.get('new') === '1') openNew(); }, []);
  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { fetchClients(); }, [search, statusFilter]);

  async function fetchClients() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search)       params.set('search', search);
    const res = await fetch(`/api/clients?${params}`);
    if (res.ok) setClients(await res.json());
    setLoading(false);
  }

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
    setShowExtra(false);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEdit(c: Client) {
    setEditId(c.id);
    setForm({ ...EMPTY, ...c, startDate: c.startDate.slice(0, 10) });
    setShowExtra(!!(c.repNome || c.endRua || c.finNome));
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
  const ticketMedio = ativos.length > 0 ? totalLiq / ativos.length : 0;
  const pipelineNet = pipeline.reduce((s, c) => s + c.netRevenue, 0);

  const I = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors";

  const currentOrderId = editId ? clients.find(x => x.id === editId)?.orderId : undefined;

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

      {saved && <Alert variant="ok">Cliente {editId ? 'atualizado' : 'adicionado'} com sucesso.</Alert>}

      {pipeline.length > 0 && !showForm && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"/>
            <p className="text-xs text-blue-800">
              <strong>{pipeline.length} possíve{pipeline.length === 1 ? 'l entrada' : 'is entradas'} no pipeline</strong>
              {' — '}<span className="font-semibold">{BRL(pipelineNet)}/mês potencial</span>.
              Quando fechar o contrato, edite e mude o status para <strong>Ativo</strong>.
            </p>
          </div>
          <button onClick={() => setStatusFilter('PIPELINE')}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0 ml-3">
            Ver pipeline
          </button>
        </div>
      )}
      {pipeline.length === 0 && !showForm && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0 mt-1"/>
          <p className="text-xs text-gray-600">
            <strong>Pipeline:</strong> cadastre um cliente com status{' '}
            <span className="font-medium text-blue-700">🔵 Possível Entrada (Pipeline)</span> para acompanhar oportunidades.
          </p>
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <Card title={editId ? 'Editar cliente' : 'Novo cliente'} subtitle="Preencha os dados — o sistema calcula automaticamente">
          <form onSubmit={handleSubmit}>

            {/* Row 1 — identificação */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {editId && currentOrderId !== undefined ? (
                <>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nº Contrato</label>
                    <div className={`${I} bg-gray-50 border-gray-200 text-[#1A6B4A] font-mono font-bold cursor-default select-none pointer-events-none`}>
                      {String(currentOrderId).padStart(3, '0')}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nome do cliente *</label>
                    <input required className={I} placeholder="Razão social ou nome fantasia" value={form.name} onChange={e => F('name', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">CNPJ / CPF</label>
                    <input className={I} placeholder="00.000.000/0001-00" value={form.document||''} onChange={e => F('document', e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nome do cliente *</label>
                    <input required className={I} placeholder="Razão social ou nome fantasia" value={form.name} onChange={e => F('name', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">CNPJ / CPF</label>
                    <input className={I} placeholder="00.000.000/0001-00" value={form.document||''} onChange={e => F('document', e.target.value)} />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">E-mail</label>
                <input type="email" className={I} placeholder="financeiro@cliente.com" value={form.email||''} onChange={e => F('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Telefone</label>
                <input className={I} placeholder="(11) 99999-0000" value={form.phone||''} onChange={e => F('phone', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Tipo de serviço *</label>
                <select required className={I} value={form.serviceType} onChange={e => F('serviceType', e.target.value)}>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2 — financeiro */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Faturamento bruto (R$) *</label>
                <input required type="number" min="0" step="0.01" className={I} placeholder="0,00" value={form.grossRevenue||''} onChange={e => F('grossRevenue', parseFloat(e.target.value)||0)} />
                <p className="text-[10px] text-gray-400 mt-1">Valor emitido na nota fiscal</p>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Alíquota (%)</label>
                <input type="number" min="0" max="100" step="0.1" className={I} value={form.taxRate} onChange={e => F('taxRate', parseFloat(e.target.value)||0)} />
                <p className="text-[10px] text-gray-400 mt-1">Simples Nacional ≈ 6%</p>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Valor líquido</label>
                <div className={`${I} bg-green-50 border-green-200 text-green-800 font-medium cursor-default`}>
                  {form.grossRevenue > 0 ? BRL(form.netRevenue) : '—'}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Imposto: {form.grossRevenue > 0 ? BRL(form.grossRevenue - form.netRevenue) : '—'}/mês</p>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                <select className={I} value={form.status} onChange={e => F('status', e.target.value)}>
                  <option value="ACTIVE">✅ Ativo — contrato vigente</option>
                  <option value="PIPELINE">🔵 Pipeline — em negociação</option>
                  <option value="PROSPECT">🟡 Prospect — contato inicial</option>
                  <option value="INACTIVE">⚪ Inativo — pausado</option>
                  <option value="CHURNED">🔴 Churned — cancelou</option>
                </select>
              </div>
            </div>

            {/* Row 3 — contrato */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Tipo de contrato</label>
                <select className={I} value={form.isRecurring ? '1' : '0'} onChange={e => F('isRecurring', e.target.value === '1')}>
                  <option value="1">Recorrente (mensalidade)</option>
                  <option value="0">Pontual (projeto)</option>
                </select>
              </div>
              {form.isRecurring && <>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Total de parcelas</label>
                  <input type="number" min="0" max="120" className={I} value={form.totalInstallments} onChange={e => F('totalInstallments', parseInt(e.target.value)||0)} />
                  <p className="text-[10px] text-gray-400 mt-1">0 = indeterminado</p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Parcela atual</label>
                  <input type="number" min="1" className={I} value={form.currentInstallment} onChange={e => F('currentInstallment', parseInt(e.target.value)||1)} />
                  <p className="text-[10px] text-gray-400 mt-1">{form.currentInstallment}/{form.totalInstallments||'∞'}</p>
                </div>
              </>}
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Dia de vencimento</label>
                <input type="number" min="1" max="31" className={I} value={form.dueDay} onChange={e => F('dueDay', parseInt(e.target.value)||1)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Data de início</label>
                <input type="date" className={I} value={form.startDate} onChange={e => F('startDate', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nível de risco</label>
                <select className={I} value={form.riskLevel} onChange={e => F('riskLevel', e.target.value)}>
                  <option value="LOW">Baixo</option><option value="MEDIUM">Médio</option>
                  <option value="HIGH">Alto</option><option value="CRITICAL">Crítico</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Observações</label>
                <input className={I} placeholder="Notas internas..." value={form.notes||''} onChange={e => F('notes', e.target.value)} />
              </div>
            </div>

            {/* Preview financeira */}
            {form.grossRevenue > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Prévia financeira</p>
                <div className="grid grid-cols-4 gap-4">
                  <div><p className="text-[10px] text-gray-400">Bruto/mês</p><p className="text-sm font-semibold text-gray-800">{BRL(form.grossRevenue)}</p></div>
                  <div><p className="text-[10px] text-gray-400">Imposto ({form.taxRate}%)/mês</p><p className="text-sm font-semibold text-amber-600">–{BRL(form.grossRevenue - form.netRevenue)}</p></div>
                  <div><p className="text-[10px] text-gray-400">Líquido/mês</p><p className="text-sm font-semibold text-green-700">{BRL(form.netRevenue)}</p></div>
                  <div><p className="text-[10px] text-gray-400">{form.isRecurring ? `Total (${form.totalInstallments}x)` : 'Total projeto'}</p><p className="text-sm font-semibold text-blue-700">{BRL(form.isRecurring ? form.netRevenue * form.totalInstallments : form.netRevenue)}</p></div>
                </div>
              </div>
            )}

            {/* Toggle dados contratuais */}
            <button type="button" onClick={() => setShowExtra(v => !v)}
              className="w-full mb-4 py-2 text-xs font-medium text-[#1A6B4A] border border-dashed border-green-200 rounded-xl hover:bg-green-50 transition-colors">
              {showExtra ? '▲ Ocultar dados contratuais' : '▼ Ver / editar dados contratuais (endereço, representante, serviços...)'}
            </button>

            {showExtra && (
              <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="col-span-2">
                 <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Aniversário do Representante Legal</label>
                  <input type="date" className={I} value={form.aniversario||''} onChange={e => F('aniversario', e.target.value)} />
                </div>

                <SecLabel t="Endereço" />
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">CEP</label>
                  <input className={I} placeholder="00000-000" value={form.endCep||''} onChange={e => F('endCep', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Número</label>
                  <input className={I} placeholder="123" value={form.endNumero||''} onChange={e => F('endNumero', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Rua / Logradouro</label>
                  <input className={I} placeholder="Rua das Flores" value={form.endRua||''} onChange={e => F('endRua', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Bairro</label>
                  <input className={I} placeholder="Centro" value={form.endBairro||''} onChange={e => F('endBairro', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Cidade</label>
                  <input className={I} placeholder="São Paulo" value={form.endCidade||''} onChange={e => F('endCidade', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Estado (UF)</label>
                  <input className={I} placeholder="SP" maxLength={2} value={form.endEstado||''} onChange={e => F('endEstado', e.target.value)} />
                </div>

                <SecLabel t="Representante Legal" />
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nome</label>
                  <input className={I} placeholder="Nome completo" value={form.repNome||''} onChange={e => F('repNome', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">RG</label>
                  <input className={I} placeholder="00.000.000-0" value={form.repRG||''} onChange={e => F('repRG', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">CPF</label>
                  <input className={I} placeholder="000.000.000-00" value={form.repCPF||''} onChange={e => F('repCPF', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Estado Civil</label>
                  <input className={I} placeholder="Solteiro(a), Casado(a)..." value={form.repEstadoCivil||''} onChange={e => F('repEstadoCivil', e.target.value)} />
                </div>

                <SecLabel t="Testemunha" />
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nome</label>
                  <input className={I} placeholder="Nome completo" value={form.testNome||''} onChange={e => F('testNome', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">CPF</label>
                  <input className={I} placeholder="000.000.000-00" value={form.testCPF||''} onChange={e => F('testCPF', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">E-mail</label>
                  <input type="email" className={I} placeholder="testemunha@empresa.com" value={form.testEmail||''} onChange={e => F('testEmail', e.target.value)} />
                </div>

                <SecLabel t="Responsável Financeiro" />
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nome</label>
                  <input className={I} placeholder="Nome" value={form.finNome||''} onChange={e => F('finNome', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Telefone</label>
                  <input className={I} placeholder="(11) 99999-0000" value={form.finTelefone||''} onChange={e => F('finTelefone', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">E-mail p/ Notas Fiscais</label>
                  <input type="email" className={I} placeholder="financeiro@empresa.com" value={form.finEmail||''} onChange={e => F('finEmail', e.target.value)} />
                </div>

                <SecLabel t="Responsável pelo Projeto" />
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nome</label>
                  <input className={I} placeholder="Nome" value={form.projNome||''} onChange={e => F('projNome', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Telefone</label>
                  <input className={I} placeholder="(11) 88888-0000" value={form.projTelefone||''} onChange={e => F('projTelefone', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">E-mail</label>
                  <input type="email" className={I} placeholder="projeto@empresa.com" value={form.projEmail||''} onChange={e => F('projEmail', e.target.value)} />
                </div>

                <SecLabel t="Contrato" />
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Forma de pagamento</label>
                  <select className={I} value={form.formaPagamento||'Boleto'} onChange={e => F('formaPagamento', e.target.value)}>
                    <option>Boleto</option><option>Transferência Bancária</option><option>PIX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Regime tributário</label>
                  <select className={I} value={form.regimeTributario||''} onChange={e => F('regimeTributario', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Tipo de projeto</label>
                  <select className={I} value={form.tipoProjeto||''} onChange={e => F('tipoProjeto', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option>B2C</option><option>B2B</option><option>D2C</option><option>B2C, B2B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Serviços contratados</label>
                  <input className={I} placeholder="Ex: SEO, Performance..." value={form.servicosContratados||''} onChange={e => F('servicosContratados', e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Salvando...' : editId ? 'Salvar alterações' : 'Adicionar cliente'}</Button>
              <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {/* KPIs */}
      <Grid4>
        <KPICard label="Clientes ativos" value={String(ativos.length)} sub={`de ${clients.length} cadastrados`} color="blue" />
        <KPICard label="Receita líquida/mês" value={BRL(totalLiq)} sub="após impostos" color="green" accentColor="#1A6B4A" />
        <KPICard label="Ticket médio líquido" value={BRL(ticketMedio)} sub="por cliente/mês" color="blue" />
        <KPICard
          label="Pipeline — possíveis entradas"
          value={pipeline.length > 0 ? BRL(pipelineNet) : '—'}
          sub={pipeline.length > 0 ? `${pipeline.length} oportunidade${pipeline.length !== 1 ? 's' : ''} · potencial/mês` : 'Nenhuma oportunidade no pipeline'}
          color="blue" accentColor="#2563EB"
        />
      </Grid4>

      {/* Table */}
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
          {!showForm && <Button size="sm" variant="primary" onClick={openNew}>+ Novo</Button>}
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 900 }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Nº Contrato</th>
                  <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Serviço</th>
                  <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Bruto/mês</th>
                  <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Imposto</th>
                  <th className="text-right py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Líquido/mês</th>
                  <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Contrato</th>
                  <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Risco</th>
                  <th className="text-right py-3 pr-5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-sm text-gray-400">
                    Nenhum cliente encontrado. <button onClick={openNew} className="text-[#1A6B4A] underline">Adicionar →</button>
                  </td></tr>
                ) : clients.map(c => {
                  const imp = c.grossRevenue - c.netRevenue;
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800 truncate max-w-[180px]">{c.name}</p>
                        {c.email && <p className="text-[10px] text-gray-400 mt-0.5">{c.email}</p>}
                      </td>
                      <td className="py-3">
                        <span className="font-mono text-[#1A6B4A] font-bold bg-green-50 px-1.5 py-0.5 rounded text-[10px]">
                          {String(c.orderId ?? 0).padStart(3, '0')}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 max-w-[130px]"><span className="truncate block">{SERVICE_TYPE_LABELS[c.serviceType]}</span></td>
                      <td className="py-3 text-right text-gray-500">{BRL(c.grossRevenue)}</td>
                      <td className="py-3 text-right text-amber-600">–{BRL(imp)}<br/><span className="text-[10px] text-gray-400">({c.taxRate}%)</span></td>
                      <td className="py-3 text-right font-medium text-green-700">{BRL(c.netRevenue)}</td>
                      <td className="py-3">
                        <p className="text-gray-600">{c.isRecurring ? 'Recorrente' : 'Pontual'}</p>
                        {c.isRecurring && <p className="text-[10px] text-gray-400">{c.currentInstallment}/{c.totalInstallments||'∞'} · dia {c.dueDay}</p>}
                      </td>
                      <td className="py-3"><Pill label={STATUS_LABELS[c.status]} variant={STATUS_PILL[c.status]} /></td>
                      <td className="py-3"><Pill label={RISK_LABELS[c.riskLevel]} variant={RISK_PILL[c.riskLevel]} /></td>
                      <td className="py-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(c)} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                          <button onClick={() => deleteClient(c.id, c.name)} className="text-[11px] text-red-500 hover:text-red-700 font-medium">Remover</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50">
                  <td colSpan={3} className="px-5 py-2.5 text-[11px] text-gray-500 font-medium">{clients.length} clientes</td>
                  <td className="py-2.5 text-right text-[11px] font-medium text-gray-700">{BRL(clients.reduce((s,c)=>s+c.grossRevenue,0))}</td>
                  <td className="py-2.5 text-right text-[11px] font-medium text-amber-600">–{BRL(clients.reduce((s,c)=>s+(c.grossRevenue-c.netRevenue),0))}</td>
                  <td className="py-2.5 text-right text-[11px] font-medium text-green-700">{BRL(clients.reduce((s,c)=>s+c.netRevenue,0))}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}