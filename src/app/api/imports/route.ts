// POST /api/imports — parse xlsx/csv and insert transactions
// GET  /api/imports — list import history

// Allow files up to 10 MB (default Next.js App Router limit is ~4 MB)
export const maxDuration = 60; // 60s timeout for large files on Vercel
export const dynamic     = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ─── Column aliases ───────────────────────────────────────────────────────────
const DATE_COLS  = ['data_vencimento','data_venc','data','date','dt','vencimento','competencia','data_pagamento','data_lancamento','prazo'];
const VALUE_COLS = ['valor_liquido','valor','vlr','amount','total','vl_lancamento','credito','debito','value','valor_total','valor_bruto'];
const DESC_COLS  = ['historico','descricao','description','memo','obs','observacao','complemento','lancamento','fornecedor','cliente','nome','razao_social','historico_lancamento'];
const TYPE_COLS  = ['tipo','natureza','type','dc','credito_debito','entrada_saida','modalidade','debito_credito'];
const CLI_COLS   = ['cliente','client','nome_cliente','razao_social','sacado','pagador'];
const CAT_COLS   = ['categoria','category','grupo','tipo_despesa','tipo_receita','classificacao'];

function normalizeKey(k: string): string {
  return k.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]/g,'_')
    .replace(/_+/g,'_')
    .replace(/^_|_$/g,'');
}

function findCol(headers: string[], candidates: string[]): string | null {
  for (const h of headers) {
    const n = normalizeKey(h);
    if (candidates.includes(n)) return h;
  }
  // Second pass: partial match
  for (const h of headers) {
    const n = normalizeKey(h);
    if (candidates.some(c => n.includes(c) || c.includes(n))) return h;
  }
  return null;
}

