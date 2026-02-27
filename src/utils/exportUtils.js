// Neutralize CSV formula injection — prefix cells that start with
// formula-triggering characters so spreadsheet apps don't execute them.
const FORMULA_RE = /^[=+\-@|\t\r]/;
function sanitizeCell(str) {
  if (FORMULA_RE.test(str)) return "'" + str;
  return str;
}

export function exportToCSV(data, columns, filename) {
  if (!data || data.length === 0) return;

  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      const str = val == null ? '' : sanitizeCell(String(val));
      // Escape CSV: wrap in quotes if it contains commas, quotes, or newlines
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
