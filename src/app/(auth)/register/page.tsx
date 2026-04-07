'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: '', name: '', email: '', password: '', confirmPassword: '',
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const F = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (form.password.length < 8) {
      setError('A senha deve ter ao menos 8 caracteres.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: form.companyName,
        name: form.name,
        email: form.email,
        password: form.password,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Erro ao criar conta. Tente novamente.');
    } else {
      router.push('/login?registered=1');
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Criar sua empresa</h1>
      <p className="text-sm text-gray-500 mb-6">Gratuito por 14 dias. Sem cartão de crédito.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nome da empresa</label>
          <input type="text" required placeholder="Minha Agência LTDA" value={form.companyName} onChange={e => F('companyName', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors"/>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Seu nome</label>
          <input type="text" required placeholder="João da Silva" value={form.name} onChange={e => F('name', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors"/>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">E-mail</label>
          <input type="email" required placeholder="joao@empresa.com" value={form.email} onChange={e => F('email', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Senha</label>
            <input type="password" required placeholder="••••••••" value={form.password} onChange={e => F('password', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Confirmar senha</label>
            <input type="password" required placeholder="••••••••" value={form.confirmPassword} onChange={e => F('confirmPassword', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors"/>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="flex-shrink-0 mt-0.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-[#0F4A33] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
          {loading ? 'Criando conta...' : 'Criar conta grátis'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Ao criar conta você concorda com os <a href="/termos" className="text-[#1A6B4A] hover:underline">Termos de Uso</a> e a <a href="/privacidade" className="text-[#1A6B4A] hover:underline">Política de Privacidade</a>.
        </p>
      </form>

      <div className="mt-5 pt-5 border-t border-gray-100 text-center">
        <span className="text-sm text-gray-500">Já tem conta? </span>
        <Link href="/login" className="text-sm text-[#1A6B4A] font-medium hover:underline">Entrar</Link>
      </div>
    </div>
  );
}