function parseDate(raw: any): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;

  // Excel serial number (days since 1900-01-01)
  if (typeof raw === 'number') {
    if (raw > 40000 && raw < 60000) {
      // Excel serial — subtract 25569 days between Excel epoch (1900-01-01) and Unix epoch (1970-01-01)
      // Excel also incorrectly considers 1900 a leap year, so we adjust by 1
      const unix = (raw - 25569) * 86400 * 1000;
      const d = new Date(unix);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  const s = String(raw).trim();
  if (!s) return null;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const brMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (brMatch) {
    const day   = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10);
    const rawY  = parseInt(brMatch[3], 10);
    const year  = brMatch[3].length === 2
      ? (rawY >= 50 ? 1900 + rawY : 2000 + rawY)
      : rawY;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD (ISO)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Try generic parse as fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseValue(raw: any): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Math.abs(raw);

  const s = String(raw)
    .replace(/[R$\s]/g, '')   // remove R$ and spaces
    .trim();

  // Handle Brazilian format: 1.234,56 → 1234.56
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(s)) {
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? null : Math.abs(n);
  }

  // Handle international format or simple decimal
  const clean = s.replace(/,/g, '.').replace(/[^0-9.\-]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? null : Math.abs(n);
}

function detectType(raw: any, defaultType: 'INCOME' | 'EXPENSE'): 'INCOME' | 'EXPENSE' {
  if (!raw) return defaultType;
  const s = String(raw).toLowerCase().trim();
  if (['c','cr','cred','credito','crédito','entrada','income','credit','receita','recebimento'].includes(s)) return 'INCOME';
  if (['d','db','deb','debito','débito','saida','saída','expense','debit','despesa','pagamento'].includes(s)) return 'EXPENSE';
  return defaultType;
}

// Parse CSV properly handling quoted fields with commas inside
function parseCSV(text: string): Record<string, any>[] {
  const lines: string[] = [];
  let cur = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (cur.trim()) lines.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) lines.push(cur);

  if (lines.length < 2) return [];

  // Auto-detect separator: try ; first (common in Brazilian CSVs), then ,
  const firstLine = lines[0];
  const sep = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { field += '"'; i++; }
        else inQ = !inQ;
      } else if (c === sep && !inQ) {
        fields.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  }

  const headers = splitLine(lines[0]).map(h => h.trim());
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i]);
    if (vals.every(v => !v.trim())) continue;
    const row: Record<string, any> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  const imports = await prisma.importLog.findMany({
    where: { companyId: u.companyId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return NextResponse.json(imports);
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;

  if (!['OWNER','ADMIN','MANAGER'].includes(u.role)) {
    return NextResponse.json({ error: 'Sem permissão para importar.' }, { status: 403 });
  }

  try {
    const formData   = await req.formData();
    const file       = formData.get('file') as File | null;
    const importType = ((formData.get('type') as string) || 'EXPENSE').toUpperCase() as 'INCOME' | 'EXPENSE';
    const categoryId = formData.get('categoryId') as string | null;

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 });

    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (!['xlsx','xls','csv'].includes(ext)) {
      return NextResponse.json({ error: 'Formato não suportado. Use .xlsx, .xls ou .csv.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: Record<string, any>[] = [];

    if (ext === 'csv') {
      // Detect encoding — try UTF-8 first, fallback to latin1
      let text: string;
      try {
        text = buffer.toString('utf-8');
        // Check for BOM
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      } catch {
        text = buffer.toString('latin1');
      }
      rows = parseCSV(text);
    } else {
      // XLSX / XLS — must be external package (see next.config.mjs)
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: false,      // keep as serial number so our parseDate handles it
        raw: false,            // format cells as strings
        cellNF: false,
      });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(ws, {
        raw: true,
        defval: '',
        blankrows: false,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nenhuma linha encontrada no arquivo. Verifique se a primeira linha é o cabeçalho.' }, { status: 400 });
    }

    // Auto-map columns
    const headers  = Object.keys(rows[0]);
    const dateCol  = findCol(headers, DATE_COLS);
    const valueCol = findCol(headers, VALUE_COLS);
    const descCol  = findCol(headers, DESC_COLS);
    const typeCol  = findCol(headers, TYPE_COLS);
    const cliCol   = findCol(headers, CLI_COLS);

    if (!valueCol) {
      return NextResponse.json({
        error: `Coluna de valor não encontrada. Renomeie a coluna para "valor" ou "amount". Colunas detectadas: ${headers.slice(0,6).join(', ')}`,
      }, { status: 400 });
    }

    // Resolve default category
    let resolvedCategoryId = categoryId ?? null;
    if (!resolvedCategoryId) {
      const defCat = await prisma.category.findFirst({
        where: { companyId: u.companyId, type: importType, isDefault: true },
      });
      resolvedCategoryId = defCat?.id ?? null;
    }

    // Load existing clients for name-matching (if cliCol found)
    const clientMap = new Map<string, string>(); // normalized name → id
    if (cliCol) {
      const clients = await prisma.client.findMany({
        where: { companyId: u.companyId },
        select: { id: true, name: true },
      });
      for (const c of clients) {
        clientMap.set(normalizeKey(c.name), c.id);
      }
    }

    // Create import log
    const importLog = await prisma.importLog.create({
      data: {
        companyId:  u.companyId,
        fileName,
        importType,
        totalRows:  rows.length,
        validRows:  0,
        errorRows:  0,
        status:     'PROCESSING',
      },
    });

    // Process rows
    let validRows = 0, errorRows = 0;
    const errors: string[] = [];
    const transactions: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row      = rows[i];
      const rawValue = valueCol ? row[valueCol] : null;
      const amount   = parseValue(rawValue);

      if (!amount || amount <= 0) {
        errorRows++;
        if (errors.length < 10) {
          errors.push(`Linha ${i + 2}: valor inválido ("${rawValue}")`);
        }
        continue;
      }

      const rawDate    = dateCol ? row[dateCol] : null;
      const dueDate    = parseDate(rawDate) ?? new Date();
      const description = descCol
        ? String(row[descCol] ?? '').trim() || `Importado linha ${i + 2}`
        : `Importado linha ${i + 2}`;
      const txType     = typeCol ? detectType(row[typeCol], importType) : importType;

      // Try to match client
      let clientId: string | null = null;
      if (cliCol && row[cliCol]) {
        const key = normalizeKey(String(row[cliCol]));
        clientId = clientMap.get(key) ?? null;
        // Fuzzy: try partial match
        if (!clientId) {
          for (const [k, id] of clientMap.entries()) {
            if (k.includes(key.slice(0, 8)) || key.includes(k.slice(0, 8))) {
              clientId = id;
              break;
            }
          }
        }
      }

      transactions.push({
        companyId:   u.companyId,
        importId:    importLog.id,
        categoryId:  resolvedCategoryId,
        clientId,
        type:        txType,
        description: description.slice(0, 200),
        amount,
        grossAmount: amount,
        dueDate,
        status:      'PENDING',
      });
      validRows++;
    }

    // Bulk insert
    if (transactions.length > 0) {
      await prisma.transaction.createMany({ data: transactions, skipDuplicates: false });
    }

    // Update log
    const finalStatus = errorRows === rows.length ? 'FAILED'
      : errorRows > 0 ? 'COMPLETED'
      : 'COMPLETED';

    await prisma.importLog.update({
      where: { id: importLog.id },
      data: {
        validRows,
        errorRows,
        totalRows:    rows.length,
        status:       finalStatus,
        errorDetails: errors.length > 0 ? errors.join('\n') : null,
        completedAt:  new Date(),
      },
    });

    return NextResponse.json({
      success:          true,
      importId:         importLog.id,
      totalRows:        rows.length,
      validRows,
      errorRows,
      errors:           errors.slice(0, 10),
      columnsDetected:  { date: dateCol, value: valueCol, description: descCol, type: typeCol },
    });

  } catch (err: any) {
    console.error('[imports] Error:', err);
    return NextResponse.json({
      error: `Erro ao processar arquivo: ${err?.message ?? 'desconhecido'}. Verifique se o arquivo não está corrompido ou protegido por senha.`,
    }, { status: 500 });
  }
}
