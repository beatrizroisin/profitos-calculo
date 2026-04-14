'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Grid2 } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ImportResult {
  success:          boolean;
  totalRows:        number;
  validRows:        number;
  errorRows:        number;
  errors?:          string[];
  columnsDetected?: {
    date:        string | null;
    value:       string | null;
    description: string | null;
    type:        string | null;
  };
}
interface ImportLog {
  id:         string;
  fileName:   string;
  importType: string;
  totalRows:  number;
  validRows:  number;
  errorRows:  number;
  status:     string;
  createdAt:  string;
}

// ─── Standalone UploadCard — NOT nested inside parent ─────────────────────────
// Defined outside ImportarPage so React never remounts it on parent state change.
interface UploadCardProps {
  tipo:     'pagar' | 'receber';
  label:    string;
  cols:     string;
  color:    string;
  icon:     string;
  onDone:   () => void;        // refresh log history
}

function UploadCard({ tipo, label, cols, color, icon, onDone }: UploadCardProps) {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileObj,  setFileObj]  = useState<File | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<ImportResult | null>(null);
  const [error,    setError]    = useState('');

  // When user picks a file, store it in state (not just the ref)
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileObj(f);
    setFileName(`${f.name} (${(f.size / 1024).toFixed(0)} KB)`);
    setResult(null);
    setError('');
  }

  // Drag-and-drop
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    // Sync to the hidden input so it looks consistent
    if (inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(f);
      inputRef.current.files = dt.files;
    }
    setFileObj(f);
    setFileName(`${f.name} (${(f.size / 1024).toFixed(0)} KB)`);
    setResult(null);
    setError('');
  }

  async function handleUpload() {
    if (!fileObj) {
      setError('Selecione um arquivo primeiro.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', fileObj);
      fd.append('type', tipo === 'pagar' ? 'EXPENSE' : 'INCOME');

      const res  = await fetch('/api/imports', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao importar. Verifique o arquivo.');
      } else {
        setResult(data);
        onDone();
        // Reset file selection after success
        if (inputRef.current) inputRef.current.value = '';
        setFileObj(null);
        setFileName('');
      }
    } catch (err) {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const isError  = tipo === 'pagar';
  const hoverCls = isError
    ? 'hover:border-red-400 hover:bg-red-50'
    : 'hover:border-green-500 hover:bg-green-50';

  return (
    <Card title={label} subtitle=".xlsx · .xls · .csv">
      {/* Drop zone */}
      <div
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all border-gray-200 bg-gray-50 ${hoverCls}`}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <svg width="30" height="30" fill="none" stroke={color} strokeWidth="1.5"
          viewBox="0 0 24 24" className="mb-3 pointer-events-none">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
        <p className="text-sm font-medium text-gray-700 mb-1 pointer-events-none">
          Arraste ou clique para selecionar
        </p>
        <p className="text-xs text-gray-400 pointer-events-none">{cols}</p>
      </div>

      {/* Hidden file input — kept separate from clickable area */}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onFileChange}
      />

      {/* File selected — show name + upload button */}
      {fileName && !result && (
        <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <svg width="14" height="14" fill="none" stroke="#6B7280" strokeWidth="1.5"
              viewBox="0 0 24 24" className="flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs text-gray-600 truncate">{fileName}</span>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleUpload(); }}
            disabled={loading}
            className="ml-3 flex-shrink-0 px-4 py-1.5 bg-[#1A6B4A] text-white text-xs font-medium rounded-lg hover:bg-[#0F4A33] disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Importando...
              </span>
            ) : 'Importar agora'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
            viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Success result */}
      {result && (
        <div className="mt-3 space-y-2">
          <div className={`p-3 rounded-lg border text-xs font-medium
            ${result.errorRows > 0 && result.validRows === 0
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-green-50 border-green-200 text-green-800'}`}>
            <p className="font-semibold mb-1.5">
              {result.validRows === 0 ? 'Importação falhou' : 'Importação concluída!'}
            </p>
            <div className="flex flex-wrap gap-3">
              <span>Total: <strong>{result.totalRows}</strong> linhas</span>
              <span className="text-green-700">
                Importadas: <strong>{result.validRows}</strong>
              </span>
              {result.errorRows > 0 && (
                <span className="text-red-600">
                  Erros: <strong>{result.errorRows}</strong>
                </span>
              )}
            </div>
          </div>

          {result.columnsDetected && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
              <p className="font-medium mb-1">Colunas detectadas:</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {result.columnsDetected.date && (
                  <span>Data → <code className="bg-blue-100 px-1 rounded">{result.columnsDetected.date}</code></span>
                )}
                {result.columnsDetected.value && (
                  <span>Valor → <code className="bg-blue-100 px-1 rounded">{result.columnsDetected.value}</code></span>
                )}
                {result.columnsDetected.description && (
                  <span>Descrição → <code className="bg-blue-100 px-1 rounded">{result.columnsDetected.description}</code></span>
                )}
                {result.columnsDetected.type && (
                  <span>Tipo → <code className="bg-blue-100 px-1 rounded">{result.columnsDetected.type}</code></span>
                )}
              </div>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
              <p className="font-medium mb-1">Linhas ignoradas (até 10):</p>
              {result.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          <button
            type="button"
            onClick={() => setResult(null)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Importar outro arquivo
          </button>
        </div>
      )}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ImportarPage() {
  const [logs, setLogs] = useState<ImportLog[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/imports');
      if (res.ok) setLogs(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const statusStyle: Record<string, string> = {
    COMPLETED: 'bg-green-50 text-green-700',
    FAILED:    'bg-red-50 text-red-700',
    PROCESSING:'bg-blue-50 text-blue-700',
  };
  const statusLabel: Record<string, string> = {
    COMPLETED: 'Concluído',
    FAILED:    'Falhou',
    PROCESSING:'Processando',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Importar planilhas</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Parse real de .xlsx, .xls e .csv — detecção automática de colunas
        </p>
      </div>

      <Grid2>
        <UploadCard
          tipo="pagar"
          label="Contas a pagar"
          cols="Fornecedor · data · valor · categoria"
          color="#DC3545"
          icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          onDone={fetchLogs}
        />
        <UploadCard
          tipo="receber"
          label="Contas a receber"
          cols="Cliente · data · valor · imposto"
          color="#1A6B4A"
          icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          onDone={fetchLogs}
        />
      </Grid2>

      {/* Alias reference */}
      <Card
        title="Colunas detectadas automaticamente"
        subtitle="Compatível com extratos bancários, ERPs e sistemas brasileiros"
      >
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            ['Data',       'DATA_VENCIMENTO · data_venc · data · dt · date · vencimento · competencia'],
            ['Valor',      'VALOR_LIQUIDO · valor · vlr · amount · total · vl_lancamento · credito · debito'],
            ['Descrição',  'HISTORICO · descricao · description · memo · obs · fornecedor · cliente · nome'],
            ['Tipo D/C',   'tipo · natureza · dc · credito_debito · entrada_saida · modalidade'],
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
          <p>1234.56 · 1.234,56 · R$ 1.234,56 · valores negativos viram positivos automaticamente</p>
        </div>
      </Card>

      {/* History */}
      {logs.length > 0 && (
        <Card
          title="Histórico de importações"
          subtitle={`Últimas ${logs.length} importações`}
        >
          <div className="space-y-2">
            {logs.map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg width="14" height="14" fill="none" stroke="#6B7280" strokeWidth="1.5"
                    viewBox="0 0 24 24" className="flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{log.fileName}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(log.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-xs text-gray-500">
                    {log.validRows}/{log.totalRows} linhas
                  </span>
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
