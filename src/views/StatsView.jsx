import { useMemo } from 'react';
import { Server, Database, Users, Activity, HardDrive, AlertTriangle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatTimestamp } from '../utils/dateUtils.js';

export default function StatsView({ entries }) {
  const chartData = useMemo(() =>
    entries.map(e => ({
      ...e,
      time: e.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      elapsedMs: (e.elapsedTimePerCall || 0) / 1000,
      waitMs: (e.waitTimePerCall || 0) / 1000,
      ioMs: (e.ioTimePerCall || 0) / 1000,
      totalClients: (e.proClients || 0) + (e.goClients || 0) + (e.webDirectClients || 0) + (e.odbcClients || 0) + (e.customWebClients || 0),
    })),
  [entries]);

  const stats = useMemo(() => {
    if (entries.length === 0) return {};
    const last = entries[entries.length - 1];
    let maxClients = 0, maxCalls = 0, avgCache = 0;
    entries.forEach(e => {
      const total = (e.proClients || 0) + (e.goClients || 0) + (e.webDirectClients || 0) + (e.odbcClients || 0);
      if (total > maxClients) maxClients = total;
      if (e.remoteCallsSec > maxCalls) maxCalls = e.remoteCallsSec;
      avgCache += e.cacheHitPct || 0;
    });
    avgCache = entries.length > 0 ? (avgCache / entries.length).toFixed(1) : 0;
    return {
      lastProClients: last.proClients || 0,
      lastOpenDbs: last.openDatabases || 0,
      maxClients,
      maxCallsSec: maxCalls,
      avgCacheHit: avgCache,
      intervals: entries.length,
    };
  }, [entries]);

  // Server health assessment based on common FMS best practices
  const healthChecks = useMemo(() => {
    if (entries.length === 0) return [];
    const checks = [];

    // Cache hit ratio — per expert guidance, must be 100% or extremely close
    const avgCache = entries.reduce((sum, e) => sum + (e.cacheHitPct || 0), 0) / entries.length;
    const minCache = Math.min(...entries.map(e => e.cacheHitPct || 0));
    if (avgCache < 95) {
      checks.push({ severity: 'error', label: 'Low cache hit ratio', detail: `Average ${avgCache.toFixed(1)}% (min: ${minCache.toFixed(1)}%) — must be close to 100%. Incrementally increase the database cache in Admin Console (e.g., 512MB to 1GB) until it returns to 100%. Any cache beyond what is needed for 100% is wasted memory.` });
    } else if (avgCache < 99) {
      checks.push({ severity: 'warning', label: 'Cache hit ratio below target', detail: `Average ${avgCache.toFixed(1)}% — target is 100%. Even a small drop increases disk I/O. Increase the database cache size incrementally.` });
    } else {
      checks.push({ severity: 'ok', label: 'Cache hit ratio healthy', detail: `Average ${avgCache.toFixed(1)}% — disk cache is working efficiently.` });
    }

    // Remote Calls in Progress — should be 0-2, 5+ means server is struggling
    const rcipValues = entries.map(e => e.remoteCallsInProgress || 0);
    const maxRCIP = Math.max(...rcipValues);
    const highRCIPCount = rcipValues.filter(v => v >= 5).length;
    if (maxRCIP >= 5) {
      checks.push({
        severity: highRCIPCount > entries.length * 0.1 ? 'error' : 'warning',
        label: 'High Remote Calls in Progress',
        detail: `Peak: ${maxRCIP} (${highRCIPCount} intervals at 5+). Normal is 0-2. When this reaches 5+, the server is struggling to process requests — clients will experience delays. High Wait Time in the call breakdown indicates processor overload or exclusive lock contention.`,
      });
    } else if (maxRCIP >= 3) {
      checks.push({ severity: 'info', label: 'Remote Calls in Progress: moderate', detail: `Peak: ${maxRCIP}. Normal range (0-2), approaching threshold. Monitor for increases.` });
    }

    // Elapsed time per call — primary health indicator
    const elapsedValues = entries.map(e => e.elapsedTimePerCall || 0).filter(v => v > 0);
    if (elapsedValues.length > 0) {
      const avgElapsed = elapsedValues.reduce((a, b) => a + b, 0) / elapsedValues.length;
      const maxElapsed = Math.max(...elapsedValues);
      if (maxElapsed > avgElapsed * 5 && maxElapsed > 50000) {
        checks.push({ severity: 'warning', label: 'Elapsed time spikes detected', detail: `Peak ${(maxElapsed / 1000).toFixed(0)}ms vs avg ${(avgElapsed / 1000).toFixed(1)}ms per call. Elapsed Time per Call is the primary server health indicator. Check TopCallStats during spike periods for specific slow operations.` });
      }
    }

    // Collection interval analysis
    if (entries.length >= 2) {
      const intervals = [];
      for (let i = 1; i < Math.min(entries.length, 100); i++) {
        const diff = entries[i].timestamp - entries[i - 1].timestamp;
        if (diff > 0) intervals.push(diff);
      }
      if (intervals.length > 0) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const intervalMin = Math.round(avgInterval / 60000);
        if (intervalMin >= 1) {
          checks.push({ severity: 'info', label: `Collection interval: ~${intervalMin} min`, detail: intervalMin > 5 ? 'Consider reducing to 1-5 minute intervals for better granularity during troubleshooting.' : 'Good interval for performance monitoring.' });
        }
      }
    }

    // Data coverage check
    if (entries.length >= 2) {
      const firstTs = entries[0].timestamp;
      const lastTs = entries[entries.length - 1].timestamp;
      const daysCovered = (lastTs - firstTs) / (1000 * 60 * 60 * 24);
      if (daysCovered < 14) {
        checks.push({ severity: 'info', label: `Data covers ${daysCovered.toFixed(1)} days`, detail: 'For cyclical businesses, ensure you capture peak-load periods (month-end, quarterly reporting). Two weeks is the minimum recommended for meaningful performance baselining.' });
      }
    }

    return checks;
  }, [entries]);

  const columns = [
    { key: 'timestamp', label: 'Timestamp', accessor: 'timestamp', render: (v) => <span className="whitespace-nowrap font-mono text-[11px]">{formatTimestamp(v)}</span> },
    { key: 'proClients', label: 'Pro', accessor: 'proClients' },
    { key: 'goClients', label: 'Go', accessor: 'goClients' },
    { key: 'webDirectClients', label: 'WebDirect', accessor: 'webDirectClients' },
    { key: 'odbcClients', label: 'ODBC/JDBC', accessor: 'odbcClients' },
    { key: 'openDatabases', label: 'Open DBs', accessor: 'openDatabases' },
    { key: 'remoteCallsSec', label: 'Calls/sec', accessor: 'remoteCallsSec' },
    { key: 'remoteCallsInProgress', label: 'In Progress', accessor: 'remoteCallsInProgress', render: (v) => {
      const cls = v >= 5 ? 'text-red-600 dark:text-red-400 font-semibold' : v >= 3 ? 'text-amber-600 dark:text-amber-400 font-medium' : '';
      return <span className={cls}>{v}</span>;
    }},
    { key: 'cacheHitPct', label: 'Cache %', accessor: 'cacheHitPct', render: (v) => {
      const cls = v < 95 ? 'text-red-600 dark:text-red-400 font-semibold' : v < 99 ? 'text-amber-600 dark:text-amber-400' : '';
      return <span className={cls}>{v}%</span>;
    }},
    { key: 'networkKBSecIn', label: 'Net In KB/s', accessor: 'networkKBSecIn' },
    { key: 'networkKBSecOut', label: 'Net Out KB/s', accessor: 'networkKBSecOut' },
    { key: 'diskKBSecRead', label: 'Disk Read KB/s', accessor: 'diskKBSecRead' },
    { key: 'diskKBSecWritten', label: 'Disk Write KB/s', accessor: 'diskKBSecWritten' },
    { key: 'elapsedTimePerCall', label: 'Elapsed/call µs', accessor: 'elapsedTimePerCall' },
    { key: 'ioTimePerCall', label: 'I/O/call µs', accessor: 'ioTimePerCall' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Pro Clients (Last)" value={stats.lastProClients} color="blue" icon={Users} />
        <StatCard label="Open Databases" value={stats.lastOpenDbs} color="cyan" icon={Database} />
        <StatCard label="Max Clients" value={stats.maxClients} color="violet" icon={Users} />
        <StatCard label="Max Calls/sec" value={stats.maxCallsSec} color="amber" icon={Activity} />
        <StatCard label="Avg Cache Hit" value={`${stats.avgCacheHit}%`} color="emerald" icon={Server} />
        <StatCard label="Intervals" value={stats.intervals?.toLocaleString()} color="gray" icon={Activity} />
      </div>

      {/* Server Health Assessment */}
      {healthChecks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Server Health Assessment</h3>
          </div>
          <div className="space-y-2">
            {healthChecks.map((check, i) => (
              <div key={i} className={`flex items-start gap-2.5 text-xs rounded-lg px-3 py-2 ${
                check.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                check.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                check.severity === 'ok' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                'bg-blue-50 dark:bg-blue-900/20'
              }`}>
                {check.severity === 'error' ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" /> :
                 check.severity === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> :
                 <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{check.label}</span>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Tip: Use Stats.log as an overview, then drill into ClientStats.log to identify which clients are driving load,
            and TopCallStats.log to find the specific expensive operations.
          </p>
        </div>
      )}

      {/* Client count over time */}
      {chartData.length > 1 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Connected Clients Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="proClients" name="Pro" stackId="1" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.5} />
              <Area type="monotone" dataKey="goClients" name="Go" stackId="1" fill="#10b981" stroke="#10b981" fillOpacity={0.5} />
              <Area type="monotone" dataKey="webDirectClients" name="WebDirect" stackId="1" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.5} />
              <Area type="monotone" dataKey="odbcClients" name="ODBC/JDBC" stackId="1" fill="#8b5cf6" stroke="#8b5cf6" fillOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance over time */}
      <div className="grid md:grid-cols-2 gap-4">
        {chartData.length > 1 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Performance per Call</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} label={{ value: 'ms', position: 'insideLeft', offset: -5, style: { fontSize: 10 } }} />
                <Tooltip formatter={(v) => [`${v.toFixed(1)} ms`]} labelStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="elapsedMs" name="Elapsed" stroke="#ef4444" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="ioMs" name="I/O" stroke="#06b6d4" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="waitMs" name="Wait" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length > 1 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Disk I/O</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} label={{ value: 'KB/s', position: 'insideLeft', offset: -5, style: { fontSize: 10 } }} />
                <Tooltip labelStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="diskKBSecRead" name="Read" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="diskKBSecWritten" name="Written" stroke="#10b981" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Data table */}
      <DataTable
        data={entries}
        columns={columns}
        title="Server Statistics"
        exportFilename="server-stats.csv"
        defaultSortKey="timestamp"
        defaultSortDir="desc"
      />
    </div>
  );
}
