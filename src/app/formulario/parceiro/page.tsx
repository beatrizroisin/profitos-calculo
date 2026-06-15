'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const I = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors';
const L = 'block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1';

function Sec({ t }: { t: string }) {
  return (
    <div className="col-span-2 pt-2 mt-2 mb-0">
      <p className="text-[10px] font-bold text-[#1A6B4A] uppercase tracking-widest pb-1 border-b border-green-100">{t}</p>
    </div>
  );
}

function FormContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('empresa') || '';

  const [f, setF] = useState({
    name: '', email: '', phone: '', document: '',
    pixKey: '', bankName: '', bankAgency: '', bankAccount: '',
    paymentDay: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug)                          { setError('Link inválido.'); return; }
    if (!f.name || !f.email || !f.pixKey) { setError('Preencha nome, e-mail e chave PIX.'); return; }
    setSaving(true); setError('');
    const r = await fetch('/api/intake/parceiro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companySlug: slug, ...f }),
    });
    setSaving(false);
    if (r.ok) setDone(true);
    else { const d = await r.json().catch(() => ({})); setError(d.error || 'Erro ao enviar.'); }
  }

  if (!slug) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow">
        <p className="text-red-600 font-semibold">Link inválido.</p>
        <p className="text-gray-500 text-sm mt-1">Solicite um novo link de cadastro.</p>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-10 max-w-md text-center shadow-lg">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Ficha enviada!</h2>
        <p className="text-gray-500 text-sm">Suas informações foram recebidas. A equipe entrará em contato em breve.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-9 h-9 bg-[#1A6B4A] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-900">Ficha Cadastral — Parceiro</p>
            <p className="text-xs text-gray-400">Preencha seus dados para formalizar a parceria.</p>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Sec t="Identificação" />
            <div className="col-span-2">
              <label className={L}>Nome completo *</label>
              <input required className={I} placeholder="Seu nome completo" value={f.name} onChange={set('name')} />
            </div>
            <div>
              <label className={L}>E-mail *</label>
              <input required type="email" className={I} placeholder="seu@email.com" value={f.email} onChange={set('email')} />
            </div>
            <div>
              <label className={L}>Telefone / WhatsApp</label>
              <input className={I} placeholder="(11) 99999-0000" value={f.phone} onChange={set('phone')} />
            </div>
            <div>
              <label className={L}>CPF</label>
              <input className={I} placeholder="000.000.000-00" value={f.document} onChange={set('document')} />
            </div>

            <Sec t="Dados Bancários e PIX" />
            <div className="col-span-2">
              <label className={L}>Chave PIX *</label>
              <input required className={I} placeholder="CPF, e-mail, celular ou chave aleatória" value={f.pixKey} onChange={set('pixKey')} />
            </div>
            <div>
              <label className={L}>Banco</label>
              <input className={I} placeholder="Ex: Itaú, Nubank, Inter..." value={f.bankName} onChange={set('bankName')} />
            </div>
            <div>
              <label className={L}>Agência</label>
              <input className={I} placeholder="0000" value={f.bankAgency} onChange={set('bankAgency')} />
            </div>
            <div>
              <label className={L}>Conta</label>
              <input className={I} placeholder="00000-0" value={f.bankAccount} onChange={set('bankAccount')} />
            </div>
            <div>
              <label className={L}>Dia de pagamento preferido</label>
              <input type="number" min="1" max="31" className={I} placeholder="5" value={f.paymentDay} onChange={set('paymentDay')} />
            </div>

            <Sec t="Informações Adicionais" />
            <div className="col-span-2">
              <label className={L}>Observações</label>
              <textarea className={I} rows={3} placeholder="Qualquer informação adicional..."
                value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={saving}
            className="mt-5 w-full py-3 bg-[#1A6B4A] text-white font-semibold rounded-xl hover:bg-green-800 disabled:opacity-60 transition-colors text-sm">
            {saving ? 'Enviando...' : 'Enviar ficha de parceiro'}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-3">
            Informações armazenadas com segurança e usadas somente para fins contratuais.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function FormParceiro() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-400">Carregando...</div>}>
      <FormContent />
    </Suspense>
  );
}