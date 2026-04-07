'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, Grid2, Alert } from '@/components/ui';

interface ImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors?: string[];
  columnsDetected?: { date: string|null; value: string|null; description: string|null; type: string|null };
}
interface ImportLog {
  id: string; fileName: string; importType: string;
  totalRows: number; validRows: number; errorRows: number;
  status: string; createdAt: string;
}

export default function ImportarPage() {
  const [logs, setLogs]                   = useState<ImportLog[]>([]);
  const [pResult, setPResult]             = useState<ImportResult | null>(null);
  const [rResult, setRResult]             = useState<ImportResult | null>(null);
  const [pLoading, setPLoading]           = useState(false);
  const [rLoading, setRLoading]           = useState(false);
  const [pError, setPError]               = useState('');
  const [rError, setRError]               = useState('');
  const [pPreview, setPPreview]           = useState<string|null>(null);
  const [rPreview, setRPreview]           = useState<string|null>(null);
  const pRef = useRef<HTMLInputElement>(null);
  const rRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    const res = await fetch('/api/imports');
    if (res.ok) setLogs(await res.json());
  }

  function onFileSelect(file: File, tipo: 'p' | 'r') {
    const sizeKB = (file.size / 1024).toFixed(0);
    const name   = `${file.name} (${sizeKB} KB)`;
    if (tipo === 'p') { setPPreview(name); setPResult(null); setPError(''); }
    else              { setRPreview(name); setRResult(null); setRError(''); }
  }

  async function handleUpload(tipo: 'p' | 'r') {
    const input = tipo === 'p' ? pRef.current : rRef.current;
    const file  = input?.files?.[0];
    if (!file) return;

    const setLoading = tipo === 'p' ? setPLoading : setRLoading;
    const setResult  = tipo === 'p' ? setPResult  : setRResult;
    const setError   = tipo === 'p' ? setPError   : setRError;
    const importType = tipo === 'p' ? 'EXPENSE' : 'INCOME';

    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', importType);

      const res  = await fetch('/api/imports', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Erro ao importar.'); }
      else         { setResult(data); fetchLogs(); }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const dropCls = "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all";

  function DropZone({ tipo, color, icon, label, cols }: { tipo:'p'|'r'; color:string; icon:string; label:string; cols:string }) {
    const ref    = tipo === 'p' ? pRef  : rRef;
    const prev   = tipo === 'p' ? pPreview : rPreview;
    const load   = tipo === 'p' ? pLoading : rLoading;
    const res    = tipo === 'p' ? pResult  : rResult;
    const err    = tipo === 'p' ? pError   : rError;
    const hover  = tipo === 'p' ? 'hover:border-red-400 hover:bg-red-50' : 'hover:border-green-400 hover:bg-green-50';

    return (
      <Card title={label} subtitle=".xlsx · .xls · .csv">
        <label className={`${dropCls} border-gray-200 bg-gray-50 ${hover}`}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f && ref.current){ const dt=new DataTransfer(); dt.items.add(f); ref.current.files=dt.files; onFileSelect(f, tipo); } }}>
          <svg width="30" height="30" fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
          </svg>
          <p className="text-sm font-medium text-gray-700 mb-1">Arraste ou clique para selecionar</p>
          <p className="text-xs text-gray-400">{cols}</p>
          <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if(f) onFileSelect(f, tipo); }} />
        </label>

        {prev && (
          <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="#6B7280" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span className="text-xs text-gray-600">{prev}</span>
            </div>
            <button onClick={() => handleUpload(tipo)} disabled={load}
              className="px-4 py-1.5 bg-[#1A6B4A] text-white text-xs font-medium rounded-lg hover:bg-[#0F4A33] disabled:opacity-60 transition-colors">
              {load ? 'Importando...' : 'Importar agora'}
            </button>
          </div>
        )}

        {err && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{err}</div>}

        {res && (
          <div className="mt-3 space-y-2">
            <div className={`p-3 rounded-lg border text-xs ${res.errorRows === res.totalRows ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
              <p className="font-semibold mb-1">{res.errorRows === res.totalRows ? 'Importação falhou' : 'Importação concluída'}</p>
              <div className="flex gap-4">
                <span>Total: <strong>{res.totalRows}</strong> linhas</span>
                <span>Importadas: <strong className="text-green-700">{res.validRows}</strong></span>
                {res.errorRows > 0 && <span>Erros: <strong className="text-red-600">{res.errorRows}</strong></span>}
              </div>
            </div>
            {res.columnsDetected && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                <p className="font-medium mb-1">Colunas detectadas automaticamente:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {res.columnsDetected.date  && <span>Data → <code className="bg-blue-100 px-1 rounded">{res.columnsDetected.date}</code></span>}
                  {res.columnsDetected.value && <span>Valor → <code className="bg-blue-100 px-1 rounded">{res.columnsDetected.value}</code></span>}
                  {res.columnsDetected.description && <span>Descrição → <code className="bg-blue-100 px-1 rounded">{res.columnsDetected.description}</code></span>}
                  {res.columnsDetected.type  && <span>Tipo → <code className="bg-blue-100 px-1 rounded">{res.columnsDetected.type}</code></span>}
                </div>
              </div>
            )}
            {res.errors && res.errors.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                <p className="font-medium mb-1">Linhas com erro (primeiros {res.errors.length}):</p>
                {res.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  }

  const statusStyle: Record<string, string> = {
    COMPLETED: 'bg-green-50 text-green-800', FAILED: 'bg-red-50 text-red-800', PROCESSING: 'bg-blue-50 text-blue-800',
  };
  const statusLabel: Record<string, string> = { COMPLETED: 'Concluído', FAILED: 'Falhou', PROCESSING: 'Processando' };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Importar planilhas</h1>
        <p className="text-sm text-gray-400 mt-0.5">Parse real de .xlsx, .xls e .csv — detecção automática de colunas</p>
      </div>

      <Grid2>
        <DropZone tipo="p" color="#DC3545"
          icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          label="Contas a pagar" cols="Fornecedor · data · valor · categoria" />
        <DropZone tipo="r" color="#1A6B4A"
          icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          label="Contas a receber" cols="Cliente · data · valor · recorrência" />
      </Grid2>

      <Card title="Colunas detectadas automaticamente" subtitle="Compatível com os formatos mais comuns de extratos e ERPs brasileiros">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            ['Data', 'DATA_VENCIMENTO · data_venc · data · dt · date · vencimento'],
            ['Valor', 'VALOR_LIQUIDO · valor · vlr · amount · total · vl_lancamento'],
            ['Descrição', 'HISTORICO · descricao · description · memo · obs · fornecedor · cliente · nome'],
            ['Tipo D/C', 'tipo · natureza · dc · credito_debito · entrada_saida · modalidade'],
          ].map(([f, e]) => (
            <div key={f} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{f}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{e}</p>
            </div>
          ))}
        </div>
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 space-y-1">
          <p className="font-medium">Formatos de data suportados:</p>
          <p>DD/MM/AAAA · DD-MM-AAAA · AAAA-MM-DD (ISO) · número serial do Excel</p>
          <p className="font-medium mt-1">Formatos de valor suportados:</p>
          <p>1234.56 · 1.234,56 · R$ 1.234,56 · -1234.56 (negativo vira absoluto)</p>
        </div>
      </Card>

      {logs.length > 0 && (
        <Card title="Histórico de importações" subtitle={`Últimas ${logs.length} importações`}>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <svg width="14" height="14" fill="none" stroke="#6B7280" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{log.fileName}</p>
                    <p className="text-[10px] text-gray-400">{new Date(log.createdAt).toLocaleDateString('pt-BR', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{log.validRows}/{log.totalRows} linhas</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle[log.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel[log.status] || log.status}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${log.importType === 'INCOME' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {log.importType === 'INCOME' ? 'A receber' : 'A pagar'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
