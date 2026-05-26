'use client';
// configuracoes/page.tsx — v3.9
// Agora inclui gestão de Tipos de Serviço (clientes) e Cargos (colaboradores)
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Card, Grid2, Alert, Button } from '@/components/ui';

// Tipos de serviço e cargos são armazenados em localStorage por enquanto.
// Em versão futura, serão persistidos via API /api/company-settings.
const DEFAULT_SERVICES = [
  'Migração para VTEX IO com Redesign',
  'Arquitetura de E-commerce',
  'Implantação de E-commerce',
  'Pacote de Evolução Básico — Suporte + Manutenção',
  'Pacote de Evolução Intermediário — Growth (CRO+SEO)',
  'Pacote de Evolução Avançado — Performance + Inbound + Growth',
  'Plano de Evolução — Horas',
  'Plano de Evolução — Semidedicado',
  'Profissionais 100% Dedicados (Outsourcing)',
  'SEO',
  'Inbound Marketing',
  'Performance',
];
const DEFAULT_POSITIONS = [
  'CEO', 'COO', 'Gerente de Projetos',
  'Head SEO', 'Head Performance', 'Head Inbound',
  'Head Desenvolvimento', 'Head Design',
  'Analista SEO', 'Analista de Performance', 'Analista de Inbound',
  'Desenvolvedor Web', 'Designer UX/UI',
  'Atendimento / Customer Success', 'Financeiro / Administrativo',
];

