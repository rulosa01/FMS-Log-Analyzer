import { useState, useMemo } from 'react';
import { Shield, AlertCircle, AlertTriangle, Bell, Cpu, HardDrive } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatTimestamp } from '../utils/dateUtils.js';

const CHART_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4'];

const SEVERITY_STYLES = {
  error: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  warn: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
};

export default function FacView({ entries }) {
  const [filterSeverity, setFilterSeverity] = useState('all');

  const stats = useMemo(() => {
    const errors = entries.filter(e => e.severity === 'error').length;
    const warnings = entries.filter(e => e.severity === 'warn').length;
    const cpuAlerts = entries.filter(e => e.notificationType?.includes('CPU')).length;
    const memAlerts = entries.filter(e => e.notificationType?.includes('MEMORY')).length;
    return { total: entries.length, errors, warnings, cpuAlerts, memAlerts };
  }, [entries]);

  const componentBreakdown = useMemo(() => {
    const map = Object.create(null);
    entries.forEach(e => {
      const c = e.component || 'unknown';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [entries]);

  const notificationBreakdown = useMemo(() => {
    const map = Object.create(null);
    entries.forEach(e => {
      if (!e.notificationType) return;
      map[e.notificationType] = (map[e.notificationType] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })).sort((a, b) => b.value - a.value);
  }, [entries]);

  const messageBreakdown = useMemo(() => {
    const map = Object.create(null);
    entries.forEach(e => {
      // Normalize message by removing timestamps/IDs for grouping
      const key = e.message.replace(/\d+/g, '#');
      if (!map[key]) map[key] = { message: e.message, pattern: key, count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [entries]);

  const filtered = useMemo(() => {
    if (filterSeverity === 'all') return entries;
    return entries.filter(e => e.severity === filterSeverity);
  }, [entries, filterSeverity]);

  const columns = [
    { key: 'timestamp', label: 'Timestamp', accessor: 'timestamp', render: (v) => <span className="whitespace-nowrap font-mono text-[11px]">{formatTimestamp(v)}</span> },
    { key: 'severity', label: 'Severity', accessor: 'severity',
      render: (v) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${SEVERITY_STYLES[v] || SEVERITY_STYLES.info}`}>{v}</span>
    },
    { key: 'component', label: 'Component', accessor: 'component' },
    { key: 'errorCode', label: 'Error Code', accessor: 'errorCode' },
    { key: 'message', label: 'Message', accessor: 'message', render: (v) => <span className="text-[11px] max-w-lg truncate block">{v}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Entries" value={stats.total.toLocaleString()} color="orange" icon={Shield}
          onClick={() => setFilterSeverity('all')} active={filterSeverity === 'all'} />
        <StatCard label="Errors" value={stats.errors.toLocaleString()} color="red" icon={AlertCircle}
          onClick={() => setFilterSeverity(filterSeverity === 'error' ? 'all' : 'error')} active={filterSeverity === 'error'} />
        <StatCard label="Warnings" value={stats.warnings.toLocaleString()} color="amber" icon={AlertTriangle}
          onClick={() => setFilterSeverity(filterSeverity === 'warn' ? 'all' : 'warn')} active={filterSeverity === 'warn'} />
        <StatCard label="CPU Alerts" value={stats.cpuAlerts.toLocaleString()} color="violet" icon={Cpu} />
        <StatCard label="Memory Alerts" value={stats.memAlerts.toLocaleString()} color="cyan" icon={HardDrive} />
      </div>

      {filterSeverity === 'all' && (
        <div className="grid md:grid-cols-2 gap-4">
          {componentBreakdown.length > 1 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">By Component</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={componentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {componentBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {notificationBreakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">System Notifications</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={notificationBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Top repeated messages */}
      {filterSeverity === 'all' && messageBreakdown.length > 1 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Top Repeated Messages</h3>
          <div className="space-y-2">
            {messageBreakdown.slice(0, 8).map((m, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xs font-mono font-bold text-orange-500 min-w-[3rem] text-right">{m.count.toLocaleString()}x</span>
                <span className="text-xs text-gray-600 dark:text-gray-300 font-mono break-all">{m.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        title="Admin Console Log"
        exportFilename="fac.csv"
        defaultSortKey="timestamp"
        defaultSortDir="desc"
      />
    </div>
  );
}
