'use client';
// /formulario/colaborador?empresa=SLUG — formulário público de ficha cadastral
// Baseado nos campos do FORM_COLABORADORES.xlsx da ALMAH
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

const I = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors';
const L = 'block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1';

function Sec({ t }: { t: string }) {
  return <div className="col-span-2 pt-2 mt-2 mb-0">
    <p className="text-[10px] font-bold text-[#1A6B4A] uppercase tracking-widest pb-1 border-b border-green-100">{t}</p>
  </div>;
}

export default function FormColaborador() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('empresa') || '';
  
  const [f, setF] = useState({
    name:'', razaoSocial:'', cnpj:'', document:'', rg:'',
    email:'', phone:'', birthDate:'', estadoCivil:'', instagram:'', nivelExperiencia:'',
    position:'', salary:'', startDate: new Date().toISOString().slice(0,10),
    pixKey:'', bankData:'', address:'', notes:'',
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) { setError('Link inválido. Solicite um novo link.'); return; }
    setSaving(true); setError('');
    const r = await fetch('/api/intake/colaborador', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ companySlug: slug, ...f, salary: parseFloat(f.salary)||0 }),
    });
    setSaving(false);
    if (r.ok) setDone(true);
    else { const d = await r.json().catch(()=>({})); setError(d.error || 'Erro ao enviar.'); }
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
            <p className="font-bold text-gray-900">Ficha Cadastral — Colaborador</p>
            <p className="text-xs text-gray-400">Preencha todos os campos. Dados seguros e confidenciais.</p>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Sec t="Identificação Pessoal"/>
            <div className="col-span-2"><label className={L}>Nome completo *</label>
              <input required className={I} placeholder="Seu nome completo" value={f.name} onChange={set('name')}/></div>
            <div><label className={L}>Razão Social (PJ)</label>
              <input className={I} placeholder="Nome da empresa" value={f.razaoSocial} onChange={set('razaoSocial')}/></div>
            <div><label className={L}>CNPJ (PJ)</label>
              <input className={I} placeholder="00.000.000/0001-00" value={f.cnpj} onChange={set('cnpj')}/></div>
            <div><label className={L}>CPF *</label>
              <input required className={I} placeholder="000.000.000-00" value={f.document} onChange={set('document')}/></div>
            <div><label className={L}>RG</label>
              <input className={I} placeholder="00.000.000-0" value={f.rg} onChange={set('rg')}/></div>
            <div><label className={L}>E-mail *</label>
              <input required type="email" className={I} placeholder="seu@email.com" value={f.email} onChange={set('email')}/></div>
            <div><label className={L}>Telefone / WhatsApp *</label>
              <input required className={I} placeholder="(11) 99999-0000" value={f.phone} onChange={set('phone')}/></div>
            <div><label className={L}>Data de nascimento</label>
              <input type="date" className={I} value={f.birthDate} onChange={set('birthDate')}/></div>
            <div><label className={L}>Estado civil</label>
              <select className={I} value={f.estadoCivil} onChange={set('estadoCivil')}>
                <option value="">Selecione...</option>
                <option>Solteiro(a)</option><option>Casado(a)</option>
                <option>Divorciado(a)</option><option>Viúvo(a)</option><option>União estável</option>
              </select></div>
            <div><label className={L}>Instagram</label>
              <input className={I} placeholder="@seuinstagram" value={f.instagram} onChange={set('instagram')}/></div>
            <div><label className={L}>Nível de experiência</label>
              <select className={I} value={f.nivelExperiencia} onChange={set('nivelExperiencia')}>
                <option value="">Selecione...</option>
                <option>Júnior</option><option>Pleno</option><option>Sênior</option>
                <option>Especialista</option><option>Gestor</option>
              </select></div>

            <Sec t="Serviço e Remuneração"/>
            <div><label className={L}>Tipo de serviço prestado *</label>
              <input required className={I} placeholder="Ex: SEO, Performance, Dev Web..." value={f.position} onChange={set('position')}/></div>
            <div><label className={L}>Valor negociado (R$/mês)</label>
              <input type="number" min="0" step="0.01" className={I} placeholder="0,00" value={f.salary} onChange={set('salary')}/></div>
            <div><label className={L}>Data de entrada</label>
              <input type="date" className={I} value={f.startDate} onChange={set('startDate')}/></div>

            <Sec t="Dados Bancários e PIX"/>
            <div className="col-span-2"><label className={L}>Chave PIX *</label>
              <input required className={I} placeholder="CPF, e-mail, celular ou chave aleatória" value={f.pixKey} onChange={set('pixKey')}/></div>
            <div className="col-span-2"><label className={L}>Dados bancários (Banco / Agência / Conta)</label>
              <input className={I} placeholder="Ex: Banco C6 - AG: 0001 - CC: 1234567-8" value={f.bankData} onChange={set('bankData')}/></div>

            <Sec t="Endereço"/>
            <div className="col-span-2"><label className={L}>Endereço completo</label>
              <input className={I} placeholder="Rua, número, bairro, cidade, estado, CEP" value={f.address} onChange={set('address')}/></div>

            <Sec t="Informações Adicionais"/>
            <div className="col-span-2"><label className={L}>Observações</label>
              <textarea className={I} rows={3} placeholder="Qualquer informação adicional..." value={f.notes} onChange={set('notes')}/></div>
          </div>

          {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={saving}
            className="mt-5 w-full py-3 bg-[#1A6B4A] text-white font-semibold rounded-xl hover:bg-green-800 disabled:opacity-60 transition-colors text-sm">
            {saving ? 'Enviando...' : 'Enviar ficha cadastral'}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-3">
            Informações armazenadas com segurança e usadas somente para fins contratuais.
          </p>
        </form>
      </div>
    </div>
  );
}
