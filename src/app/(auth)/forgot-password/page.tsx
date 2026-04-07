'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res  = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) setSent(true);
    else { const d = await res.json(); setError(d.error || 'Erro ao enviar e-mail.'); }
  }

  if (sent) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
      <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" fill="none" stroke="#1A6B4A" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">E-mail enviado!</h2>
      <p className="text-sm text-gray-500 mb-5">Verifique sua caixa de entrada. O link expira em 1 hora.</p>
      <Link href="/login" className="text-sm text-[#1A6B4A] font-medium hover:underline">← Voltar para o login</Link>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Recuperar senha</h1>
      <p className="text-sm text-gray-500 mb-6">Digite seu e-mail e enviaremos um link para redefinir.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">E-mail</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] bg-white text-gray-800 placeholder-gray-400" />
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{error}</div>}
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-[#0F4A33] disabled:opacity-60 transition-colors">
          {loading ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>
      </form>
      <div className="mt-5 text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800">← Voltar para o login</Link>
      </div>
    </div>
  );
}
