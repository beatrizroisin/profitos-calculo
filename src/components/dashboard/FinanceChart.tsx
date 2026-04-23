'use client';
// FinanceChart v3.7 — shows breakdown: folha + despesas vs. receita
// A pagar = folha (payroll) + despesas lançadas (stacked)
// A receber = monthly revenue from active clients
import { useEffect, useRef, useState } from 'react';
import { BRL } from '@/lib/utils';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

interface Props {
  totalPagar:       number;   // folha + despesas combined
  totalReceber:     number;   // monthly net from active clients
  folhaTotal:       number;   // payroll component
  despesasLancadas: number;   // manual transactions component
  pipelineNet:      number;
  pipelineCount:    number;
}

export function FinanceChart({ totalPagar, totalReceber, folhaTotal, despesasLancadas, pipelineNet, pipelineCount }: Props) {
  const barRef  = useRef<HTMLCanvasElement>(null);
  const barCI   = useRef<Chart | null>(null);
  const [showPL, setShowPL] = useState(false);

  const receber = totalReceber + (showPL ? pipelineNet : 0);
  const saldo   = receber - totalPagar;

  useEffect(() => {
    const canvas = barRef.current;
    if (!canvas) return;
    barCI.current?.destroy();
    barCI.current = null;

    const receberLabel = 'A receber' + (showPL && pipelineNet > 0 ? ' + pipeline' : '');
    const receberColor = receber >= totalPagar ? 'rgba(26,107,74,0.78)' : 'rgba(230,126,34,0.78)';

    // Stacked bar: Folha + Despesas stacked, vs A receber solid
    barCI.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['A pagar (total)', receberLabel],
        datasets: [
          {
            label: 'Folha',
            data: [folhaTotal, 0],
            backgroundColor: 'rgba(220,53,69,0.80)',
            borderRadius: 0,
            borderSkipped: false,
            stack: 'pagar',
          },
          {
            label: 'Despesas',
            data: [despesasLancadas, 0],
            backgroundColor: 'rgba(220,53,69,0.45)',
            borderRadius: 6,
            borderSkipped: false,
            stack: 'pagar',
          },
          {
            label: receberLabel,
            data: [0, receber],
            backgroundColor: receberColor,
            borderRadius: 6,
            borderSkipped: false,
            stack: 'receber',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { font: { size: 10 }, boxWidth: 10, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              label: c => `${c.dataset.label}: ${BRL(c.raw as number)}`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: '#9CA3AF', font: { size: 11 } },
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              color: '#9CA3AF',
              font: { size: 10 },
              callback: v => {
                const n = v as number;
                if (n >= 1000) return 'R$' + (n / 1000).toFixed(0) + 'k';
                return BRL(n);
              },
            },
          },
        },
      },
    });

    return () => { barCI.current?.destroy(); barCI.current = null; };
  }, [totalPagar, folhaTotal, despesasLancadas, receber, showPL]);

  return (
    <div className="space-y-3">
      {/* Mini KPIs — 4 cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-red-50 rounded-xl p-3">
          <p className="text-[9px] text-red-600 uppercase tracking-wider font-medium">Folha de pagamento</p>
          <p className="text-sm font-semibold text-red-700 tabular-nums mt-0.5">{BRL(folhaTotal)}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3">
          <p className="text-[9px] text-orange-600 uppercase tracking-wider font-medium">Despesas lançadas</p>
          <p className="text-sm font-semibold text-orange-700 tabular-nums mt-0.5">{BRL(despesasLancadas)}</p>
        </div>
        <div className={`rounded-xl p-3 ${receber >= totalPagar ? 'bg-green-50' : 'bg-amber-50'}`}>
          <p className={`text-[9px] uppercase tracking-wider font-medium ${receber >= totalPagar ? 'text-green-600' : 'text-amber-600'}`}>
            A receber{showPL && pipelineNet > 0 ? ' + pipeline' : ''}
          </p>
          <p className={`text-sm font-semibold tabular-nums mt-0.5 ${receber >= totalPagar ? 'text-green-700' : 'text-amber-700'}`}>
            {BRL(receber)}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${saldo >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-[9px] uppercase tracking-wider font-medium ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Saldo do mês
          </p>
          <p className={`text-sm font-semibold tabular-nums mt-0.5 ${saldo >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {saldo >= 0 ? '+' : ''}{BRL(saldo)}
          </p>
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="relative w-full" style={{ height: 150 }}>
        <canvas ref={barRef}/>
      </div>

      {/* Pipeline toggle */}
      {pipelineCount > 0 && (
        <button
          onClick={() => setShowPL(p => !p)}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-colors ${
            showPL
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}>
          <div className={`w-2 h-2 rounded-full ${showPL ? 'bg-white' : 'bg-blue-400'}`}/>
          {showPL
            ? `Ocultar pipeline (${BRL(pipelineNet)})`
            : `+ Projeção com pipeline — ${pipelineCount} entrada${pipelineCount !== 1 ? 's' : ''} (${BRL(pipelineNet)})`
          }
        </button>
      )}
    </div>
  );
}
