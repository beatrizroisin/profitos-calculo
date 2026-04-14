'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Força a página a ser renderizada no lado do cliente/tempo real, 
// evitando o erro de Prerender do useSearchParams no build da Vercel.
export const dynamic = 'force-dynamic';

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(params.get('error') === 'CredentialsSignin' ? 'E-mail ou senha incorretos.' : '');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(''); 
    setLoading(true);
    
    const res = await signIn('credentials', { 
      email, 
      password, 
      redirect: false 
    });
    
    setLoading(false);
    
    if (res?.error) {
      setError('E-mail ou senha incorretos. Verifique suas credenciais.');
    } else { 
      router.push('/dashboard'); 
      router.refresh(); 
    }
  }

  async function handleGoogle() {
    setGLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('Erro ao conectar com o Google. Tente novamente.');
      setGLoading(false);
    }
  }

  const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] bg-white text-gray-800 placeholder-gray-400 transition-colors";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Entrar na sua conta</h1>
      <p className="text-sm text-gray-500 mb-6">Acesse o painel financeiro da sua empresa</p>

      {/* Google */}
      <button 
        onClick={handleGoogle} 
        disabled={gLoading}
        className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 mb-4"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {gLoading ? 'Redirecionando...' : 'Continuar com Google'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">ou</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <form onSubmit={handleCredentials} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">E-mail</label>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com" 
            className={inp} 
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Senha</label>
            <Link href="/forgot-password" name="forgot-password" className="text-xs text-[#1A6B4A] hover:underline">Esqueceu a senha?</Link>
          </div>
          <input 
            type="password" 
            required 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" 
            className={inp} 
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2.5 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-[#0F4A33] disabled:opacity-60 transition-colors"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100 flex justify-between items-center">
        <span className="text-sm text-gray-500">Não tem conta ainda?</span>
        <Link href="/register" className="text-sm text-[#1A6B4A] font-medium hover:underline">Criar empresa →</Link>
      </div>

      {/* <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-1">Credenciais de demonstração:</p>
        <p className="text-xs text-gray-600">admin@demo.com / Demo@2026 — Proprietário</p>
        <p className="text-xs text-gray-600">gerente@demo.com / Demo@2026 — Gerente</p>
        <p className="text-xs text-gray-600">viewer@demo.com / Demo@2026 — Visualizador</p>
      </div> */}
    </div>
  );
}

// O componente principal envolve o conteúdo em Suspense, 
// que é a boa prática exigida pelo Next.js ao usar useSearchParams.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Carregando formulário...</div>}>
      <LoginContent />
    </Suspense>
  );
}