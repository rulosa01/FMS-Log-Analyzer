import { useState, useMemo } from 'react';
import { Users, Database, Shield, Wifi, Monitor } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatTimestamp } from '../utils/dateUtils.js';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export default function AccessLogView({ entries }) {
  const [filterAction, setFilterAction] = useState('all');

  // User activity summary
  const userStats = useMemo(() => {
    const map = Object.create(null);
    entries.forEach(e => {
      if (!e.clientName) return;
      // Normalize client name by removing the session number suffix
      const baseName = e.clientName.replace(/\s+\d+$/, '').replace(/\s*\([^)]+\)$/, '');
      if (!map[baseName]) map[baseName] = { name: baseName, connections: 0, dbOpens: 0, databases: new Set(), denied: 0, firstSeen: e.timestamp, lastSeen: e.timestamp };
      if (e.action === 'connect') map[baseName].connections++;
      if (e.action === 'open_db') {
        map[baseName].dbOpens++;
        if (e.database) map[baseName].databases.add(e.database);
      }
      if (e.action === 'denied') map[baseName].denied++;
      if (e.timestamp < map[baseName].firstSeen) map[baseName].firstSeen = e.timestamp;
      if (e.timestamp > map[baseName].lastSeen) map[baseName].lastSeen = e.timestamp;
    });
    return Object.values(map).map(u => ({
      ...u,
      databases: u.databases.size,
      databaseList: Array.from(u.databases),
    })).sort((a, b) => b.connections - a.connections);
  }, [entries]);

  // Client type breakdown
  const clientTypeBreakdown = useMemo(() => {
    const map = Object.create(null);
    entries.filter(e => e.action === 'connect').forEach(e => {
      let type = 'Unknown';
      if (e.appVersion) {
        if (/fmapp/i.test(e.appVersion)) type = 'FileMaker Pro';
        else if (/fmreauthapp/i.test(e.appVersion)) type = 'FileMaker Pro (reauth)';
        else if (/WebDirect/i.test(e.appVersion)) type = 'WebDirect';
        else if (/ODBC|JDBC|xDBC/i.test(e.appVersion)) type = 'ODBC/JDBC';
        else if (/Data API/i.test(e.appVersion)) type = 'Data API';
        else type = e.appVersion;
      }
      if (e.clientType === 'FileMaker Script') type = 'Server Script';
      map[type] = (map[type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [entries]);

  // Database popularity
  const dbPopularity = useMemo(() => {
    const map = Object.create(null);
    entries.filter(e => e.action === 'open_db' && e.database).forEach(e => {
      if (!map[e.database]) map[e.database] = { name: e.database, opens: 0, users: new Set() };
      map[e.database].opens++;
      if (e.accountName) map[e.database].users.add(e.accountName);
    });
    return Object.values(map).map(d => ({
      ...d,
      users: d.users.size,
    })).sort((a, b) => b.opens - a.opens);
  }, [entries]);

  // Denied connections
  const deniedEntries = useMemo(() =>
    entries.filter(e => e.action === 'denied'),
  [entries]);

  const stats = useMemo(() => ({
    totalEntries: entries.length,
    uniqueUsers: userStats.length,
    totalConnections: entries.filter(e => e.action === 'connect').length,
    deniedCount: deniedEntries.length,
    uniqueDatabases: new Set(entries.filter(e => e.database).map(e => e.database)).size,
  }), [entries, userStats, deniedEntries]);

  const filtered = useMemo(() => {
    if (filterAction === 'all') return entries;
    return entries.filter(e => e.action === filterAction);
  }, [entries, filterAction]);

  const columns = [
    {
      key: 'timestamp', label: 'Timestamp', accessor: 'timestamp',
      render: (val) => <span className="whitespace-nowrap font-mono text-[11px]">{formatTimestamp(val)}</span>,
    },
    {
      key: 'action', label: 'Action', accessor: 'action',
      render: (val) => {
        const styles = {
          connect: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
          disconnect: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
          open_db: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
          close_db: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
          denied: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
        };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[val] || ''}`}>{val}</span>;
      },
    },
    { key: 'clientName', label: 'Client', accessor: 'clientName', render: (val) => <span className="max-w-xs truncate block">{val}</span> },
    { key: 'database', label: 'Database', accessor: 'database' },
    { key: 'accountName', label: 'Account', accessor: 'accountName' },
    {
      key: 'description', label: 'Description', accessor: 'description',
      render: (val) => <span className="max-w-md truncate block">{val}</span>,
      className: 'max-w-md',
    },
  ];

  const userColumns = [
    { key: 'name', label: 'User / Client', accessor: 'name' },
    { key: 'connections', label: 'Connections', accessor: 'connections' },
    { key: 'dbOpens', label: 'DB Opens', accessor: 'dbOpens' },
    { key: 'databases', label: 'Unique DBs', accessor: 'databases' },
    { key: 'denied', label: 'Denied', accessor: 'denied', render: (v) => v > 0 ? <span className="text-red-500 font-medium">{v}</span> : '-' },
    { key: 'firstSeen', label: 'First Seen', accessor: 'firstSeen', render: (val) => <span className="font-mono text-[11px]">{formatTimestamp(val)}</span> },
    { key: 'lastSeen', label: 'Last Seen', accessor: 'lastSeen', render: (val) => <span className="font-mono text-[11px]">{formatTimestamp(val)}</span> },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Entries" value={stats.totalEntries.toLocaleString()} color="blue" icon={Wifi}
          onClick={() => setFilterAction('all')} active={filterAction === 'all'} />
        <StatCard label="Unique Users" value={stats.uniqueUsers} color="emerald" icon={Users} />
        <StatCard label="Connections" value={stats.totalConnections.toLocaleString()} color="violet" icon={Monitor}
          onClick={() => setFilterAction(filterAction === 'connect' ? 'all' : 'connect')} active={filterAction === 'connect'} />
        <StatCard label="Databases" value={stats.uniqueDatabases} color="cyan" icon={Database}
          onClick={() => setFilterAction(filterAction === 'open_db' ? 'all' : 'open_db')} active={filterAction === 'open_db'} />
        <StatCard label="Denied" value={stats.deniedCount} color="red" icon={Shield}
          onClick={() => setFilterAction(filterAction === 'denied' ? 'all' : 'denied')} active={filterAction === 'denied'} />
      </div>

      {/* Charts + User Activity — hidden when a stat card filter is active */}
      {filterAction === 'all' && (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {clientTypeBreakdown.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Client Type Breakdown</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={clientTypeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {clientTypeBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {dbPopularity.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Top Databases by Opens</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dbPopularity.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="opens" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <DataTable
            data={userStats}
            columns={userColumns}
            title="User Activity Summary"
            exportFilename="access-users.csv"
            defaultSortKey="connections"
          />
        </>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Action:</span>
        {['all', 'connect', 'disconnect', 'open_db', 'close_db', 'denied'].map(a => (
          <button
            key={a}
            onClick={() => setFilterAction(a)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              filterAction === a
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {a === 'all' ? 'All' : a.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Active filter indicator */}
      {filterAction !== 'all' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            Showing: {filterAction.replace(/_/g, ' ')}
          </span>
          <span className="text-blue-400 dark:text-blue-500">
            ({filtered.length.toLocaleString()} of {entries.length.toLocaleString()})
          </span>
          <button
            onClick={() => setFilterAction('all')}
            className="ml-auto text-xs text-blue-500 hover:text-blue-600 font-medium"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Main table */}
      <DataTable
        data={filtered}
        columns={columns}
        title="Access Log Entries"
        exportFilename="access-log.csv"
        defaultSortKey="timestamp"
        defaultSortDir="desc"
      />
    </div>
  );
}
