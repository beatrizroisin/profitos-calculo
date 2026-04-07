'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem { href:string; label:string; icon:string; minRole?:string; }
const HIERARCHY = ['VIEWER','MEMBER','MANAGER','ADMIN','OWNER'];
function access(role:string, min?:string){ return !min || HIERARCHY.indexOf(role) >= HIERARCHY.indexOf(min); }

const NAV: {section:string; items:NavItem[]}[] = [
  {section:'Visão geral', items:[
    {href:'/dashboard', label:'Dashboard', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
  ]},
  {section:'Clientes', items:[
    {href:'/clientes',     label:'Clientes',     icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', minRole:'MEMBER'},
    {href:'/precificacao', label:'Precificação', icon:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', minRole:'MANAGER'},
  ]},
  {section:'Financeiro', items:[
    {href:'/pagar',   label:'Contas a pagar',   icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', minRole:'MEMBER'},
    {href:'/receber', label:'Contas a receber',  icon:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z', minRole:'MEMBER'},
  ]},
  {section:'Inteligência', items:[
    {href:'/metas',     label:'Meta de clientes', icon:'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', minRole:'MEMBER'},
    {href:'/churn',     label:'Análise de churn', icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', minRole:'MEMBER'},
    {href:'/ceo',       label:'Perguntas do CEO', icon:'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', minRole:'MEMBER'},
  ]},
  {section:'Simulações', items:[
    {href:'/simulador', label:'Simulador estratégico', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', minRole:'MEMBER'},
    {href:'/time',     label:'Time / Alocações',   icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', minRole:'MANAGER'},
    {href:'/runrunit', label:'RunRun.it',            icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', minRole:'ADMIN'}
  ]},
  {section:'Dados', items:[
    {href:'/importar',     label:'Importar planilhas', icon:'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', minRole:'MANAGER'},
    {href:'/usuarios',     label:'Usuários',            icon:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', minRole:'ADMIN'},
    {href:'/configuracoes',label:'Configurações',      icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', minRole:'ADMIN'},
  ]},
];

interface SidebarProps { userRole:string; companyName:string; userName:string; avatarUrl?:string; }

export function Sidebar({ userRole, companyName, userName, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="w-56 min-w-[224px] bg-white border-r border-gray-100 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1A6B4A] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div><div className="text-sm font-semibold text-gray-900">profitOS</div><div className="text-[10px] text-gray-400">CFO Digital</div></div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(sec=>(
          <div key={sec.section}>
            <p className="px-5 pt-4 pb-1 text-[10px] font-semibold text-gray-400 tracking-widest uppercase">{sec.section}</p>
            {sec.items.filter(i=>access(userRole,i.minRole)).map(item=>{
              const active=pathname===item.href||pathname.startsWith(item.href+'/');
              return (
                <Link key={item.href} href={item.href} className={cn('flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-[12.5px] transition-all duration-100',active?'bg-[#E8F5EF] text-[#1A6B4A] font-medium':'text-gray-500 hover:bg-gray-50 hover:text-gray-800')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke={active?'#1A6B4A':'#9CA3AF'} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d={item.icon}/></svg>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded-lg">
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0"/>
            : <div className="w-7 h-7 rounded-lg bg-[#1A6B4A] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">{userName?.slice(0,2).toUpperCase()}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{userName}</p>
            <p className="text-[10px] text-gray-400 truncate">{companyName}</p>
          </div>
          <span className="text-[9px] bg-[#E8F5EF] text-[#1A6B4A] px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
            {(({OWNER:'OWN',ADMIN:'ADM',MANAGER:'MGR',MEMBER:'MBR',VIEWER:'VWR'} as Record<string, string>)[userRole])||userRole}
          </span>
        </div>
      </div>
    </aside>
  );
}