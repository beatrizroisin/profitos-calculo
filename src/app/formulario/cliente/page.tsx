'use client';
import { useState, useEffect, useRef } from 'react';
import InputMask from 'react-input-mask';

const I = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-gray-300';
const IE = 'w-full px-3 py-2.5 border border-red-400 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400 outline-none transition-all placeholder:text-gray-300';
const L = 'block text-[10px] font-bold text-gray-500 uppercase mb-1';
const HELP = 'text-[9px] text-gray-400 mt-1 italic leading-tight';

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
  return (
    <div className="col-span-2 mt-6 mb-2 border-b border-green-100 pb-1">
      <p className="text-[10px] font-black text-[#1A6B4A] uppercase tracking-[0.2em]">{t}</p>
    </div>
  );
}

type FieldErrors = Record<string, string>;

export default function FormCliente({ searchParams }: { searchParams: { empresa?: string } }) {
  const slug = searchParams.empresa || '';
  const [mounted, setMounted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const errorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [f, setF] = useState({
    razaoSocial: '', cnpj: '', aniversario: '',
    endCep: '', endRua: '', endNumero: '', endBairro: '', endCidade: '', endEstado: '',
    repNome: '', repRG: '', repCPF: '', repEstadoCivil: '', repEmail: '',
    testNome: '', testCPF: '', testEmail: '',
    finNome: '', finEmail: '', finTelefone: '',
    projNome: '', projEmail: '', projTelefone: '',
    formaPagamento: 'Boleto', diaVencimento: '5',
    regimeTributario: '', tipoProjeto: '',
    quantidadePagamentos: '12', valorMensal: '',
    servicosContratados: [] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [tracking, setTracking] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const set = (k: string) => (e: any) => {
    setF(p => ({ ...p, [k]: e.target.value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  async function buscarCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setF(p => ({
          ...p,
          endRua:    d.logradouro || p.endRua,
          endBairro: d.bairro     || p.endBairro,
          endCidade: d.localidade || p.endCidade,
          endEstado: d.uf         || p.endEstado,
        }));
      }
    } catch {}
  }

  function scrollToField(key: string) {
    const el = errorRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setSaving(true); setError(''); setFieldErrors({});

    try {
      const r = await fetch('/api/intake/cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companySlug:          slug,
          razaoSocial:          f.razaoSocial,
          cnpj:                 f.cnpj,
          aniversario:          f.aniversario,
          endCep:               f.endCep,
          endRua:               f.endRua,
          endNumero:            f.endNumero,
          endBairro:            f.endBairro,
          endCidade:            f.endCidade,
          endEstado:            f.endEstado,
          repNome:              f.repNome,
          repRG:                f.repRG,
          repCPF:               f.repCPF,
          repEstadoCivil:       f.repEstadoCivil,
          repEmail:             f.repEmail,
          testNome:             f.testNome,
          testCPF:              f.testCPF,
          testEmail:            f.testEmail,
          finNome:              f.finNome,
          finEmail:             f.finEmail,
          finTelefone:          f.finTelefone,
          projNome:             f.projNome,
          projEmail:            f.projEmail,
          projTelefone:         f.projTelefone,
          formaPagamento:       f.formaPagamento,
          diaVencimento:        f.diaVencimento,
          regimeTributario:     f.regimeTributario,
          tipoProjeto:          f.tipoProjeto,
          servicosContratados:  f.servicosContratados.join(', '),
          quantidadePagamentos: f.quantidadePagamentos,
          valorMensal:          parseFloat(f.valorMensal) || 0,
        }),
      });

      const d = await r.json();

      if (r.ok) {
        setTracking(d.trackingNumber);
        setDone(true);
      } else if (r.status === 400 && d.details) {
        const errs: FieldErrors = {};
        d.details.forEach((err: any) => {
          const field = err.path?.[0];
          if (field) errs[field] = err.message;
        });
        setFieldErrors(errs);
        const firstKey = Object.keys(errs)[0];
        if (firstKey) setTimeout(() => scrollToField(firstKey), 100);
        setError('Corrija os campos destacados em vermelho.');
        setSaving(false);
      } else {
        setError(d.error || 'Erro ao enviar.');
        setSaving(false);
      }
    } catch {
      setError('Erro de conexão com o servidor.');
      setSaving(false);
    }
  }

  const field = (key: string) => ({
    ref: (el: HTMLDivElement | null) => { errorRefs.current[key] = el; },
  });

  const inp = (key: string) => fieldErrors[key] ? IE : I;

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-sm border border-gray-100">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Sucesso!</h2>
        <p className="text-gray-500 mt-2 text-sm">A sua minuta foi recebida pela equipe ALMAH.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans">
      <div className="max-w-3xl mx-auto">
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

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="grid grid-cols-2 gap-4">

            {/* ── IDENTIFICAÇÃO DA EMPRESA ── */}
            <Sec t="Identificação da Empresa" />
            <div className="col-span-2" {...field('razaoSocial')}>
              <label className={L}>Razão Social *</label>
              <input required className={inp('razaoSocial')} placeholder="Nome completo da empresa" value={f.razaoSocial} onChange={set('razaoSocial')} />
              {fieldErrors.razaoSocial && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.razaoSocial}</p>}
            </div>
            <div>
              <label className={L}>CNPJ</label>
              {mounted
                ? <InputMask mask="99.999.999/9999-99" className={I} placeholder="00.000.000/0001-00" value={f.cnpj} onChange={set('cnpj')} />
                : <input className={I} placeholder="00.000.000/0001-00" />}
            </div>
            <div>
              <label className={L}>Aniversário da Empresa</label>
              <input type="date" className={I} value={f.aniversario} onChange={set('aniversario')} />
              <p className={HELP}>Data de fundação ou aniversário do cliente.</p>
            </div>

            {/* Endereço separado */}
            <div>
              <label className={L}>CEP</label>
              {mounted
                ? <InputMask mask="99999-999" className={I} placeholder="00000-000" value={f.endCep}
                    onChange={set('endCep')}
                    onBlur={e => buscarCep(e.target.value)} />
                : <input className={I} placeholder="00000-000" />}
              <p className={HELP}>Digite o CEP para preencher o endereço automaticamente.</p>
            </div>
            <div>
              <label className={L}>Número</label>
              <input className={I} placeholder="123" value={f.endNumero} onChange={set('endNumero')} />
            </div>
            <div className="col-span-2">
              <label className={L}>Rua / Logradouro</label>
              <input className={I} placeholder="Rua das Flores" value={f.endRua} onChange={set('endRua')} />
            </div>
            <div>
              <label className={L}>Bairro</label>
              <input className={I} placeholder="Centro" value={f.endBairro} onChange={set('endBairro')} />
            </div>
            <div>
              <label className={L}>Cidade</label>
              <input className={I} placeholder="São Paulo" value={f.endCidade} onChange={set('endCidade')} />
            </div>
            <div>
              <label className={L}>Estado (UF)</label>
              <input className={I} placeholder="SP" maxLength={2} value={f.endEstado} onChange={set('endEstado')} />
            </div>

            {/* ── REPRESENTANTE LEGAL ── */}
            <Sec t="Representante Legal" />
            <div className="col-span-2" {...field('repNome')}>
              <label className={L}>Nome do Representante Legal *</label>
              <input required className={inp('repNome')} placeholder="Nome completo de quem assina o contrato" value={f.repNome} onChange={set('repNome')} />
              {fieldErrors.repNome && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.repNome}</p>}
              <p className={HELP}>Pessoa que assinará digitalmente ou fisicamente o documento.</p>
            </div>
            <div>
              <label className={L}>RG</label>
              <input className={I} placeholder="00.000.000-0" value={f.repRG} onChange={set('repRG')} />
            </div>
            <div>
              <label className={L}>CPF do Representante Legal</label>
              {mounted
                ? <InputMask mask="999.999.999-99" className={I} placeholder="000.000.000-00" value={f.repCPF} onChange={set('repCPF')} />
                : <input className={I} placeholder="000.000.000-00" />}
            </div>
            <div>
              <label className={L}>Estado Civil</label>
              <input className={I} placeholder="Ex: Solteiro(a), Casado(a)" value={f.repEstadoCivil} onChange={set('repEstadoCivil')} />
            </div>
            <div {...field('repEmail')}>
              <label className={L}>E-mail do Representante Legal *</label>
              <input required type="email" className={inp('repEmail')} placeholder="representante@empresa.com" value={f.repEmail} onChange={set('repEmail')} />
              {fieldErrors.repEmail && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.repEmail}</p>}
            </div>

            {/* ── TESTEMUNHA ── */}
            <Sec t="Testemunha" />
            <div className="col-span-2">
              <label className={L}>Nome da Testemunha</label>
              <input className={I} placeholder="Nome completo da testemunha" value={f.testNome} onChange={set('testNome')} />
              <p className={HELP}>Segunda pessoa necessária para validar a minuta.</p>
            </div>
            <div>
              <label className={L}>CPF da Testemunha</label>
              {mounted
                ? <InputMask mask="999.999.999-99" className={I} placeholder="000.000.000-00" value={f.testCPF} onChange={set('testCPF')} />
                : <input className={I} placeholder="000.000.000-00" />}
            </div>
            <div>
              <label className={L}>E-mail da Testemunha</label>
              <input type="email" className={I} placeholder="testemunha@empresa.com" value={f.testEmail} onChange={set('testEmail')} />
            </div>

            {/* ── RESPONSÁVEL FINANCEIRO ── */}
            <Sec t="Responsável Financeiro" />
            <div>
              <label className={L}>Nome</label>
              <input className={I} placeholder="Nome do responsável financeiro" value={f.finNome} onChange={set('finNome')} />
            </div>
            <div>
              <label className={L}>Telefone</label>
              {mounted
                ? <InputMask mask="(99) 99999-9999" className={I} placeholder="(11) 99999-0000" value={f.finTelefone} onChange={set('finTelefone')} />
                : <input className={I} placeholder="(11) 99999-0000" />}
            </div>
            <div className="col-span-2">
              <label className={L}>E-mail p/ Notas Fiscais</label>
              <input type="email" className={I} placeholder="financeiro@empresa.com" value={f.finEmail} onChange={set('finEmail')} />
            </div>

            {/* ── RESPONSÁVEL PELO PROJETO ── */}
            <Sec t="Responsável pelo Projeto" />
            <div>
              <label className={L}>Nome</label>
              <input className={I} placeholder="Nome do gestor do projeto" value={f.projNome} onChange={set('projNome')} />
              <p className={HELP}>Quem acompanhará a implantação do projeto.</p>
            </div>
            <div>
              <label className={L}>Telefone</label>
              {mounted
                ? <InputMask mask="(99) 99999-9999" className={I} placeholder="(11) 88888-0000" value={f.projTelefone} onChange={set('projTelefone')} />
                : <input className={I} placeholder="(11) 88888-0000" />}
            </div>
            <div className="col-span-2">
              <label className={L}>E-mail do Responsável pelo Projeto</label>
              <input type="email" className={I} placeholder="projeto@empresa.com" value={f.projEmail} onChange={set('projEmail')} />
            </div>

            {/* ── CONTRATO E PAGAMENTO ── */}
            <Sec t="Contrato e Pagamento" />
            <div>
              <label className={L}>Forma de pagamento</label>
              <select className={I} value={f.formaPagamento} onChange={set('formaPagamento')}>
                <option>Boleto</option>
                <option>Transferência Bancária</option>
                <option>PIX</option>
              </select>
            </div>
            <div>
              <label className={L}>Dia de vencimento</label>
              <select className={I} value={f.diaVencimento} onChange={set('diaVencimento')}>
                <option value="5">Dia 5</option>
                <option value="10">Dia 10</option>
                <option value="15">Dia 15</option>
                <option value="20">Dia 20</option>
                <option value="25">Dia 25</option>
              </select>
            </div>
            <div>
              <label className={L}>Regime tributário</label>
              <select className={I} value={f.regimeTributario} onChange={set('regimeTributario')}>
                <option value="">Selecione...</option>
                <option>Simples Nacional</option>
                <option>Lucro Presumido</option>
                <option>Lucro Real</option>
              </select>
            </div>
            <div>
              <label className={L}>Tipo de projeto</label>
              <select className={I} value={f.tipoProjeto} onChange={set('tipoProjeto')}>
                <option value="">Selecione...</option>
                <option>B2C</option>
                <option>B2B</option>
                <option>D2C</option>
                <option>B2C, B2B</option>
              </select>
            </div>
            <div>
              <label className={L}>Quantidade de parcelas</label>
              <input type="number" min="1" className={I} placeholder="12" value={f.quantidadePagamentos} onChange={set('quantidadePagamentos')} />
            </div>
            <div>
              <label className={L}>Valor da parcela (R$)</label>
              <input type="number" min="0" step="0.01" className={I} placeholder="0,00" value={f.valorMensal} onChange={set('valorMensal')} />
            </div>

            {/* ── SERVIÇOS CONTRATADOS ── */}
            <Sec t="Serviços Contratados" />
            <div className="col-span-2 space-y-2">
              {SERVICOS.map(s => (
                <label key={s} className="flex items-center gap-2.5 cursor-pointer p-2 border border-gray-100 rounded-lg hover:bg-green-50 transition-colors group">
                  <input
                    type="checkbox"
                    checked={f.servicosContratados.includes(s)}
                    onChange={() => setF(p => ({
                      ...p,
                      servicosContratados: p.servicosContratados.includes(s)
                        ? p.servicosContratados.filter(x => x !== s)
                        : [...p.servicosContratados, s],
                    }))}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{s}</span>
                </label>
              ))}
            </div>

          </div>

          {error && (
            <p className="text-red-500 text-xs mt-6 font-bold bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>
          )}

          <button type="submit" disabled={saving}
            className="w-full mt-10 py-5 bg-[#1A6B4A] text-white font-black rounded-2xl hover:bg-[#145339] disabled:opacity-50 transition-all shadow-xl shadow-green-100 uppercase tracking-widest text-[11px]">
            {saving ? 'Validando informações...' : 'Finalizar e Enviar para ALMAH'}
          </button>
        </form>
      </div>
    </div>
  );
}