'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router  = useRouter();
  const user    = session?.user as any;
  const [mode,  setMode]    = useState<'choose'|'create'|'join'>('choose');
  const [form,  setForm]    = useState({ companyName: '', inviteToken: '' });
  const [error, setError]   = useState('');
  const [loading,setLoading]= useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (user?.companyId) { router.push('/dashboard'); } // already has company
  }, [session, status]);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    setLoading(true); setError('');
    const res  = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: form.companyName,
        name:   user?.name  || 'Usuário',
        email:  user?.email || '',
        googleOnboarding: true, // signal: no password needed
      }),
    });
    setLoading(false);
    if (res.ok) { await update(); router.push('/dashboard'); }
    else { const d = await res.json(); setError(d.error || 'Erro ao criar empresa.'); }
  }

  async function joinByInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!form.inviteToken.trim()) return;
    setLoading(true); setError('');

    // Extract token from URL if user pasted the full link
    const tokenMatch = form.inviteToken.match(/invite\/([a-z0-9-]+)/i);
    const token = tokenMatch ? tokenMatch[1] : form.inviteToken.trim();

    const res = await fetch(`/api/users/invite/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'google' }),
    });
    setLoading(false);
    if (res.ok) { await update(); router.push('/dashboard'); }
    else { const d = await res.json(); setError(d.error || 'Token de convite inválido.'); }
  }

  if (status === 'loading') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-gray-400">Carregando...</div>
    </div>
  );

  const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] bg-white text-gray-800 placeholder-gray-400";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#1A6B4A] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div className="text-xl font-semibold text-gray-900">profitOS</div>
            <div className="text-xs text-gray-400">Configuração inicial</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
              {user.image && <img src={user.image} alt="" className="w-10 h-10 rounded-full" />}
              <div>
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>
          )}

          {mode === 'choose' && (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Bem-vindo ao profitOS!</h1>
              <p className="text-sm text-gray-500 mb-6">Como você vai usar o sistema?</p>
              <div className="space-y-3">
                <button onClick={() => setMode('create')}
                  className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#1A6B4A] hover:bg-green-50 transition-all text-left">
                  <div className="w-10 h-10 bg-[#E8F5EF] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" fill="none" stroke="#1A6B4A" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Criar minha empresa</p>
                    <p className="text-xs text-gray-400">Sou o responsável e quero começar uma nova conta</p>
                  </div>
                </button>

                <button onClick={() => setMode('join')}
                  className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" fill="none" stroke="#2563EB" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Entrar em uma empresa existente</p>
                    <p className="text-xs text-gray-400">Recebi um convite e quero aceitar</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {mode === 'create' && (
            <>
              <button onClick={() => setMode('choose')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-4">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                Voltar
              </button>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Criar empresa</h2>
              <p className="text-sm text-gray-500 mb-5">Você será o Proprietário com acesso total.</p>
              <form onSubmit={createCompany} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nome da empresa</label>
                  <input type="text" required className={inp} placeholder="Minha Agência LTDA" value={form.companyName} onChange={e => setForm(f => ({...f, companyName: e.target.value}))} />
                </div>
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-[#0F4A33] disabled:opacity-60 transition-colors">
                  {loading ? 'Criando...' : 'Criar empresa e entrar'}
                </button>
              </form>
            </>
          )}

          {mode === 'join' && (
            <>
              <button onClick={() => setMode('choose')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-4">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                Voltar
              </button>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Entrar com convite</h2>
              <p className="text-sm text-gray-500 mb-5">Cole o link ou token de convite que você recebeu.</p>
              <form onSubmit={joinByInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Link ou token do convite</label>
                  <input type="text" required className={inp} placeholder="https://... ou cole o token" value={form.inviteToken} onChange={e => setForm(f => ({...f, inviteToken: e.target.value}))} />
                </div>
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors">
                  {loading ? 'Verificando...' : 'Aceitar convite e entrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
