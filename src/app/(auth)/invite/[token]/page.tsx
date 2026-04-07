'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function InvitePage() {
  const router = useRouter();
  const { token } = useParams() as { token: string };
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/users/invite/${token}`)
      .then(r => r.json())
      .then(d => { setInvite(d); setLoading(false); })
      .catch(() => { setInvite(null); setLoading(false); });
  }, [token]);

  async function acceptWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('As senhas não coincidem.'); return; }
    if (form.password.length < 8) { setError('A senha deve ter ao menos 8 caracteres.'); return; }
    setSaving(true);
    const res = await fetch(`/api/users/invite/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: form.password, method: 'password' }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Erro ao aceitar convite.'); return; }
    await signIn('credentials', { email: invite.email, password: form.password, callbackUrl: '/dashboard' });
  }

  async function acceptWithGoogle() {
    setGLoading(true);
    await fetch(`/api/users/invite/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'google' }),
    });
    await signIn('google', { callbackUrl: '/dashboard' });
  }

  const ROLE_LABELS: Record<string, string> = {
    OWNER:'Proprietário', ADMIN:'Administrador', MANAGER:'Gerente', MEMBER:'Membro', VIEWER:'Visualizador',
  };

  const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] bg-white text-gray-800 placeholder-gray-400";

  if (loading) return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-500">Verificando convite...</div>;

  if (!invite || invite.error) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC3545" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </div>
      <p className="text-sm font-medium text-gray-800 mb-1">Convite inválido ou expirado</p>
      <p className="text-xs text-gray-500 mb-4">Este link pode ter sido usado ou expirado.</p>
      <Link href="/login" className="text-sm text-[#1A6B4A] font-medium hover:underline">Ir para o login →</Link>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl">
        <p className="text-xs font-medium text-green-800 mb-0.5">Você foi convidado para</p>
        <p className="text-base font-semibold text-green-900">{invite.companyName}</p>
        <p className="text-xs text-green-700 mt-0.5">
          Função: <strong>{ROLE_LABELS[invite.role] || invite.role}</strong> · {invite.email}
        </p>
      </div>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">Aceitar convite</h1>
      <p className="text-sm text-gray-500 mb-5">Escolha como deseja acessar o profitOS</p>

      <button onClick={acceptWithGoogle} disabled={gLoading}
        className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {gLoading ? 'Redirecionando...' : 'Entrar com Google'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-100" /><span className="text-xs text-gray-400">ou crie uma senha</span><div className="flex-1 h-px bg-gray-100" />
      </div>

      <form onSubmit={acceptWithPassword} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Senha</label>
          <input type="password" required className={inp} placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Confirmar senha</label>
          <input type="password" required className={inp} placeholder="Repita a senha" value={form.confirmPassword} onChange={e => setForm(f => ({...f, confirmPassword: e.target.value}))} />
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{error}</div>}
        <button type="submit" disabled={saving}
          className="w-full py-2.5 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-[#0F4A33] disabled:opacity-60 transition-colors">
          {saving ? 'Ativando conta...' : 'Ativar conta e entrar'}
        </button>
      </form>
    </div>
  );
}
