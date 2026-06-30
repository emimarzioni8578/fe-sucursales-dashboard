export interface CsvColumn { key: string; header: string; }

/** Escapes a single CSV field (quotes when it contains a delimiter, quote or newline). */
export function escapeCsv(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds CSV text (UTF-8 BOM prefixed) from rows. Pure — easy to unit-test. */
export function buildCsv(rows: Record<string, any>[], columns?: CsvColumn[]): string {
  if (!rows.length) return '';
  const cols = columns ?? Object.keys(rows[0]).map(k => ({ key: k, header: k }));
  const header = cols.map(c => escapeCsv(c.header)).join(',');
  const body = rows.map(r => cols.map(c => escapeCsv(r[c.key])).join(',')).join('\n');
  return '﻿' + header + '\n' + body;
}

/** Triggers a client-side CSV download (Excel-friendly). */
export function exportToCsv(filename: string, rows: Record<string, any>[], columns?: CsvColumn[]): void {
  const csv = buildCsv(rows, columns);
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
