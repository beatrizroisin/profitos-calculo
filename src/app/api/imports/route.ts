// POST /api/imports — parse xlsx/csv and insert transactions
// GET  /api/imports — list import history
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Column name aliases for auto-mapping
const DATE_COLS    = ['data_vencimento','data_venc','data','date','dt','vencimento','competencia','data_pagamento','data_lancamento'];
const VALUE_COLS   = ['valor_liquido','valor','vlr','amount','total','vl_lancamento','credito','debito','value'];
const DESC_COLS    = ['historico','descricao','description','memo','obs','observacao','complemento','lancamento','fornecedor','cliente','nome','razao_social'];
const TYPE_COLS    = ['tipo','natureza','type','dc','credito_debito','entrada_saida','modalidade'];

function normalizeKey(k: string): string {
  return k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').trim();
}

function findCol(headers: string[], candidates: string[]): string | null {
  for (const h of headers) {
    const n = normalizeKey(h);
    if (candidates.some(c => n.includes(c) || c.includes(n))) return h;
  }
  return null;
}

function parseDate(raw: any): Date | null {
  if (!raw) return null;
  // Excel serial date (number)
  if (typeof raw === 'number' && raw > 40000 && raw < 60000) {
    const d = new Date((raw - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(raw).trim();
  // DD/MM/YYYY or DD/MM/YY
  const br = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? (parseInt(y) > 50 ? 1900 : 2000) + parseInt(y) : parseInt(y);
    const date = new Date(year, parseInt(m) - 1, parseInt(d));
    return isNaN(date.getTime()) ? null : date;
  }
  // ISO
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? null : iso;
}

function parseValue(raw: any): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Math.abs(raw);
  const s = String(raw).replace(/[R$\s]/g,'').replace(/\./g,'').replace(',','.');
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.abs(n);
}

function detectType(raw: any, importType: 'INCOME' | 'EXPENSE'): 'INCOME' | 'EXPENSE' {
  if (!raw) return importType;
  const s = String(raw).toLowerCase().trim();
  if (['c','cr','credito','crédito','entrada','income','credit'].includes(s)) return 'INCOME';
  if (['d','db','debito','débito','saida','saída','expense','debit'].includes(s)) return 'EXPENSE';
  return importType;
}

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u = session.user as any;
  if (!['OWNER','ADMIN','MANAGER'].includes(u.role)) {
    return NextResponse.json({ error: 'Sem permissão para importar.' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file       = formData.get('file') as File;
    const importType = (formData.get('type') as string || 'EXPENSE').toUpperCase() as 'INCOME' | 'EXPENSE';
    const categoryId = formData.get('categoryId') as string | null;

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });

    const fileName = file.name;
    const ext      = fileName.split('.').pop()?.toLowerCase() || '';

    let rows: Record<string, any>[] = [];

    // Parse the file
    const buffer = Buffer.from(await file.arrayBuffer());

    if (ext === 'csv') {
      // CSV parsing (manual, no external lib needed server-side)
      const text = buffer.toString('utf-8');
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return NextResponse.json({ error: 'Arquivo CSV vazio ou inválido.' }, { status: 400 });

      const sep  = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));

      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
        if (vals.every(v => !v)) continue;
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
        rows.push(row);
      }
    } else {
      // XLSX — dynamic import to avoid bundling issues
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: '' });
    }

    if (rows.length === 0) return NextResponse.json({ error: 'Nenhuma linha encontrada no arquivo.' }, { status: 400 });

    // Auto-map columns
    const headers = Object.keys(rows[0]);
    const dateCol  = findCol(headers, DATE_COLS);
    const valueCol = findCol(headers, VALUE_COLS);
    const descCol  = findCol(headers, DESC_COLS);
    const typeCol  = findCol(headers, TYPE_COLS);

    if (!valueCol) return NextResponse.json({ error: 'Coluna de valor não encontrada. Verifique se o arquivo tem colunas como: valor, vlr, amount, total.' }, { status: 400 });

    // Get or create default category
    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId) {
      const defCat = await prisma.category.findFirst({
        where: { companyId: u.companyId, type: importType, isDefault: true },
      });
      resolvedCategoryId = defCat?.id ?? null;
    }

    // Create import log
    const importLog = await prisma.importLog.create({
      data: { companyId: u.companyId, fileName, importType, totalRows: rows.length, validRows: 0, errorRows: 0, status: 'PROCESSING' },
    });

    // Process rows
    let validRows = 0, errorRows = 0;
    const errors: string[] = [];
    const transactions: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rawValue = valueCol ? row[valueCol] : null;
      const amount   = parseValue(rawValue);

      if (!amount || amount <= 0) {
        errorRows++;
        if (errors.length < 5) errors.push(`Linha ${i + 2}: valor inválido ("${rawValue}")`);
        continue;
      }

      const rawDate    = dateCol ? row[dateCol] : null;
      const dueDate    = parseDate(rawDate) ?? new Date();
      const description = (descCol ? String(row[descCol] || '') : '').trim() || `Importado linha ${i + 2}`;
      const txType     = typeCol ? detectType(row[typeCol], importType) : importType;

      transactions.push({
        companyId:  u.companyId,
        importId:   importLog.id,
        categoryId: resolvedCategoryId,
        type:       txType,
        description: description.slice(0, 200),
        amount,
        grossAmount: amount,
        dueDate,
        status:     'PENDING',
      });
      validRows++;
    }

    // Bulk insert transactions
    if (transactions.length > 0) {
      await prisma.transaction.createMany({ data: transactions });
    }

    // Update import log
    await prisma.importLog.update({
      where: { id: importLog.id },
      data: {
        validRows,
        errorRows,
        totalRows: rows.length,
        status: errorRows === rows.length ? 'FAILED' : 'COMPLETED',
        errorDetails: errors.length > 0 ? errors.join('\n') : null,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success:    true,
      importId:   importLog.id,
      totalRows:  rows.length,
      validRows,
      errorRows,
      errors:     errors.slice(0, 10),
      columnsDetected: { date: dateCol, value: valueCol, description: descCol, type: typeCol },
    });

  } catch (err: any) {
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Erro ao processar arquivo: ' + (err?.message || 'desconhecido') }, { status: 500 });
  }
}