function TagList({
  items, onRemove, onAdd, placeholder, label,
}: {
  items: string[];
  onRemove: (i: number) => void;
  onAdd: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const [input, setInput] = useState('');
  function add() {
    const v = input.trim();
    if (!v || items.includes(v)) return;
    onAdd(v);
    setInput('');
  }
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2 mb-3 min-h-[36px]">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 font-medium">
            {item}
            <button onClick={() => onRemove(i)} className="ml-1 text-gray-400 hover:text-red-500 transition-colors text-[11px] leading-none" title="Remover">×</button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-gray-400 italic">Nenhum cadastrado</span>}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button onClick={add}
          className="px-4 py-2 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors">
          Adicionar
        </button>
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [services,  setServices]  = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [saved,     setSaved]     = useState('');

  useEffect(() => {
    const s = localStorage.getItem('profitos_services');
    const p = localStorage.getItem('profitos_positions');
    setServices(s  ? JSON.parse(s)  : DEFAULT_SERVICES);
    setPositions(p ? JSON.parse(p) : DEFAULT_POSITIONS);
  }, []);

  function saveAll() {
    localStorage.setItem('profitos_services',  JSON.stringify(services));
    localStorage.setItem('profitos_positions', JSON.stringify(positions));
    setSaved('Configurações salvas!');
    setTimeout(() => setSaved(''), 3000);
  }

  function resetServices()  { setServices(DEFAULT_SERVICES); }
  function resetPositions() { setPositions(DEFAULT_POSITIONS); }

  const slug     = user?.companySlug || '';
  const origin   = typeof window !== 'undefined' ? window.location.origin : 'https://profitos-calculo.vercel.app';
  const linkColab  = slug ? `${origin}/formulario/colaborador?empresa=${slug}` : '';
  const linkClient = slug ? `${origin}/formulario/cliente?empresa=${slug}` : '';

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Configurações</h1>
        {saved && <span className="text-xs text-green-700 font-medium bg-green-50 px-3 py-1.5 rounded-lg">{saved}</span>}
      </div>

      <Grid2>
        <Card title="Minha conta">
          <div className="space-y-3 text-sm">
            <div><p className="text-xs text-gray-400">Nome</p><p className="font-medium text-gray-800">{user?.name}</p></div>
            <div><p className="text-xs text-gray-400">E-mail</p><p className="font-medium text-gray-800">{user?.email}</p></div>
            <div><p className="text-xs text-gray-400">Função</p><p className="font-medium text-gray-800">{user?.role}</p></div>
            <div className="pt-3 border-t border-gray-100">
              <Button variant="danger" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>Sair da conta</Button>
            </div>
          </div>
        </Card>
        <Card title="Empresa">
          <div className="space-y-3 text-sm">
            <div><p className="text-xs text-gray-400">Nome da empresa</p><p className="font-medium text-gray-800">{user?.companyName}</p></div>
            <div><p className="text-xs text-gray-400">Plano atual</p><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E8F5EF] text-[#1A6B4A]">PRO</span></div>
          </div>
        </Card>
      </Grid2>

      {/* Tipos de Serviço */}
      <Card title="Tipos de serviço — clientes" subtitle="Serviços que aparecem como opção no cadastro de clientes e no formulário externo">
        <TagList
          items={services}
          onRemove={i => setServices(s => s.filter((_,j) => j !== i))}
          onAdd={v => setServices(s => [...s, v])}
          placeholder="Ex: Consultoria em E-commerce"
          label="Serviços disponíveis"
        />
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <button onClick={saveAll} className="px-4 py-2 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors">
            Salvar alterações
          </button>
          <button onClick={resetServices} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Restaurar padrão
          </button>
        </div>
      </Card>

      {/* Cargos */}
      <Card title="Cargos e funções — colaboradores" subtitle="Cargos que aparecem como opção no cadastro de colaboradores">
        <TagList
          items={positions}
          onRemove={i => setPositions(s => s.filter((_,j) => j !== i))}
          onAdd={v => setPositions(s => [...s, v])}
          placeholder="Ex: Especialista em CRO"
          label="Cargos disponíveis"
        />
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <button onClick={saveAll} className="px-4 py-2 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors">
            Salvar alterações
          </button>
          <button onClick={resetPositions} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Restaurar padrão
          </button>
        </div>
      </Card>

      {/* Links dos formulários externos */}
      <Card title="Links dos formulários externos" subtitle="Compartilhe estes links com clientes e colaboradores">
        {!slug ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            Slug da empresa não disponível na sessão. Faça logout e login novamente para carregar o link correto.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Formulário colaborador */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-[#1A6B4A] uppercase tracking-wider">Formulário para colaboradores</span>
                <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Público</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-2">Colaboradores preenchem a própria ficha. Ficam como Inativos até você ativar em /colaboradores.</p>
              <div className="flex items-center gap-2">
                <input readOnly
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-mono"
                  value={linkColab}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(linkColab); }}
                  className="px-3 py-2 text-xs text-white bg-[#1A6B4A] border border-[#1A6B4A] rounded-lg hover:bg-green-800 transition-colors whitespace-nowrap font-medium">
                  Copiar
                </button>
                <a href={linkColab} target="_blank" rel="noreferrer"
                  className="px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap">
                  Abrir
                </a>
              </div>
            </div>
            {/* Formulário cliente */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-[#1A6B4A] uppercase tracking-wider">Formulário para clientes (minuta contratual)</span>
                <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Público</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-2">Clientes preenchem os dados do contrato. Ficam como Prospect até você ativar em /clientes.</p>
              <div className="flex items-center gap-2">
                <input readOnly
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-mono"
                  value={linkClient}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(linkClient); }}
                  className="px-3 py-2 text-xs text-white bg-[#1A6B4A] border border-[#1A6B4A] rounded-lg hover:bg-green-800 transition-colors whitespace-nowrap font-medium">
                  Copiar
                </button>
                <a href={linkClient} target="_blank" rel="noreferrer"
                  className="px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap">
                  Abrir
                </a>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Parâmetros padrão do sistema">
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            ['Alíquota padrão (Simples Nacional)', '6%'],
            ['Margem padrão de lucro', '50%'],
            ['Horas mensais base', '160h'],
            ['Fuso horário', 'America/Sao_Paulo'],
            ['Moeda', 'BRL (Real)'],
            ['Slug da empresa (URL formulários)', slug || 'Faça logout e login'],
          ].map(([l, v]) => (
            <div key={l} className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] text-gray-400 mb-1">{l}</p>
              <p className="font-semibold text-gray-800 text-xs">{v}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
