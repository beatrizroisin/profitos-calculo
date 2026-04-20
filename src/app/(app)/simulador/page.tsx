'use client';
import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui';
import { BRL } from '@/lib/utils';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

type SimId = 'contratar' | 'demitir' | 'cliente' | 'investir' | 'crescer' | 'pipeline';
const TABS: [SimId, string, string][] = [
  ['contratar','Contratar','👤'],
  ['demitir','Demitir','🚪'],
  ['cliente','Perder cliente','⚠️'],
  ['investir','Investimento','💰'],
  ['crescer','Crescimento','📈'],
  ['pipeline','Com pipeline','🔵'],
];
const INP = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#1A6B4A]';
const LBL = 'block text-[9.5px] font-medium text-gray-400 uppercase tracking-wider mb-1.5';

export default function SimuladorPage({ searchParams }: { searchParams: { period?: string } }) {
  const months = { '30d':1,'60d':2,'90d':3,'6m':6,'1y':12,'2y':24 }[searchParams?.period||'90d'] || 3;
  const [tab,     setTab]     = useState<SimId>('contratar');
  const [v1,      setV1]      = useState(6000);
  const [v2,      setV2]      = useState(1);
  const [tipo,    setTipo]    = useState(1.15);
  const [cliSel,  setCliSel]  = useState('');
  const [clients,     setClients]     = useState<any[]>([]);
  const [pipelineClients, setPipelineClients] = useState<any[]>([]);
  const [pipelineRev,     setPipelineRev]     = useState(0);
  const [base,    setBase]    = useState(0);
  const [totalRev,setTotalRev]= useState(0);
  const [folha,   setFolha]   = useState(0);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart|null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.ok ? r.json() : []),
      fetch('/api/company-stats').then(r => r.ok ? r.json() : {}),
    ]).then(([cData, sData]) => {
      if (Array.isArray(cData)) {
        setClients(cData.filter((c: any) => c.status === 'ACTIVE'));
        const pl = cData.filter((c: any) => c.status === 'PIPELINE');
        setPipelineClients(pl);
        setPipelineRev(pl.reduce((s: number, c: any) => s + c.netRevenue, 0));
      }
      if (sData?.totalRevenue !== undefined) {
        const expense = sData.monthlyExpense > 0 ? sData.monthlyExpense : sData.folhaTotal > 0 ? sData.folhaTotal : 0;
        setBase(sData.totalRevenue - expense);
        setTotalRev(sData.totalRevenue);
        setFolha(expense);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(drawChart);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, v1, v2, tipo, months, base, loading]);

  // ── Compute scenario values ────────────────────────────────────────────────
  function getScenario() {
    const b = base;
    if (tab === 'contratar') {
      const cost = v1 * tipo;
      const monthlyData = Array.from({length: months}, (_, i) => ({
        mes: `Mês ${i+1}`,
        atual: Math.round(b),
        simulado: Math.round(i >= v2 - 1 ? b - cost : b),
      }));
      return { monthlyData, delta: -cost, fixedChange: true };
    }
    if (tab === 'demitir') {
      const saving = v1 * tipo;
      const monthlyData = Array.from({length: months}, (_, i) => ({
        mes: `Mês ${i+1}`,
        atual: Math.round(b),
        simulado: Math.round(i >= v2 ? b + saving : b - v1 * v2 / Math.max(v2, 1)),
      }));
      return { monthlyData, delta: saving, fixedChange: false };
    }
    if (tab === 'cliente') {
      const monthlyData = Array.from({length: months}, (_, i) => ({
        mes: `Mês ${i+1}`,
        atual: Math.round(b),
        simulado: Math.round(i >= v2 - 1 ? b - v1 : b),
      }));
      return { monthlyData, delta: -v1, fixedChange: true };
    }
    if (tab === 'investir') {
      const monthlyData = Array.from({length: months}, (_, i) => ({
        mes: `Mês ${i+1}`,
        atual: Math.round(b),
        simulado: Math.round(b - v1 + (i + 1) * v2),
      }));
      return { monthlyData, delta: -v1 + months * v2, fixedChange: false };
    }
    // pipeline
    if (tab === 'pipeline') {
      const monthlyData = Array.from({length: months}, (_, i) => ({
        mes: `Mês ${i+1}`,
        atual: Math.round(b),
        simulado: Math.round(b + pipelineRev),
      }));
      return { monthlyData, delta: pipelineRev, fixedChange: true };
    }
    // crescer
    const add = v1 * v2;
    const monthlyData = Array.from({length: months}, (_, i) => ({
      mes: `Mês ${i+1}`,
      atual: Math.round(b),
      simulado: Math.round(b + add),
    }));
    return { monthlyData, delta: add, fixedChange: true };
  }

  function drawChart() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    chartRef.current?.destroy();
    chartRef.current = null;

    const { monthlyData } = getScenario();
    const labels   = monthlyData.map(d => d.mes);
    const dataAtual = monthlyData.map(d => d.atual);
    const dataSim   = monthlyData.map(d => d.simulado);

    // Color bars: green if positive, red if negative
    const barColorsSim = dataSim.map(v => v >= 0 ? 'rgba(26,107,74,0.75)' : 'rgba(220,53,69,0.75)');
    const barColorsAtual = dataAtual.map(v => v >= 0 ? 'rgba(37,99,235,0.55)' : 'rgba(220,53,69,0.45)');

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Atual',
            data: dataAtual,
            backgroundColor: barColorsAtual,
            borderRadius: 5,
            borderSkipped: false,
          },
          {
            label: 'Simulado',
            data: dataSim,
            backgroundColor: barColorsSim,
            borderRadius: 5,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12, usePointStyle: true } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${BRL(c.raw as number)}` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9CA3AF', font: { size: 10 } } },
          y: {
            grid: { color: 'rgba(0,0,0,.04)' },
            ticks: {
              color: '#9CA3AF', font: { size: 10 },
              callback: v => {
                const n = v as number;
                return n >= 0 ? BRL(n) : '-'+BRL(Math.abs(n));
              },
            },
          },
        },
      },
    });
  }

  function switchTab(id: SimId) {
    chartRef.current?.destroy(); chartRef.current = null;
    setTab(id);
    if (id === 'pipeline')  { setV1(0);     setV2(0);     }
    else if (id === 'crescer')   { setV1(3);     setV2(9835);  }
    else if (id === 'investir') { setV1(45000); setV2(15000); }
    else { setV1(6000); setV2(1); }
    setCliSel('');
  }

  function getRows(): [string, string, string][] {
    const b = base, tr = Math.max(totalRev, 1);
    if (tab === 'contratar') {
      const c = v1 * tipo;
      return [
        [`Custo/mês (×${tipo.toFixed(2)})`, BRL(c), 'text-red-600'],
        ['Novo resultado/mês', BRL(b - c), b - c > 0 ? 'text-green-700' : 'text-red-600'],
        ['Clientes para cobrir', Math.ceil(c / (tr / Math.max(clients.length, 1))) + ' clientes', 'text-amber-600'],
      ];
    }
    if (tab === 'demitir') {
      const e = v1 * tipo;
      return [
        ['Economia mensal', BRL(e), 'text-green-700'],
        ['Custo período de aviso', BRL(v1 * v2), 'text-red-600'],
        ['Resultado após desligamento', BRL(b + e), b + e > 0 ? 'text-green-700' : 'text-red-600'],
      ];
    }
    if (tab === 'cliente') {
      const p = (v1 / tr * 100).toFixed(1);
      return [
        ['% receita perdida', p + '%', +p > 30 ? 'text-red-600' : 'text-amber-600'],
        ['Impacto mensal', BRL(-v1), 'text-red-600'],
        ['Novo resultado/mês', BRL(b - v1), 'text-red-600'],
      ];
    }
    if (tab === 'investir') {
      const pb = v2 > 0 ? Math.ceil(v1 / v2) : 999;
      return [
        ['Investimento', BRL(-v1), 'text-red-600'],
        ['Retorno/mês', BRL(v2), 'text-green-700'],
        ['Payback', pb <= months ? pb + ' meses' : '>' + months + 'm', pb <= 3 ? 'text-green-700' : pb <= months ? 'text-amber-600' : 'text-red-600'],
      ];
    }
    if (tab === 'pipeline') {
      return [
        ['Receita pipeline', BRL(pipelineRev), 'text-blue-700'],
        [`${pipelineClients.length} oportunidade${pipelineClients.length !== 1 ? 's' : ''}`, pipelineClients.filter((c:any)=>c.isRecurring).length + ' rec. / ' + pipelineClients.filter((c:any)=>!c.isRecurring).length + ' pont.', 'text-blue-600'],
        ['Resultado projetado/mês', BRL(b + pipelineRev), b + pipelineRev > 0 ? 'text-green-700' : 'text-red-600'],
      ];
    }
    const add = v1 * v2;
    return [
      ['Receita adicional/mês', BRL(add), 'text-green-700'],
      ['Novo resultado/mês', BRL(b + add), b + add > 0 ? 'text-green-700' : 'text-red-600'],
      ['Margem projetada', ((b + add) / (tr + add) * 100).toFixed(1) + '%', b + add > 0 ? 'text-green-700' : 'text-amber-600'],
    ];
  }

  function getAlert(): { t: 'ok' | 'warn' | 'danger'; msg: string } | null {
    const b = base, tr = Math.max(totalRev, 1);
    if (tab === 'contratar') { const r = b - v1 * tipo; return r > 0 ? { t: 'ok', msg: 'Viável — resultado positivo após a contratação.' } : { t: 'danger', msg: 'Não recomendado — aprofunda o déficit atual.' }; }
    if (tab === 'demitir')   { const r = b + v1 * tipo; return r > 0 ? { t: 'ok', msg: 'Equilibra o caixa após o desligamento.' } : { t: 'warn', msg: 'Déficit persiste mesmo após o desligamento.' }; }
    if (tab === 'cliente')   { const p = v1 / tr * 100; return p > 30 ? { t: 'danger', msg: `Perda de ${p.toFixed(1)}% da receita — risco crítico.` } : { t: 'warn', msg: `Perda de ${p.toFixed(1)}% — substitua em 60 dias.` }; }
    if (tab === 'investir')  { const pb = v2 > 0 ? Math.ceil(v1 / v2) : 999; if (pb <= 3) return { t: 'ok', msg: `Payback em ${pb} meses — excelente.` }; if (pb <= months) return { t: 'warn', msg: `Payback em ${pb} meses — viável com disciplina.` }; return { t: 'danger', msg: 'Payback acima do período — risco elevado.' }; }
    if (tab === 'pipeline') { return pipelineRev > 0 ? (b + pipelineRev > 0 ? { t: 'ok', msg: `Convertendo todo o pipeline: ${BRL(b + pipelineRev)}/mês.` } : { t: 'warn', msg: `Mesmo com o pipeline (${BRL(pipelineRev)}), déficit persiste.` }) : { t: 'warn', msg: 'Nenhum cliente no pipeline ainda. Adicione em Clientes.' }; }
    const add = v1 * v2; return b + add > 0 ? { t: 'ok', msg: `Com ${v1} novos clientes: ${BRL(b + add)}/mês.` } : { t: 'warn', msg: 'Ainda insuficiente para cobrir os custos.' };
  }

  const al = getAlert();
  const b  = base;

  if (loading) return <div className="text-center py-16 text-sm text-gray-400">Carregando dados financeiros...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Simulador estratégico</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Projetando <strong className="text-gray-600">{months} {months === 1 ? 'mês' : 'meses'}</strong> · Resultado atual:&nbsp;
          <strong className={b >= 0 ? 'text-green-700' : 'text-red-600'}>{BRL(b)}/mês</strong>
          <span className="text-gray-400"> ({BRL(totalRev)} receita · {BRL(folha)} folha)</span>
        </p>
      </div>

      {/* Scenario tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(([id, lbl, icon]) => (
          <button key={id} onClick={() => switchTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
              tab === id
                ? 'bg-[#1A6B4A] text-white border-[#1A6B4A] shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}>
            <span className="text-sm">{icon}</span>
            {lbl}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left: Inputs + Results */}
        <Card title={TABS.find(t => t[0] === tab)?.[1] || ''} subtitle="Campos editáveis — impacto calculado em tempo real">
          <div className="space-y-4">
            {tab === 'contratar' && <>
              <div><label className={LBL}>Salário / honorário (R$)</label>
                <input type="number" min="0" step="500" className={INP} value={v1} onChange={e => setV1(+e.target.value)}/></div>
              <div><label className={LBL}>Tipo de contratação</label>
                <select className={INP} value={tipo} onChange={e => setTipo(+e.target.value)}>
                  <option value={1.15}>PJ — +15% encargos</option>
                  <option value={1.70}>CLT — +70% encargos totais</option>
                </select>
              </div>
              <div><label className={LBL}>Mês de início (1–{months})</label>
                <input type="number" min="1" max={months} className={INP} value={v2} onChange={e => setV2(Math.min(months, Math.max(1, +e.target.value)))}/></div>
            </>}
            {tab === 'demitir' && <>
              <div><label className={LBL}>Honorário / salário atual (R$)</label>
                <input type="number" min="0" step="500" className={INP} value={v1} onChange={e => setV1(+e.target.value)}/></div>
              <div><label className={LBL}>Tipo de vínculo</label>
                <select className={INP} value={tipo} onChange={e => setTipo(+e.target.value)}>
                  <option value={1.15}>PJ</option>
                  <option value={1.70}>CLT</option>
                </select>
              </div>
              <div><label className={LBL}>Meses de aviso prévio (0–3)</label>
                <input type="number" min="0" max="3" className={INP} value={v2} onChange={e => setV2(Math.min(3, Math.max(0, +e.target.value)))}/></div>
            </>}
            {tab === 'cliente' && <>
              <div><label className={LBL}>Selecionar cliente existente</label>
                <select className={INP} value={cliSel} onChange={e => { setCliSel(e.target.value); const c = clients.find((cl: any) => cl.id === e.target.value); if (c) setV1(Math.round(c.netRevenue)); }}>
                  <option value="">— Digitar valor manualmente —</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name.slice(0, 28)} — {BRL(c.netRevenue)}</option>)}
                </select>
              </div>
              <div><label className={LBL}>Receita mensal (R$)</label>
                <input type="number" min="0" step="500" className={INP} value={v1} onChange={e => { setV1(+e.target.value); setCliSel(''); }}/></div>
              <div><label className={LBL}>Mês em que ocorre (1–{months})</label>
                <input type="number" min="1" max={months} className={INP} value={v2} onChange={e => setV2(Math.min(months, Math.max(1, +e.target.value)))}/></div>
            </>}
            {tab === 'investir' && <>
              <div><label className={LBL}>Valor do investimento (R$)</label>
                <input type="number" min="0" step="1000" className={INP} value={v1} onChange={e => setV1(+e.target.value)}/></div>
              <div><label className={LBL}>Retorno mensal esperado (R$)</label>
                <input type="number" min="0" step="500" className={INP} value={v2} onChange={e => setV2(+e.target.value)}/></div>
            </>}
            {tab === 'pipeline' && (
              <div className="space-y-3">
                {pipelineClients.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Nenhum cliente no pipeline ainda.{' '}
                    <a href="/clientes?new=1" className="text-blue-600 underline">Adicionar →</a>
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {pipelineClients.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-blue-800 truncate">{c.name.slice(0, 24)}</p>
                          <p className="text-[10px] text-blue-500">{c.isRecurring ? 'Recorrente' : 'Pontual'}</p>
                        </div>
                        <span className="text-xs font-semibold text-blue-700 tabular-nums ml-3 flex-shrink-0">{BRL(c.netRevenue)}/mês</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-semibold pt-1 px-1 text-blue-800 border-t border-blue-100">
                      <span>Total pipeline</span>
                      <span className="tabular-nums">{BRL(pipelineRev)}/mês</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {tab === 'crescer' && <>
              <div><label className={LBL}>Novos clientes a captar</label>
                <input type="number" min="1" step="1" className={INP} value={v1} onChange={e => setV1(Math.max(1, +e.target.value))}/></div>
              <div><label className={LBL}>Ticket médio líquido (R$)</label>
                <input type="number" min="0" step="500" className={INP} value={v2} onChange={e => setV2(+e.target.value)}/></div>
            </>}

            {/* Results table */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              {getRows().map(([l, v, c]) => (
                <div key={l} className="flex justify-between text-xs py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{l}</span>
                  <span className={`font-semibold tabular-nums ${c}`}>{v}</span>
                </div>
              ))}
            </div>

            {/* Alert */}
            {al && (
              <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${
                al.t === 'ok' ? 'bg-green-50 border-green-200 text-green-800'
                  : al.t === 'warn' ? 'bg-orange-50 border-orange-200 text-orange-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${al.t === 'ok' ? 'bg-green-500' : al.t === 'warn' ? 'bg-orange-500' : 'bg-red-500'}`}/>
                {al.msg}
              </div>
            )}
          </div>
        </Card>

        {/* Right: Bar chart */}
        <Card
          title={`Resultado por mês — ${months} ${months === 1 ? 'mês' : 'meses'}`}
          subtitle="Azul = atual · Verde/Vermelho = simulado">
          <div className="relative w-full" style={{height: 300}}>
            <canvas ref={canvasRef}/>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2 text-[10.5px] text-gray-500">
            <div>
              <span className="font-medium text-gray-700">Atual/mês:</span>{' '}
              <span className={b >= 0 ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'}>{BRL(b)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Período total:</span>{' '}
              <span className={b >= 0 ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'}>{BRL(b * months)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
