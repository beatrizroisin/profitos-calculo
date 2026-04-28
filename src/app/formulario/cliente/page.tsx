'use client';
import { useState, useEffect } from 'react';
import InputMask from 'react-input-mask';

const I = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-gray-300';
const L = 'block text-[10px] font-bold text-gray-500 uppercase mb-1';
const HELP = 'text-[9px] text-gray-400 mt-1 italic leading-tight';

const SERVICOS = [
  'Migração para VTEX IO com Redesign', 'Arquitetura de E-commerce', 'Implantação de E-commerce',
  'Pacote de Evolução Básico', 'Pacote de Evolução Intermediário', 'Pacote de Evolução Avançado',
  'Plano de Evolução — Horas', 'SEO', 'Inbound Marketing', 'Performance'
];

function Sec({ t }: { t: string }) {
  return <div className="col-span-2 mt-6 mb-2 border-b border-green-100 pb-1">
    <p className="text-[10px] font-black text-[#1A6B4A] uppercase tracking-[0.2em]">{t}</p>
  </div>;
}

export default function FormCliente({ searchParams }: { searchParams: { empresa?: string } }) {
  const slug = searchParams.empresa || '';
  const [mounted, setMounted] = useState(false);
  
  const [f, setF] = useState({
    razaoSocial:'', cnpj:'', endereco:'',
    repNome:'', repRG:'', repCPF:'', repEstadoCivil:'', repEmail:'',
    testNome:'', testCPF:'', testEmail:'',
    finNome:'', finEmail:'', finTelefone:'',
    projNome:'', projEmail:'', projTelefone:'',
    formaPagamento:'Boleto', diaVencimento:'5',
    regimeTributario:'', tipoProjeto:'',
    servicosContratados:[] as string[],
    quantidadePagamentos:'12', valorMensal:'',
  });

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [tracking, setTracking] = useState('');
  const [error, setError] = useState('');

  // Corrige o erro de hidratação em produção
  useEffect(() => {
    setMounted(true);
  }, []);

  const set = (k: string) => (e: any) => setF(p => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setSaving(true); setError('');

    try {
      const r = await fetch('/api/intake/cliente', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          companySlug: slug, ...f,
          servicosContratados: f.servicosContratados.join(', '),
          valorMensal: parseFloat(f.valorMensal) || 0,
        }),
      });

      const d = await r.json();

      if (r.ok) {
        setTracking(d.trackingNumber);
        setDone(true);
      } else {
        setError(d.error || 'Verifique se todos os campos foram preenchidos.');
        setSaving(false);
      }
    } catch {
      setError('Erro de conexão com o servidor.');
      setSaving(false);
    }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-sm border border-gray-100">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
          <span className="text-green-600 font-black text-2xl">{tracking}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Sucesso!</h2>
        <p className="text-gray-500 mt-2 text-sm">A sua minuta foi recebida pela equipe ALMAH.</p>
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Identificador do Contrato</p>
          <p className="text-xl font-mono font-bold text-[#1A6B4A]">{tracking}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
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
          
          <div className="grid grid-cols-2 gap-4">
            <Sec t="1. Dados da Empresa" />
            <div className="col-span-2">
              <label className={L}>Razão Social *</label>
              <input required className={I} placeholder="Ex: Minha Empresa de Tecnologia LTDA" value={f.razaoSocial} onChange={set('razaoSocial')} />
            </div>
            <div>
              <label className={L}>CNPJ *</label>
              {mounted ? (
                <InputMask mask="99.999.999/9999-99" required className={I} placeholder="00.000.000/0000-00" value={f.cnpj} onChange={set('cnpj')} />
              ) : (
                <input className={I} placeholder="00.000.000/0000-00" />
              )}
            </div>
            <div>
              <label className={L}>Endereço Comercial *</label>
              <input required className={I} placeholder="Rua, Número, Bairro, Cidade - UF" value={f.endereco} onChange={set('endereco')} />
            </div>

            <Sec t="2. Representante Legal" />
            <div className="col-span-2">
              <label className={L}>Nome do Representante *</label>
              <input required className={I} placeholder="Nome de quem tem poder de assinatura" value={f.repNome} onChange={set('repNome')} />
              <p className={HELP}>Pessoa que assinará digitalmente/fisicamente o documento.</p>
            </div>
            <div>
              <label className={L}>RG *</label>
              <input required className={I} placeholder="00.000.000-0" value={f.repRG} onChange={set('repRG')} />
            </div>
            <div>
              <label className={L}>CPF *</label>
              {mounted ? (
                <InputMask mask="999.999.999-99" required className={I} placeholder="000.000.000-00" value={f.repCPF} onChange={set('repCPF')} />
              ) : (
                <input className={I} placeholder="000.000.000-00" />
              )}
            </div>
            <div>
              <label className={L}>Estado Civil *</label>
              <input required className={I} placeholder="Ex: Solteiro(a), Casado(a)" value={f.repEstadoCivil} onChange={set('repEstadoCivil')} />
            </div>
            <div>
              <label className={L}>E-mail Principal *</label>
              <input required type="email" className={I} placeholder="representante@email.com" value={f.repEmail} onChange={set('repEmail')} />
            </div>

            <Sec t="3. Testemunha de Contrato" />
            <div className="col-span-2">
              <label className={L}>Nome da Testemunha *</label>
              <input required className={I} placeholder="Ex: Sócio ou gerente da empresa" value={f.testNome} onChange={set('testNome')} />
              <p className={HELP}>Segunda pessoa necessária para validar a minuta.</p>
            </div>
            <div>
              <label className={L}>CPF da Testemunha *</label>
              {mounted ? (
                <InputMask mask="999.999.999-99" required className={I} placeholder="000.000.000-00" value={f.testCPF} onChange={set('testCPF')} />
              ) : (
                <input className={I} placeholder="000.000.000-00" />
              )}
            </div>
            <div>
              <label className={L}>E-mail da Testemunha *</label>
              <input required type="email" className={I} placeholder="testemunha@email.com" value={f.testEmail} onChange={set('testEmail')} />
            </div>

            <Sec t="4. Contatos Operacionais" />
            <div className="col-span-1">
              <label className={L}>Nome Financeiro *</label>
              <input required className={I} placeholder="Responsável p/ faturas" value={f.finNome} onChange={set('finNome')} />
            </div>
            <div className="col-span-1">
              <label className={L}>WhatsApp Financeiro *</label>
              {mounted ? (
                <InputMask mask="(99) 99999-9999" required className={I} placeholder="(00) 00000-0000" value={f.finTelefone} onChange={set('finTelefone')} />
              ) : (
                <input className={I} placeholder="(00) 00000-0000" />
              )}
            </div>
            <div className="col-span-2">
              <label className={L}>E-mail p/ Notas Fiscais *</label>
              <input required type="email" className={I} placeholder="financeiro@empresa.com" value={f.finEmail} onChange={set('finEmail')} />
            </div>
            <hr className="col-span-2 my-2 opacity-20" />
            <div className="col-span-1">
              <label className={L}>Gestor do Projeto *</label>
              <input required className={I} placeholder="Quem acompanhará a implantação?" value={f.projNome} onChange={set('projNome')} />
            </div>
            <div className="col-span-1">
              <label className={L}>WhatsApp do Gestor *</label>
              {mounted ? (
                <InputMask mask="(99) 99999-9999" required className={I} placeholder="(00) 00000-0000" value={f.projTelefone} onChange={set('projTelefone')} />
              ) : (
                <input className={I} placeholder="(00) 00000-0000" />
              )}
            </div>

            <Sec t="5. Condições Comerciais" />
            <div>
              <label className={L}>Dia de Vencimento *</label>
              <select className={I} value={f.diaVencimento} onChange={set('diaVencimento')}>
                {['5','10','15','20','25'].map(d => <option key={d} value={d}>Todo dia {d}</option>)}
              </select>
            </div>
            <div>
              <label className={L}>Regime Tributário *</label>
              <select required className={I} value={f.regimeTributario} onChange={set('regimeTributario')}>
                <option value="">Selecione...</option>
                <option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option>
              </select>
            </div>
            <div>
              <label className={L}>Parcelas Totais *</label>
              <input type="number" required className={I} placeholder="Ex: 12" value={f.quantidadePagamentos} onChange={set('quantidadePagamentos')} />
            </div>
            <div>
              <label className={L}>Valor da Parcela (R$) *</label>
              <input type="number" step="0.01" required className={I} placeholder="0,00" value={f.valorMensal} onChange={set('valorMensal')} />
            </div>

            <div className="col-span-2 mt-4">
              <label className={L}>Serviços Contratados *</label>
              <p className={HELP}>Marque todos os itens inclusos neste contrato.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                {SERVICOS.map(s => (
                  <label key={s} className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg hover:bg-green-50 cursor-pointer transition-colors group">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#1A6B4A] focus:ring-[#1A6B4A]" 
                      checked={f.servicosContratados.includes(s)} 
                      onChange={() => setF(p => ({
                        ...p, servicosContratados: p.servicosContratados.includes(s) 
                        ? p.servicosContratados.filter(x => x !== s) 
                        : [...p.servicosContratados, s]
                      }))}
                    />
                    <span className="text-[11px] text-gray-600 group-hover:text-gray-900">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs mt-6 font-bold bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}

          <button type="submit" disabled={saving} className="w-full mt-10 py-5 bg-[#1A6B4A] text-white font-black rounded-2xl hover:bg-[#145339] disabled:opacity-50 transition-all shadow-xl shadow-green-100 uppercase tracking-widest text-[11px]">
            {saving ? 'Validando informações...' : 'Finalizar e Enviar para ALMAH'}
          </button>
        </form>
      </div>
    </div>
  );
}