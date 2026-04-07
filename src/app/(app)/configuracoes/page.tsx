'use client';
import { useSession, signOut } from 'next-auth/react';
import { Card, Grid2, Alert, Button } from '@/components/ui';

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-lg font-semibold text-gray-900">Configurações</h1>
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
      <Card title="Parâmetros padrão do sistema">
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[['Alíquota padrão (Simples Nacional)', '6%'],['Margem padrão de lucro', '50%'],['Horas mensais base', '160h'],['Imposto sobre venda padrão', '15%'],['Fuso horário', 'America/Sao_Paulo'],['Moeda', 'BRL (Real)']].map(([l,v])=>(
            <div key={l} className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] text-gray-400 mb-1">{l}</p>
              <p className="font-semibold text-gray-800">{v}</p>
            </div>
          ))}
        </div>
      </Card>
      <Alert variant="info">Para alterar parâmetros da empresa como imposto padrão e margem, entre em contato com o suporte ou ajuste diretamente nos cadastros de clientes.</Alert>
    </div>
  );
}
