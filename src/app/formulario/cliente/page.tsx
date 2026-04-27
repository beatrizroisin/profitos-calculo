'use client';
// /formulario/cliente?empresa=SLUG — minuta contratual pública
// Baseado nos campos do FORMULA_RIO_MINUTA_CONTRATUAL_ALMAH.xlsx
import { useState } from 'react';

const I = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors';
const L = 'block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1';

const SERVICOS = [
  'Migração para VTEX IO com Redesign',
  'Arquitetura de E-commerce',
  'Implantação de E-commerce',
  'Pacote de Evolução Básico — Suporte + Manutenção do Front end',
  'Pacote de Evolução Intermediário — Growth (CRO+SEO) + Suporte + Manutenção + UX',
  'Pacote de Evolução Avançado — Performance + Inbound + Growth + Suporte + UX',
  'Plano de Evolução — Horas',
  'Plano de Evolução — Semidedicado',
  'Profissionais 100% Dedicados (Outsourcing)',
  'SEO',
  'Inbound Marketing',
  'Performance',
];

function Sec({ t }: { t: string }) {
  return <div className="col-span-2 pt-2 mt-2">
    <p className="text-[10px] font-bold text-[#1A6B4A] uppercase tracking-widest pb-1 border-b border-green-100">{t}</p>
  </div>;
}

export default function FormCliente({ searchParams }: { searchParams: { empresa?: string } }) {
  const slug = searchParams.empresa || '';
  const [f, setF] = useState({
    razaoSocial:'', cnpj:'', endereco:'',
    representanteLegal:'', testemunha:'',
    emailRepresentante:'', cpfRepresentante:'',
    formaPagamento:'Boleto', diaVencimento:'5',
    responsavelFinanceiro:'', responsavelProjeto:'',
    regimeTributario:'', tipoProjeto:'',
    servicosContratados:[] as string[],
    quantidadePagamentos:'12', valorMensal:'',
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const toggleS = (s: string) => setF(p => ({
    ...p,
    servicosContratados: p.servicosContratados.includes(s)
      ? p.servicosContratados.filter(x => x !== s)
      : [...p.servicosContratados, s],
  }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) { setError('Link inválido. Solicite um novo link.'); return; }
    setSaving(true); setError('');
    const r = await fetch('/api/intake/cliente', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        companySlug: slug, ...f,
        servicosContratados: f.servicosContratados.join(', '),
        valorMensal: parseFloat(f.valorMensal)||0,
      }),
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
        <h2 className="text-xl font-bold text-gray-900 mb-2">Dados recebidos!</h2>
        <p className="text-gray-500 text-sm">Nossa equipe comercial entrará em contato para confirmar os detalhes do contrato.</p>
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
            <p className="font-bold text-gray-900">Minuta Contratual — ALMAH</p>
            <p className="text-xs text-gray-400">Preencha as informações para formalização do contrato</p>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Sec t="Identificação da Empresa"/>
            <div className="col-span-2"><label className={L}>Razão Social *</label>
              <input required className={I} placeholder="Nome completo da empresa" value={f.razaoSocial} onChange={set('razaoSocial')}/></div>
            <div><label className={L}>CNPJ</label>
              <input className={I} placeholder="00.000.000/0001-00" value={f.cnpj} onChange={set('cnpj')}/></div>
            <div><label className={L}>Endereço completo</label>
              <input className={I} placeholder="Rua, número, bairro, cidade, estado, CEP" value={f.endereco} onChange={set('endereco')}/></div>

            <Sec t="Representantes"/>
            <div className="col-span-2"><label className={L}>Representante legal (Nome + RG + CPF + estado civil + e-mail)</label>
              <input className={I} placeholder="João Silva — RG 1234567 — CPF 000.000.000-00 — Casado — joao@empresa.com" value={f.representanteLegal} onChange={set('representanteLegal')}/></div>
            <div><label className={L}>E-mail do representante legal *</label>
              <input required type="email" className={I} placeholder="joao@empresa.com" value={f.emailRepresentante} onChange={set('emailRepresentante')}/></div>
            <div><label className={L}>CPF do representante legal</label>
              <input className={I} placeholder="000.000.000-00" value={f.cpfRepresentante} onChange={set('cpfRepresentante')}/></div>
            <div className="col-span-2"><label className={L}>Testemunha (Nome + CPF + e-mail)</label>
              <input className={I} placeholder="Maria Santos — CPF 111.111.111-11 — maria@empresa.com" value={f.testemunha} onChange={set('testemunha')}/></div>

            <Sec t="Responsáveis"/>
            <div className="col-span-2"><label className={L}>Responsável financeiro (Nome + e-mail + telefone)</label>
              <input className={I} placeholder="Carlos — financeiro@empresa.com — (11) 99999-0000" value={f.responsavelFinanceiro} onChange={set('responsavelFinanceiro')}/></div>
            <div className="col-span-2"><label className={L}>Responsável pelo projeto (Nome + e-mail + telefone)</label>
              <input className={I} placeholder="Ana — ana@empresa.com — (11) 88888-0000" value={f.responsavelProjeto} onChange={set('responsavelProjeto')}/></div>

            <Sec t="Contrato e Pagamento"/>
            <div><label className={L}>Forma de pagamento</label>
              <select className={I} value={f.formaPagamento} onChange={set('formaPagamento')}>
                <option>Boleto</option><option>Transferência Bancária</option><option>PIX</option>
              </select></div>
            <div><label className={L}>Dia de vencimento</label>
              <select className={I} value={f.diaVencimento} onChange={set('diaVencimento')}>
                <option value="5">Dia 5</option><option value="10">Dia 10</option>
                <option value="15">Dia 15</option><option value="20">Dia 20</option>
                <option value="25">Dia 25</option>
              </select></div>
            <div><label className={L}>Regime tributário</label>
              <select className={I} value={f.regimeTributario} onChange={set('regimeTributario')}>
                <option value="">Selecione...</option>
                <option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option>
              </select></div>
            <div><label className={L}>Tipo de projeto</label>
              <select className={I} value={f.tipoProjeto} onChange={set('tipoProjeto')}>
                <option value="">Selecione...</option>
                <option>B2C</option><option>B2B</option><option>D2C</option><option>B2C, B2B</option>
              </select></div>
            <div><label className={L}>Quantidade de parcelas</label>
              <input type="number" min="1" className={I} placeholder="12" value={f.quantidadePagamentos} onChange={set('quantidadePagamentos')}/></div>
            <div><label className={L}>Valor da parcela (R$)</label>
              <input type="number" min="0" step="0.01" className={I} placeholder="0,00" value={f.valorMensal} onChange={set('valorMensal')}/></div>

            <Sec t="Serviços Contratados"/>
            <div className="col-span-2 space-y-2">
              {SERVICOS.map(s => (
                <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={f.servicosContratados.includes(s)} onChange={()=>toggleS(s)}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 cursor-pointer flex-shrink-0"/>
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={saving}
            className="mt-5 w-full py-3 bg-[#1A6B4A] text-white font-semibold rounded-xl hover:bg-green-800 disabled:opacity-60 transition-colors text-sm">
            {saving ? 'Enviando...' : 'Enviar dados contratuais'}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-3">
            Informações armazenadas com segurança e utilizadas exclusivamente para fins contratuais.
          </p>
        </form>
      </div>
    </div>
  );
}
