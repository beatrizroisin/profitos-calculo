'use client';
import { signOut } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ROLE_LABELS } from '@/lib/auth';

const PERIOD_PAGES = ['/dashboard', '/metas', '/churn', '/ceo', '/simulador'];
const PERIODS = [{ key:'30d',label:'30 dias'},{ key:'60d',label:'60 dias'},{ key:'90d',label:'90 dias'},{ key:'6m',label:'6 meses'},{ key:'1y',label:'1 ano'},{ key:'2y',label:'2 anos'}];

interface TopbarProps { userName:string; companyName:string; userRole:string; avatarUrl?:string; }

export function Topbar({ userName, companyName, userRole, avatarUrl }: TopbarProps) {
  const pathname     = usePathname();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const period       = searchParams.get('period') || '90d';
  const showPeriod   = PERIOD_PAGES.some(p => pathname.startsWith(p));

  function setPeriod(key: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set('period', key);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center gap-3 flex-shrink-0">
      <div className="flex-1" />
      {showPeriod && (
        <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-100">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap
                ${period === p.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {(userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'MANAGER') && (
        <>
          <Link href="/clientes" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1A6B4A] border border-[#1A6B4A] rounded-lg hover:bg-[#E8F5EF] transition-colors">
            + Novo cliente
          </Link>
          <Link href="/precificacao" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1A6B4A] rounded-lg hover:bg-[#0F4A33] transition-colors">
            + Precificação
          </Link>
        </>
      )}

      {/* User dropdown */}
      <div className="relative group">
        <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
            : <div className="w-7 h-7 rounded-lg bg-[#1A6B4A] flex items-center justify-center text-[11px] font-semibold text-white">{userName?.slice(0,2).toUpperCase()}</div>
          }
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className="text-gray-400">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        </button>
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-medium text-gray-800">{userName}</p>
            <p className="text-xs text-gray-400">{companyName}</p>
            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E8F5EF] text-[#1A6B4A]">
              {ROLE_LABELS[userRole] || userRole}
            </span>
          </div>
          <div className="p-1">
            {(userRole === 'OWNER' || userRole === 'ADMIN') && (
              <Link href="/usuarios" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                Gerenciar usuários
              </Link>
            )}
            <Link href="/configuracoes" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Configurações
            </Link>
            <button onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
