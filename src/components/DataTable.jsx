import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportToCSV } from '../utils/exportUtils.js';

const PAGE_SIZE = 50;

export default function DataTable({ data, columns, title, exportFilename, defaultSortKey, defaultSortDir = 'desc' }) {
  const [sortKey, setSortKey] = useState(defaultSortKey || null);
  const [sortDir, setSortDir] = useState(defaultSortDir);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => (c.key || c.accessor) === sortKey);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor];
      const bv = typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      if (av instanceof Date && bv instanceof Date) {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const sa = String(av).toLowerCase();
      const sb = String(bv).toLowerCase();
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  const handleExport = () => {
    if (exportFilename) {
      exportToCSV(sorted, columns, exportFilename);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 flex-wrap">
        {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h3>}
        <span className="text-xs text-gray-400">{filtered.length.toLocaleString()} entries</span>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-gray-400 w-48"
          />
        </div>

        {exportFilename && (
          <button
            onClick={handleExport}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              {columns.map(col => {
                const key = col.key || col.accessor;
                const isActive = sortKey === key;
                return (
                  <th
                    key={key}
                    onClick={() => col.sortable !== false && handleSort(key)}
                    className={`px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap ${col.sortable !== false ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none' : ''} ${col.className || ''}`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {isActive && (
                        sortDir === 'asc'
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                {columns.map(col => {
                  const key = col.key || col.accessor;
                  const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
                  return (
                    <td key={key} className={`px-3 py-2 text-gray-700 dark:text-gray-300 ${col.className || ''}`}>
                      {col.render ? col.render(val, row) : (val != null ? String(val) : '')}
                    </td>
                  );
                })}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-400">
                  No data to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Page {page + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
