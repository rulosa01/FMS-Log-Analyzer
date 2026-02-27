import { useState, useMemo } from 'react';
import { Globe, AlertCircle, Database, Activity, Users, X } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatTimestamp } from '../utils/dateUtils.js';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function FmdapiView({ entries }) {
  const [filterLevel, setFilterLevel] = useState('all');
  const [detailPanel, setDetailPanel] = useState(null); // 'ips' | 'accounts' | 'databases' | null
  const [filterValue, setFilterValue] = useState(null); // filter table by specific IP, account, or database

  const stats = useMemo(() => ({
    total: entries.length,
    errors: entries.filter(e => e.level === 'ERROR').length,
    uniqueIPs: new Set(entries.map(e => e.ip).filter(Boolean)).size,
    uniqueAccounts: new Set(entries.map(e => e.account).filter(Boolean)).size,
    uniqueDBs: new Set(entries.map(e => e.database).filter(Boolean)).size,
  }), [entries]);

  // IP breakdown
  const ipSummary = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const ip = e.ip || 'Unknown';
      if (!map[ip]) map[ip] = { ip, requests: 0, errors: 0, accounts: new Set(), databases: new Set(), methods: new Set() };
      map[ip].requests++;
      if (e.level === 'ERROR') map[ip].errors++;
      if (e.account) map[ip].accounts.add(e.account);
      if (e.database) map[ip].databases.add(e.database);
      if (e.method) map[ip].methods.add(e.method);
    });
    return Object.values(map)
      .map(d => ({ ...d, accounts: Array.from(d.accounts), databases: Array.from(d.databases), methods: Array.from(d.methods) }))
      .sort((a, b) => b.requests - a.requests);
  }, [entries]);

  // Account breakdown
  const accountSummary = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const acct = e.account || 'Unknown';
      if (!map[acct]) map[acct] = { account: acct, requests: 0, errors: 0, ips: new Set(), databases: new Set(), methods: new Set() };
      map[acct].requests++;
      if (e.level === 'ERROR') map[acct].errors++;
      if (e.ip) map[acct].ips.add(e.ip);
      if (e.database) map[acct].databases.add(e.database);
      if (e.method) map[acct].methods.add(e.method);
    });
    return Object.values(map)
      .map(d => ({ ...d, ips: Array.from(d.ips), databases: Array.from(d.databases), methods: Array.from(d.methods) }))
      .sort((a, b) => b.requests - a.requests);
  }, [entries]);

  // Database breakdown
  const dbSummary = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const db = e.database || 'Unknown';
      if (!map[db]) map[db] = { database: db, requests: 0, errors: 0, accounts: new Set(), ips: new Set(), methods: new Set() };
      map[db].requests++;
      if (e.level === 'ERROR') map[db].errors++;
      if (e.account) map[db].accounts.add(e.account);
      if (e.ip) map[db].ips.add(e.ip);
      if (e.method) map[db].methods.add(e.method);
    });
    return Object.values(map)
      .map(d => ({ ...d, accounts: Array.from(d.accounts), ips: Array.from(d.ips), methods: Array.from(d.methods) }))
      .sort((a, b) => b.requests - a.requests);
  }, [entries]);

  const methodBreakdown = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const m = e.method || 'Unknown';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [entries]);

  const errorCodeBreakdown = useMemo(() => {
    const map = {};
    entries.filter(e => e.errorCode > 0).forEach(e => {
      const key = e.errorCode;
      if (!map[key]) map[key] = { code: key, count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [entries]);

  const columns = [
    { key: 'timestamp', label: 'Timestamp', accessor: 'timestamp', render: (v) => <span className="whitespace-nowrap font-mono text-[11px]">{formatTimestamp(v)}</span> },
    { key: 'level', label: 'Level', accessor: 'level',
      render: (v) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${v === 'ERROR' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'}`}>{v}</span>
    },
    { key: 'errorCode', label: 'Error', accessor: 'errorCode' },
    { key: 'method', label: 'Method', accessor: 'method', render: (v) => <span className="font-mono font-medium">{v}</span> },
    { key: 'endpoint', label: 'Endpoint', accessor: 'endpoint', render: (v) => <span className="font-mono text-[11px] max-w-md truncate block">{v}</span> },
    { key: 'ip', label: 'IP', accessor: 'ip', render: (v) => <span className="font-mono">{v}</span> },
    { key: 'account', label: 'Account', accessor: 'account' },
    { key: 'database', label: 'Database', accessor: 'database' },
    { key: 'usage', label: 'Usage', accessor: 'usage' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Requests" value={stats.total.toLocaleString()} color="blue" icon={Globe}
          onClick={() => { setFilterLevel('all'); setDetailPanel(null); setFilterValue(null); }} active={filterLevel === 'all' && !detailPanel} />
        <StatCard label="Errors" value={stats.errors.toLocaleString()} color="red" icon={AlertCircle}
          onClick={() => { setFilterLevel(filterLevel === 'ERROR' ? 'all' : 'ERROR'); setDetailPanel(null); setFilterValue(null); }} active={filterLevel === 'ERROR'} />
        <StatCard label="Unique IPs" value={stats.uniqueIPs} color="violet" icon={Activity}
          onClick={() => { setDetailPanel(detailPanel === 'ips' ? null : 'ips'); setFilterValue(null); }} active={detailPanel === 'ips'} />
        <StatCard label="Accounts" value={stats.uniqueAccounts} color="emerald" icon={Users}
          onClick={() => { setDetailPanel(detailPanel === 'accounts' ? null : 'accounts'); setFilterValue(null); }} active={detailPanel === 'accounts'} />
        <StatCard label="Databases" value={stats.uniqueDBs} color="cyan" icon={Database}
          onClick={() => { setDetailPanel(detailPanel === 'databases' ? null : 'databases'); setFilterValue(null); }} active={detailPanel === 'databases'} />
      </div>

      {/* IP Detail Panel */}
      {detailPanel === 'ips' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">IP Address Breakdown</h3>
            <button onClick={() => { setDetailPanel(null); setFilterValue(null); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          {filterValue && (
            <div className="mb-3 flex items-center gap-2 text-xs">
              <span className="text-gray-500">Filtering table by IP:</span>
              <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-mono font-medium">{filterValue}</span>
              <button onClick={() => setFilterValue(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[10px] underline">clear</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-1.5 pr-4">IP Address</th>
                  <th className="pb-1.5 pr-4">Requests</th>
                  <th className="pb-1.5 pr-4">Errors</th>
                  <th className="pb-1.5 pr-4">Accounts</th>
                  <th className="pb-1.5 pr-4">Databases</th>
                  <th className="pb-1.5">Methods</th>
                </tr>
              </thead>
              <tbody>
                {ipSummary.map(d => (
                  <tr
                    key={d.ip}
                    onClick={() => setFilterValue(filterValue === d.ip ? null : d.ip)}
                    className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${filterValue === d.ip ? 'bg-violet-50 dark:bg-violet-900/20' : ''}`}
                  >
                    <td className="py-1.5 pr-4 font-mono font-medium text-gray-700 dark:text-gray-200">{d.ip}</td>
                    <td className="py-1.5 pr-4">{d.requests.toLocaleString()}</td>
                    <td className="py-1.5 pr-4 text-red-600 dark:text-red-400">{d.errors || '-'}</td>
                    <td className="py-1.5 pr-4 text-emerald-600 dark:text-emerald-400">{d.accounts.join(', ') || '-'}</td>
                    <td className="py-1.5 pr-4">{d.databases.join(', ') || '-'}</td>
                    <td className="py-1.5 text-gray-500">{d.methods.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Click a row to filter the main table by that IP address.</p>
        </div>
      )}

      {/* Account Detail Panel */}
      {detailPanel === 'accounts' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Account Breakdown</h3>
            <button onClick={() => { setDetailPanel(null); setFilterValue(null); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          {filterValue && (
            <div className="mb-3 flex items-center gap-2 text-xs">
              <span className="text-gray-500">Filtering table by account:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">{filterValue}</span>
              <button onClick={() => setFilterValue(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[10px] underline">clear</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-1.5 pr-4">Account</th>
                  <th className="pb-1.5 pr-4">Requests</th>
                  <th className="pb-1.5 pr-4">Errors</th>
                  <th className="pb-1.5 pr-4">IPs</th>
                  <th className="pb-1.5 pr-4">Databases</th>
                  <th className="pb-1.5">Methods</th>
                </tr>
              </thead>
              <tbody>
                {accountSummary.map(d => (
                  <tr
                    key={d.account}
                    onClick={() => setFilterValue(filterValue === d.account ? null : d.account)}
                    className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${filterValue === d.account ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                  >
                    <td className="py-1.5 pr-4 font-medium text-gray-700 dark:text-gray-200">{d.account}</td>
                    <td className="py-1.5 pr-4">{d.requests.toLocaleString()}</td>
                    <td className="py-1.5 pr-4 text-red-600 dark:text-red-400">{d.errors || '-'}</td>
                    <td className="py-1.5 pr-4 font-mono text-gray-500">{d.ips.join(', ') || '-'}</td>
                    <td className="py-1.5 pr-4">{d.databases.join(', ') || '-'}</td>
                    <td className="py-1.5 text-gray-500">{d.methods.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Click a row to filter the main table by that account.</p>
        </div>
      )}

      {/* Database Detail Panel */}
      {detailPanel === 'databases' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Database Breakdown</h3>
            <button onClick={() => { setDetailPanel(null); setFilterValue(null); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          {filterValue && (
            <div className="mb-3 flex items-center gap-2 text-xs">
              <span className="text-gray-500">Filtering table by database:</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-medium">{filterValue}</span>
              <button onClick={() => setFilterValue(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[10px] underline">clear</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-1.5 pr-4">Database</th>
                  <th className="pb-1.5 pr-4">Requests</th>
                  <th className="pb-1.5 pr-4">Errors</th>
                  <th className="pb-1.5 pr-4">Accounts</th>
                  <th className="pb-1.5 pr-4">IPs</th>
                  <th className="pb-1.5">Methods</th>
                </tr>
              </thead>
              <tbody>
                {dbSummary.map(d => (
                  <tr
                    key={d.database}
                    onClick={() => setFilterValue(filterValue === d.database ? null : d.database)}
                    className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${filterValue === d.database ? 'bg-cyan-50 dark:bg-cyan-900/20' : ''}`}
                  >
                    <td className="py-1.5 pr-4 font-medium text-gray-700 dark:text-gray-200">{d.database}</td>
                    <td className="py-1.5 pr-4">{d.requests.toLocaleString()}</td>
                    <td className="py-1.5 pr-4 text-red-600 dark:text-red-400">{d.errors || '-'}</td>
                    <td className="py-1.5 pr-4 text-emerald-600 dark:text-emerald-400">{d.accounts.join(', ') || '-'}</td>
                    <td className="py-1.5 pr-4 font-mono text-gray-500">{d.ips.join(', ') || '-'}</td>
                    <td className="py-1.5 text-gray-500">{d.methods.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Click a row to filter the main table by that database.</p>
        </div>
      )}

      {/* Charts — hidden when a filter or detail panel is active */}
      {filterLevel === 'all' && !detailPanel && (
      <div className="grid md:grid-cols-2 gap-4">
        {methodBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">HTTP Method Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={methodBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {methodBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {errorCodeBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Error Codes</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={errorCodeBreakdown.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="code" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      )}

      <DataTable
        data={(() => {
          let data = entries;
          if (filterLevel !== 'all') data = data.filter(e => e.level === filterLevel);
          if (filterValue && detailPanel === 'ips') data = data.filter(e => e.ip === filterValue);
          if (filterValue && detailPanel === 'accounts') data = data.filter(e => e.account === filterValue);
          if (filterValue && detailPanel === 'databases') data = data.filter(e => e.database === filterValue);
          return data;
        })()}
        columns={columns}
        title="Data API Log"
        exportFilename="fmdapi.csv"
        defaultSortKey="timestamp"
        defaultSortDir="desc"
      />
    </div>
  );
}
