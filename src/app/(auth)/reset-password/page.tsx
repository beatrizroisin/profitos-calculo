'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetForm() {
  const params  = useSearchParams();
  const router  = useRouter();
  const token   = params.get('token') || '';
  const [pw,  setPw]  = useState('');
  const [pw2, setPw2] = useState('');
  const [ok,  setOk]  = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!token) setErr('Token inválido ou expirado.'); }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) { setErr('As senhas não coincidem.'); return; }
    if (pw.length < 8) { setErr('A senha deve ter ao menos 8 caracteres.'); return; }
    setLoading(true); setErr('');
    const res  = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: pw }),
    });
    setLoading(false);
    if (res.ok) { setOk(true); setTimeout(() => router.push('/login'), 2500); }
    else { const d = await res.json(); setErr(d.error || 'Erro ao redefinir senha.'); }
  }

  const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] bg-white text-gray-800 placeholder-gray-400";

  if (ok) return (
    <div className="text-center">
      <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" fill="none" stroke="#1A6B4A" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
      </div>
      <p className="text-base font-semibold text-gray-900 mb-2">Senha redefinida!</p>
      <p className="text-sm text-gray-500">Redirecionando para o login...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nova senha</label>
        <input type="password" required className={inp} placeholder="Mínimo 8 caracteres" value={pw} onChange={e => setPw(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Confirmar nova senha</label>
        <input type="password" required className={inp} placeholder="Repita a senha" value={pw2} onChange={e => setPw2(e.target.value)} />
      </div>
      {err && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{err}</div>}
      <button type="submit" disabled={loading || !token}
        className="w-full py-2.5 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-[#0F4A33] disabled:opacity-60 transition-colors">
        {loading ? 'Salvando...' : 'Redefinir senha'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Redefinir senha</h1>
      <p className="text-sm text-gray-500 mb-6">Digite sua nova senha abaixo.</p>
      <Suspense fallback={<div className="text-center text-sm text-gray-400">Carregando...</div>}>
        <ResetForm />
      </Suspense>
      <div className="mt-5 text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800">← Voltar para o login</Link>
      </div>
    </div>
  );
}
