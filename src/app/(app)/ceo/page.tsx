'use client';
import { useState, useEffect } from 'react';
import { Alert } from '@/components/ui';
import { BRL } from '@/lib/utils';

interface Client { netRevenue: number; grossRevenue: number; status: string; riskLevel: string; name: string; }
interface Stats { monthlyExpense: number; totalRevenue: number; clientCount: number; ticketMedio: number; hasExpenseData: boolean; resultado: number; folhaTotal: number; totalCustoMensal: number; despesasLancadas: number; }

export default function CeoPage({ searchParams }: { searchParams: { period?: string } }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  
  const period = searchParams?.period || '90d';
  const months = ({ '90d': 3, '6m': 6, '1y': 12, '2y': 24 } as Record<string, number>)[period] || 3;
  const periodLabel = ({ '90d': '90 dias', '6m': '6 meses', '1y': '1 ano', '2y': '2 anos' } as Record<string, string>)[period] || '90 dias';

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/company-stats').then(r => r.json()),
    ]).then(([cData, sData]) => {
      if (Array.isArray(cData)) setClients(cData);
      if (sData && !sData.error) setStats(sData);
    });
  }, []);

  // Cálculos básicos
  const ativos = clients.filter(c => c.status === 'ACTIVE');
  const totalLiq = ativos.reduce((s, c) => s + c.netRevenue, 0);
  
  // CORREÇÃO: usa totalCustoMensal (folha + despesas lançadas) como custo real
  const expenses = stats
    ? (stats.totalCustoMensal > 0
        ? stats.totalCustoMensal
        : stats.monthlyExpense > 0
          ? stats.monthlyExpense
          : stats.folhaTotal > 0 ? stats.folhaTotal : 0)
    : 0;
  const despesasLancadas = stats?.despesasLancadas ?? 0;

  const resultado = totalLiq - expenses;
  const deficit = Math.abs(resultado);
  const folhaPJ = expenses * 0.675;
  const fPct = expenses > 0 ? (folhaPJ / expenses * 100).toFixed(1) : '0';
  const ticket = ativos.length > 0 ? totalLiq / ativos.length : 9835;
  const topCli = [...ativos].sort((a, b) => b.netRevenue - a.netRevenue)[0];
  const topPct = topCli && totalLiq > 0 ? (topCli.netRevenue / totalLiq * 100).toFixed(1) : '0';
  const riscos = clients.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL');

  const qs = [
    {
      q: 'Posso contratar agora?', 
      badge: resultado < 0 ? 'no' : 'maybe' as const, 
      bl: resultado < 0 ? 'Não recomendado' : 'Condicionado',
      ans: resultado < 0
        ? `Com déficit de ${BRL(deficit)}/mês e folha PJ em ${fPct}% das saídas, contratar agora aprofundaria o buraco. Em ${periodLabel}, o déficit acumulado seria ${BRL(deficit * months)}.\n\nCondição: trazer ao menos ${Math.ceil(6000 * 1.15 / ticket)} novos clientes antes de qualquer contratação.`
        : `Resultado positivo de ${BRL(resultado)}/mês. Folha PJ está em ${fPct}% das saídas (limite: 45–50%). Qualquer contratação deve vir com receita adicional garantida.\n\nCusto de um PJ de R$ 6.000 no período: ${BRL(6000 * 1.15 * months)}.`
    },
    {
      q: 'Posso fazer um investimento?', 
      badge: 'maybe' as const, 
      bl: 'Depende do payback',
      ans: `Com resultado de ${BRL(resultado)}/mês, o teto seguro de investimento em ${periodLabel} é ${BRL(Math.max(0, resultado) * months)}.\n\nRegra: o retorno mensal deve recuperar o investimento em menos de ${Math.max(1, Math.round(months / 3))} meses. Invista somente com receita recorrente garantida.`
    },
    {
      q: 'Vou ficar sem dinheiro?', 
      badge: resultado < 0 ? 'no' : 'maybe' as const, 
      bl: resultado < 0 ? 'Risco real' : 'Monitorar',
      ans: resultado < 0
        ? `Com ${BRL(deficit)}/mês de déficit, em ${periodLabel} o impacto acumulado é ${BRL(deficit * months)}.\n\n• ${riscos.length} clientes com risco alto/crítico\n• Folha PJ de ${BRL(folhaPJ)}/mês sem cobertura\n\nAção urgente: prospectar ao menos ${Math.ceil(deficit / ticket)} novos clientes.`
        : `Resultado de ${BRL(resultado)}/mês. Mantenha reserva mínima de 2 meses de custo fixo (${BRL(expenses * 2)}) como buffer de segurança.`
    },
    {
      q: 'Onde estou errando?', 
      badge: 'maybe' as const, 
      bl: '3 pontos críticos',
      ans: `1. Folha PJ em ${fPct}% das saídas — limite saudável é 45–50% do faturamento total.\n\n2. ${topCli ? `${topCli.name} representa ${topPct}% da receita (${BRL(topCli.netRevenue)}/mês) — concentração de risco.` : 'Analise a concentração de receita por cliente.'}\n\n3. Ticket médio (${BRL(ticket)}) vs custo por cliente (${BRL(expenses / Math.max(ativos.length, 1))}): para 20% de margem precisa de ${BRL(expenses / 0.8 / Math.max(ativos.length, 1))} por cliente.`
    },
  ];

  const bs: { [k: string]: string } = { 
    yes: 'background:#E8F5EF;color:#064E3B', 
    no: 'background:#FEE8EA;color:#7F1D1D', 
    maybe: 'background:#FEF0E6;color:#78350F' 
  };
  const bi: { [k: string]: string } = { yes: '✓', no: '✗', maybe: '?' };

  return (
    <div className="space-y-4">
      {stats && !stats.hasExpenseData && stats.folhaTotal === 0 && (
        <Alert variant="info">
          Cadastre a <a href="/colaboradores" className="underline font-medium">equipe e seus salários</a> para que as respostas usem seu custo fixo real.
        </Alert>
      )}
      <Alert variant="info">Respostas calculadas com {ativos.length} clientes ativos e projeção de {periodLabel}.</Alert>
      
      {qs.map((p, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6">
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
  );
}