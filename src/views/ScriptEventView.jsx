import { useMemo } from 'react';
import { AlertCircle, FileCode, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatTimestamp } from '../utils/dateUtils.js';

export default function ScriptEventView({ entries }) {
  // Error code breakdown
  const errorBreakdown = useMemo(() => {
    const map = Object.create(null);
    entries.forEach(e => {
      const code = e.fmErrorCode ?? e.errorCode ?? 'Unknown';
      if (!map[code]) map[code] = { code, count: 0, totalOccurrences: 0 };
      map[code].count++;
      map[code].totalOccurrences += e.errorCount || 1;
    });
    return Object.values(map).sort((a, b) => b.totalOccurrences - a.totalOccurrences);
  }, [entries]);

  // Script breakdown
  const scriptBreakdown = useMemo(() => {
    const map = Object.create(null);
    entries.forEach(e => {
      const key = e.scriptName || 'Unknown';
      if (!map[key]) map[key] = { script: key, database: e.database, count: 0, errors: new Set() };
      map[key].count++;
      if (e.fmErrorCode) map[key].errors.add(e.fmErrorCode);
    });
    return Object.values(map).map(s => ({
      ...s,
      errorCodes: Array.from(s.errors).join(', '),
    })).sort((a, b) => b.count - a.count);
  }, [entries]);

  const stats = useMemo(() => ({
    totalEntries: entries.length,
    uniqueScripts: new Set(entries.filter(e => e.scriptName).map(e => e.scriptName)).size,
    uniqueErrors: new Set(entries.filter(e => e.fmErrorCode).map(e => e.fmErrorCode)).size,
    uniqueSchedules: new Set(entries.filter(e => e.scheduleName).map(e => e.scheduleName)).size,
  }), [entries]);

  const columns = [
    { key: 'timestamp', label: 'Timestamp', accessor: 'timestamp', render: (v) => <span className="whitespace-nowrap font-mono text-[11px]">{formatTimestamp(v)}</span> },
    { key: 'fmErrorCode', label: 'FM Error', accessor: 'fmErrorCode', render: (v) => v ? <span className="text-red-500 font-medium">{v}</span> : '-' },
    { key: 'errorCount', label: 'Count', accessor: 'errorCount', render: (v) => v > 1 ? <span className="text-amber-500 font-medium">{v}x</span> : '1' },
    { key: 'scheduleName', label: 'Schedule', accessor: 'scheduleName' },
    { key: 'database', label: 'Database', accessor: 'database' },
    { key: 'scriptName', label: 'Script', accessor: 'scriptName' },
    { key: 'scriptStepNumber', label: 'Step #', accessor: 'scriptStepNumber' },
    { key: 'scriptStep', label: 'Script Step', accessor: 'scriptStep' },
    { key: 'message', label: 'Message', accessor: 'message', render: (v) => <span className="max-w-md truncate block">{v}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Events" value={stats.totalEntries.toLocaleString()} color="red" icon={AlertCircle} />
        <StatCard label="Unique Scripts" value={stats.uniqueScripts} color="blue" icon={FileCode} />
        <StatCard label="Error Codes" value={stats.uniqueErrors} color="amber" icon={AlertCircle} />
        <StatCard label="Schedules" value={stats.uniqueSchedules} color="emerald" icon={Database} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Error code chart */}
        {errorBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Errors by FM Error Code</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={errorBreakdown.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="code" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="totalOccurrences" name="Occurrences" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Scripts chart */}
        {scriptBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Top Scripts with Errors</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scriptBreakdown.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="script" width={150} tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="count" name="Events" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <DataTable
        data={entries}
        columns={columns}
        title="Script Event Log"
        exportFilename="script-events.csv"
        defaultSortKey="timestamp"
        defaultSortDir="desc"
      />
    </div>
  );
}
