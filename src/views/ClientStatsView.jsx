import { useMemo } from 'react';
import { Users, Wifi, Clock, HardDrive, Activity, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatTimestamp, formatDuration, formatBytes } from '../utils/dateUtils.js';

export default function ClientStatsView({ entries }) {
  // Aggregate per-client stats
  const clientSummary = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const name = e.clientName || 'Unknown';
      if (!map[name]) map[name] = {
        client: name, intervals: 0,
        totalBytesIn: 0, totalBytesOut: 0,
        totalCalls: 0, totalElapsed: 0,
        totalWait: 0, totalIO: 0,
        maxElapsed: 0, maxCalls: 0,
      };
      map[name].intervals++;
      map[name].totalBytesIn += e.networkBytesIn || 0;
      map[name].totalBytesOut += e.networkBytesOut || 0;
      map[name].totalCalls += e.remoteCalls || 0;
      map[name].totalElapsed += e.elapsedTime || 0;
      map[name].totalWait += e.waitTime || 0;
      map[name].totalIO += e.ioTime || 0;
      if (e.elapsedTime > map[name].maxElapsed) map[name].maxElapsed = e.elapsedTime;
      if (e.remoteCalls > map[name].maxCalls) map[name].maxCalls = e.remoteCalls;
    });
    return Object.values(map).sort((a, b) => b.totalElapsed - a.totalElapsed);
  }, [entries]);

  // Time series: per-interval totals
  const timeSeriesData = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const key = e.timestampRaw;
      if (!map[key]) map[key] = { timestamp: e.timestamp, totalCalls: 0, totalElapsed: 0, totalBytesIn: 0, totalBytesOut: 0 };
      map[key].totalCalls += e.remoteCalls || 0;
      map[key].totalElapsed += e.elapsedTime || 0;
      map[key].totalBytesIn += e.networkBytesIn || 0;
      map[key].totalBytesOut += e.networkBytesOut || 0;
    });
    return Object.values(map)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(d => ({
        ...d,
        time: d.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        elapsedMs: d.totalElapsed / 1000,
        bytesInKB: d.totalBytesIn / 1024,
        bytesOutKB: d.totalBytesOut / 1024,
      }));
  }, [entries]);

  // Anomaly detection — clients with elapsed > 2 stddev above mean
  const anomalies = useMemo(() => {
    if (clientSummary.length < 3) return [];
    const elapsed = clientSummary.map(c => c.totalElapsed);
    const mean = elapsed.reduce((a, b) => a + b, 0) / elapsed.length;
    const stddev = Math.sqrt(elapsed.reduce((a, b) => a + (b - mean) ** 2, 0) / elapsed.length);
    const threshold = mean + 2 * stddev;
    return clientSummary.filter(c => c.totalElapsed > threshold);
  }, [clientSummary]);

  const globalStats = useMemo(() => {
    let totalCalls = 0, totalBytes = 0, totalElapsed = 0;
    entries.forEach(e => {
      totalCalls += e.remoteCalls || 0;
      totalBytes += (e.networkBytesIn || 0) + (e.networkBytesOut || 0);
      totalElapsed += e.elapsedTime || 0;
    });
    return {
      totalEntries: entries.length,
      uniqueClients: clientSummary.length,
      totalCalls,
      totalBytes,
      totalElapsed,
    };
  }, [entries, clientSummary]);

  const summaryColumns = [
    { key: 'client', label: 'Client', accessor: 'client', render: (v) => <span className="max-w-xs truncate block">{v}</span> },
    { key: 'intervals', label: 'Intervals', accessor: 'intervals' },
    { key: 'totalCalls', label: 'Total Calls', accessor: 'totalCalls', render: (v) => v.toLocaleString() },
    { key: 'totalElapsed', label: 'Total Elapsed', accessor: 'totalElapsed', render: (v) => formatDuration(v) },
    { key: 'maxElapsed', label: 'Max Elapsed', accessor: 'maxElapsed', render: (v) => formatDuration(v) },
    { key: 'totalWait', label: 'Total Wait', accessor: 'totalWait', render: (v) => formatDuration(v) },
    { key: 'totalIO', label: 'Total I/O', accessor: 'totalIO', render: (v) => formatDuration(v) },
    { key: 'totalBytesIn', label: 'Bytes In', accessor: 'totalBytesIn', render: (v) => formatBytes(v) },
    { key: 'totalBytesOut', label: 'Bytes Out', accessor: 'totalBytesOut', render: (v) => formatBytes(v) },
  ];

  const rawColumns = [
    { key: 'timestamp', label: 'Timestamp', accessor: 'timestamp', render: (val) => <span className="whitespace-nowrap font-mono text-[11px]">{formatTimestamp(val)}</span> },
    { key: 'clientName', label: 'Client', accessor: 'clientName', render: (v) => <span className="max-w-xs truncate block">{v}</span> },
    { key: 'remoteCalls', label: 'Calls', accessor: 'remoteCalls', render: (v) => v.toLocaleString() },
    { key: 'elapsedTime', label: 'Elapsed', accessor: 'elapsedTime', render: (v) => formatDuration(v) },
    { key: 'waitTime', label: 'Wait', accessor: 'waitTime', render: (v) => formatDuration(v) },
    { key: 'ioTime', label: 'I/O', accessor: 'ioTime', render: (v) => formatDuration(v) },
    { key: 'networkBytesIn', label: 'Net In', accessor: 'networkBytesIn', render: (v) => formatBytes(v) },
    { key: 'networkBytesOut', label: 'Net Out', accessor: 'networkBytesOut', render: (v) => formatBytes(v) },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Intervals" value={globalStats.totalEntries.toLocaleString()} color="violet" icon={Activity} />
        <StatCard label="Unique Clients" value={globalStats.uniqueClients} color="emerald" icon={Users} />
        <StatCard label="Total Calls" value={globalStats.totalCalls.toLocaleString()} color="blue" icon={Wifi} />
        <StatCard label="Total Elapsed" value={formatDuration(globalStats.totalElapsed)} color="amber" icon={Clock} />
        <StatCard label="Total Network" value={formatBytes(globalStats.totalBytes)} color="cyan" icon={HardDrive} />
      </div>

      {/* Anomaly Alert */}
      {anomalies.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">Anomaly Detection: High Resource Consumers</h3>
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">These clients have total elapsed time more than 2 standard deviations above the mean:</p>
          <div className="space-y-1">
            {anomalies.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="font-medium text-amber-700 dark:text-amber-300 flex-1 truncate">{c.client}</span>
                <span className="text-amber-600">{formatDuration(c.totalElapsed)}</span>
                <span className="text-amber-500">({c.totalCalls.toLocaleString()} calls)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-client time breakdown: Wait vs I/O vs Processing for top clients */}
      {clientSummary.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Top Clients: Time Breakdown</h3>
          </div>
          <p className="text-[10px] text-gray-400 mb-3">Where each client&apos;s elapsed time is spent (wait = record locking, I/O = disk, processing = CPU/network)</p>
          <ResponsiveContainer width="100%" height={Math.min(clientSummary.slice(0, 8).length * 32 + 40, 300)}>
            <BarChart data={clientSummary.slice(0, 8).map(c => ({
              client: c.client,
              wait: c.totalWait / 1000,
              io: c.totalIO / 1000,
              processing: Math.max(0, (c.totalElapsed - c.totalWait - c.totalIO)) / 1000,
            }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" tick={{ fontSize: 10 }} label={{ value: 'ms', position: 'insideBottom', offset: -5, style: { fontSize: 10 } }} />
              <YAxis type="category" dataKey="client" width={150} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v) => [`${v.toFixed(0)} ms`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="wait" name="Wait (locking)" stackId="1" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="io" name="I/O (disk)" stackId="1" fill="#06b6d4" radius={[0, 0, 0, 0]} />
              <Bar dataKey="processing" name="Processing" stackId="1" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 mt-2">
            Tip: For the top consumers here, check TopCallStats.log filtered by client name to find the specific expensive operations.
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {timeSeriesData.length > 1 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Remote Calls Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip labelStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="totalCalls" name="Total Calls" stroke="#8b5cf6" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top clients by elapsed */}
        {clientSummary.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Top Resource Consumers</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={clientSummary.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="client" width={150} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v) => [formatDuration(v)]} />
                <Bar dataKey="totalElapsed" name="Total Elapsed" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Client Summary Table */}
      <DataTable
        data={clientSummary}
        columns={summaryColumns}
        title="Client Summary"
        exportFilename="client-summary.csv"
        defaultSortKey="totalElapsed"
      />

      {/* Raw Data Table */}
      <DataTable
        data={entries}
        columns={rawColumns}
        title="Raw Client Statistics"
        exportFilename="clientstats.csv"
        defaultSortKey="timestamp"
        defaultSortDir="desc"
      />
    </div>
  );
}
