'use client';
import { useState, useEffect } from 'react';
import { Alert, Card } from '@/components/ui';
import { BRL } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Client { 
  netRevenue: number; 
  grossRevenue: number; 
  status: string; 
  riskLevel: string; 
  name: string; 
}

interface Stats { 
  monthlyExpense: number; 
  totalRevenue: number; 
  clientCount: number; 
  hasExpenseData: boolean; 
  folhaTotal: number; 
  totalCustoMensal: number; 
}

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
}

export default function CeoPage({ searchParams }: { searchParams: { period?: string } }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const period = searchParams?.period || '90d';
  const months = ({ '90d': 3, '6m': 6, '1y': 12, '2y': 24 } as Record<string, number>)[period] || 3;
  const periodLabel = ({ '90d': '90 dias', '6m': '6 meses', '1y': '1 ano', '2y': '2 anos' } as Record<string, string>)[period] || '90 dias';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/company-stats').then(r => r.json()),
      fetch('/api/transactions').then(r => r.json()), // Puxa o financeiro real
    ]).then(([cData, sData, tData]) => {
      if (Array.isArray(cData)) setClients(cData);
      if (sData && !sData.error) setStats(sData);
      // Ajuste conforme a estrutura do seu retorno de transações
      if (tData.transactions) setTransactions(tData.transactions);
      setLoading(false);
    });
  }, []);

  // ── Cálculos Financeiros Integrados ──────────────────────────────────────────
  
  // 1. Receita vinda das transações de ENTRADA (Mensalidades pagas + Extras)
  const receitaReal = transactions
    .filter(t => t.type === 'INCOME' && t.status === 'PAID')
    .reduce((s, t) => s + t.amount, 0);

  // 2. Custos vindos das transações de SAÍDA (Contas a pagar)
  const custosFinanceiros = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((s, t) => s + t.amount, 0);

  // 3. Fallback: Se não houver transações lançadas, usa a folha/stats
  const totalSaidas = custosFinanceiros > 0 ? custosFinanceiros : (stats?.totalCustoMensal || stats?.folhaTotal || 0);
  
  // 4. Ativos e Ticket (baseado no contrato para projeção)
  const ativos = clients.filter(c => c.status === 'ACTIVE');
  const totalLiqContratos = ativos.reduce((s, c) => s + c.netRevenue, 0);
  
  // Usamos o maior valor entre a receita real (paga) e a contratada para o resultado mensal
  const resultado = (receitaReal > 0 ? receitaReal : totalLiqContratos) - totalSaidas;
  
  const deficit = Math.abs(resultado);
  const folhaEstimada = stats?.folhaTotal || (totalSaidas * 0.65); // Estimativa se não houver stats
  const fPct = totalSaidas > 0 ? ((folhaEstimada / totalSaidas) * 100).toFixed(1) : '0';
  
  const ticket = ativos.length > 0 ? totalLiqContratos / ativos.length : 0;
  const topCli = [...ativos].sort((a, b) => b.netRevenue - a.netRevenue)[0];
  const topPct = topCli && totalLiqContratos > 0 ? (topCli.netRevenue / totalLiqContratos * 100).toFixed(1) : '0';
  const riscos = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');

  // ── Perguntas e Respostas Dinâmicas ──────────────────────────────────────────
  const qs = [
    {
      q: 'Posso contratar agora?', 
      badge: resultado < 0 ? 'no' : 'maybe' as const, 
      bl: resultado < 0 ? 'Não recomendado' : 'Condicionado',
      ans: resultado < 0
        ? `Com déficit real de ${BRL(deficit)}/mês (considerando saídas de ${BRL(totalSaidas)}), contratar agora aumentaria a exposição. Em ${periodLabel}, o acumulado negativo seria ${BRL(deficit * months)}.\n\nMeta: Garantir ${Math.ceil(deficit / (ticket || 1))} novos contratos para zerar o caixa.`
        : `Resultado positivo de ${BRL(resultado)}/mês. A folha representa ${fPct}% das saídas totais. O limite saudável para agências é 50%.\n\nCusto projetado de um novo PJ (R$ 6k) no período: ${BRL(6000 * 1.15 * months)}.`
    },
    {
      q: 'Vou ficar sem dinheiro?', 
      badge: resultado < 0 ? 'no' : 'maybe' as const, 
      bl: resultado < 0 ? 'Risco real' : 'Monitorar',
      ans: resultado < 0
        ? `Sim, se o cenário persistir. O déficit de ${BRL(deficit)}/mês consome ${BRL(deficit * months)} em ${periodLabel}.\n\n• ${riscos.length} clientes em risco alto/crítico.\n• Custos fixos atuais: ${BRL(totalSaidas)}.\n\nAção: Reduzir custos variáveis ou converter ${Math.ceil(deficit / (ticket || 1))} novos clientes imediatamente.`
        : `Cenário estável com sobra de ${BRL(resultado)}/mês. Recomendado manter reserva de segurança de ${BRL(totalSaidas * 3)} (3 meses de operação).`
    },
    {
      q: 'Onde estou errando?', 
      badge: 'maybe' as const, 
      bl: 'Análise de Saúde',
      ans: `1. Concentração: ${topCli ? `${topCli.name} detém ${topPct}% da sua receita.` : 'N/A'}\n\n2. Eficiência: Seu ticket médio é ${BRL(ticket)}. Para uma margem de 20%, seu custo por cliente não deveria passar de ${BRL(ticket * 0.8)}.\n\n3. Despesas: Você tem ${BRL(custosFinanceiros)} em saídas registradas este mês no Contas a Pagar.`
    },
  ];

  const bs: { [k: string]: string } = { 
    yes: 'background:#E8F5EF;color:#064E3B', 
    no: 'background:#FEE8EA;color:#7F1D1D', 
    maybe: 'background:#FEF0E6;color:#78350F' 
  };
  const bi: { [k: string]: string } = { yes: '✓', no: '✗', maybe: '?' };

  if (loading) return <div className="p-8 text-center text-gray-500">Analisando dados financeiros...</div>;

  return (
    <div className="space-y-4">
      {/* Alertas de Integridade de Dados */}
      {transactions.length === 0 && (
        <Alert variant="warn">
          Nenhum dado encontrado no <strong>Contas a Pagar/Receber</strong>. Os cálculos abaixo são baseados apenas em contratos teóricos.
        </Alert>
      )}
      
      {!stats?.hasExpenseData && (
        <Alert variant="info">
          Dica: Lance suas despesas fixas em <a href="/colaboradores" className="underline font-medium">Equipe</a> para uma análise de folha mais precisa.
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {qs.map((p, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <p className="text-base font-semibold text-gray-900 mb-3">{p.q}</p>
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mb-3" 
              style={bs[p.badge] ? { 
                backgroundColor: bs[p.badge].split(';')[0].split(':')[1], 
                color: bs[p.badge].split(';')[1].split(':')[1] 
              } : {}}
            >
              {bi[p.badge]} {p.bl}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{p.ans}</p>
          </div>
        ))}
      </div>
    </div>
  );
}