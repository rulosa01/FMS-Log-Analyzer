import { useState, useMemo } from 'react';
import { Zap, Clock, HardDrive, Users, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatTimestamp, formatDuration, formatBytes } from '../utils/dateUtils.js';
import { parseTarget } from '../parsers/topCallStatsParser.js';

// Performance thresholds based on Soliant/Claris best practices
const SLOW_CALL_THRESHOLD_US = 250000; // 250ms — calls above this are "slow"
const VERY_SLOW_CALL_THRESHOLD_US = 1000000; // 1s — calls above this are "very slow"

export default function TopCallStatsView({ entries }) {
  const [filterOperation, setFilterOperation] = useState('all');
  const [sortOverride, setSortOverride] = useState(null);

  // Operation breakdown
  const operationStats = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const op = e.operation || 'Unknown';
      if (!map[op]) map[op] = { operation: op, count: 0, totalElapsed: 0, totalWait: 0, totalIO: 0, maxElapsed: 0 };
      map[op].count++;
      map[op].totalElapsed += e.elapsedTime || 0;
      map[op].totalWait += e.waitTime || 0;
      map[op].totalIO += e.ioTime || 0;
      if (e.elapsedTime > map[op].maxElapsed) map[op].maxElapsed = e.elapsedTime;
    });
    return Object.values(map).sort((a, b) => b.totalElapsed - a.totalElapsed);
  }, [entries]);

  // Client hotspots
  const clientHotspots = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const name = e.clientName || 'Unknown';
      if (!map[name]) map[name] = { client: name, count: 0, totalElapsed: 0, maxElapsed: 0 };
      map[name].count++;
      map[name].totalElapsed += e.elapsedTime || 0;
      if (e.elapsedTime > map[name].maxElapsed) map[name].maxElapsed = e.elapsedTime;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [entries]);

  // Target analysis
  const targetStats = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const { database, object } = parseTarget(e.target);
      const key = e.target || 'Unknown';
      if (!map[key]) map[key] = { target: key, database, object, count: 0, totalElapsed: 0 };
      map[key].count++;
      map[key].totalElapsed += e.elapsedTime || 0;
    });
    return Object.values(map).sort((a, b) => b.totalElapsed - a.totalElapsed);
  }, [entries]);

  // Time series data — aggregate by timestamp (collection interval)
  const timeSeriesData = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const key = e.timestampRaw;
      if (!map[key]) map[key] = { timestamp: e.timestamp, maxElapsed: 0, totalElapsed: 0, count: 0, maxWait: 0, maxIO: 0 };
      map[key].count++;
      map[key].totalElapsed += e.elapsedTime || 0;
      if (e.elapsedTime > map[key].maxElapsed) map[key].maxElapsed = e.elapsedTime;
      if (e.waitTime > map[key].maxWait) map[key].maxWait = e.waitTime;
      if (e.ioTime > map[key].maxIO) map[key].maxIO = e.ioTime;
    });
    return Object.values(map)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(d => ({
        ...d,
        time: d.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        maxElapsedMs: d.maxElapsed / 1000,
        avgElapsedMs: d.count > 0 ? d.totalElapsed / d.count / 1000 : 0,
        maxWaitMs: d.maxWait / 1000,
        maxIOMs: d.maxIO / 1000,
      }));
  }, [entries]);

  // Heatmap data: hour of day vs day of week
  const heatmapData = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    entries.forEach(e => {
      if (!e.timestamp) return;
      const day = e.timestamp.getDay();
      const hour = e.timestamp.getHours();
      grid[day][hour] += e.elapsedTime || 0;
    });
    return grid;
  }, [entries]);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const heatmapMax = useMemo(() => {
    let max = 0;
    heatmapData.forEach(row => row.forEach(v => { if (v > max) max = v; }));
    return max || 1;
  }, [heatmapData]);

  const globalStats = useMemo(() => {
    let totalElapsed = 0, maxElapsed = 0, totalWait = 0, totalIO = 0;
    entries.forEach(e => {
      totalElapsed += e.elapsedTime || 0;
      if (e.elapsedTime > maxElapsed) maxElapsed = e.elapsedTime;
      totalWait += e.waitTime || 0;
      totalIO += e.ioTime || 0;
    });
    return {
      totalEntries: entries.length,
      avgElapsed: entries.length > 0 ? totalElapsed / entries.length : 0,
      maxElapsed,
      totalWait,
      totalIO,
      uniqueClients: clientHotspots.length,
    };
  }, [entries, clientHotspots]);

  // Performance insights based on industry best practices
  const performanceInsights = useMemo(() => {
    const slowCalls = entries.filter(e => e.elapsedTime >= SLOW_CALL_THRESHOLD_US);
    const verySlowCalls = entries.filter(e => e.elapsedTime >= VERY_SLOW_CALL_THRESHOLD_US);

    // Categorize where time is spent: Elapsed = Wait + I/O + Processing
    let totalWait = 0, totalIO = 0, totalElapsed = 0;
    entries.forEach(e => {
      totalWait += e.waitTime || 0;
      totalIO += e.ioTime || 0;
      totalElapsed += e.elapsedTime || 0;
    });
    const totalProcessing = Math.max(0, totalElapsed - totalWait - totalIO);

    const timeBreakdown = [
      { name: 'Wait Time', value: totalWait, description: 'Record locking & contention' },
      { name: 'I/O Time', value: totalIO, description: 'Disk reads & writes' },
      { name: 'Processing', value: totalProcessing, description: 'CPU / network / other' },
    ].filter(d => d.value > 0);

    // Identify the dominant bottleneck
    let bottleneck = 'processing';
    if (totalWait > totalIO && totalWait > totalProcessing) bottleneck = 'wait';
    else if (totalIO > totalWait && totalIO > totalProcessing) bottleneck = 'io';

    const bottleneckAdvice = {
      wait: 'High wait time indicates record locking contention. Common causes: long-running scripts holding locks, unstored calculations on related data, users editing the same records, or a "funnel table" architecture where all tables in a single file create an exclusive-lock bottleneck — even with multiple CPU cores, writes to a busy global table (e.g., audit log) are serialized.',
      io: 'High I/O time suggests disk bottlenecks. Consider adding RAM for a larger database cache (target 100% cache hit), moving to SSD/NVMe storage, or optimizing finds/sorts on unindexed fields.',
      processing: 'Processing time includes network overhead and CPU work. Check for complex calculations, large record sets being transferred, or wide-column layouts (too many fields forces multiple client-server round trips per record, amplifying latency).',
    };

    return {
      slowCalls: slowCalls.length,
      verySlowCalls: verySlowCalls.length,
      slowCallPct: entries.length > 0 ? ((slowCalls.length / entries.length) * 100).toFixed(1) : 0,
      timeBreakdown,
      bottleneck,
      bottleneckAdvice: bottleneckAdvice[bottleneck],
    };
  }, [entries]);

  const BREAKDOWN_COLORS = ['#f59e0b', '#06b6d4', '#8b5cf6'];

  const filtered = useMemo(() => {
    if (filterOperation === 'all') return entries;
    return entries.filter(e => e.operation === filterOperation);
  }, [entries, filterOperation]);

  const operations = useMemo(() => {
    const ops = new Set(entries.map(e => e.operation));
    return ['all', ...Array.from(ops).sort()];
  }, [entries]);

  const columns = [
    {
      key: 'timestamp', label: 'Timestamp', accessor: 'timestamp',
      render: (val) => <span className="whitespace-nowrap font-mono text-[11px]">{formatTimestamp(val)}</span>,
    },
    { key: 'operation', label: 'Operation', accessor: 'operation',
      render: (val) => <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-medium">{val}</span> },
    { key: 'target', label: 'Target', accessor: 'target', render: (val) => <span className="font-mono text-[11px] max-w-xs truncate block">{val}</span> },
    { key: 'elapsedTime', label: 'Elapsed', accessor: 'elapsedTime', render: (val) => {
      const cls = val >= VERY_SLOW_CALL_THRESHOLD_US ? 'text-red-600 dark:text-red-400 font-semibold'
        : val >= SLOW_CALL_THRESHOLD_US ? 'text-amber-600 dark:text-amber-400 font-medium' : '';
      return <span className={cls}>{formatDuration(val)}</span>;
    }},
    { key: 'waitTime', label: 'Wait', accessor: 'waitTime', render: (val) => formatDuration(val) },
    { key: 'ioTime', label: 'I/O', accessor: 'ioTime', render: (val) => formatDuration(val) },
    { key: 'networkBytesIn', label: 'Net In', accessor: 'networkBytesIn', render: (val) => formatBytes(val) },
    { key: 'networkBytesOut', label: 'Net Out', accessor: 'networkBytesOut', render: (val) => formatBytes(val) },
    { key: 'clientName', label: 'Client', accessor: 'clientName', render: (val) => <span className="max-w-xs truncate block">{val}</span> },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Calls" value={globalStats.totalEntries.toLocaleString()} color="amber" icon={Zap}
          onClick={() => { setFilterOperation('all'); setSortOverride(null); }} active={filterOperation === 'all' && !sortOverride} />
        <StatCard label="Avg Elapsed" value={formatDuration(globalStats.avgElapsed)} color="blue" icon={Clock}
          onClick={() => setSortOverride(sortOverride === 'elapsedTime' ? null : 'elapsedTime')} active={sortOverride === 'elapsedTime'} />
        <StatCard label="Max Elapsed" value={formatDuration(globalStats.maxElapsed)} color="red" icon={Clock}
          onClick={() => setSortOverride(sortOverride === 'elapsedTime' ? null : 'elapsedTime')} active={sortOverride === 'elapsedTime'} />
        <StatCard label="Total Wait" value={formatDuration(globalStats.totalWait)} color="violet" icon={Clock}
          onClick={() => setSortOverride(sortOverride === 'waitTime' ? null : 'waitTime')} active={sortOverride === 'waitTime'} />
        <StatCard label="Total I/O" value={formatDuration(globalStats.totalIO)} color="cyan" icon={HardDrive}
          onClick={() => setSortOverride(sortOverride === 'ioTime' ? null : 'ioTime')} active={sortOverride === 'ioTime'} />
        <StatCard label="Unique Clients" value={globalStats.uniqueClients} color="emerald" icon={Users} />
      </div>

      {/* Analysis panels — hidden when a stat card filter/sort is active */}
      {filterOperation === 'all' && !sortOverride && (
        <>
          {/* Performance Insights */}
          {entries.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className={`border rounded-xl p-4 ${
                performanceInsights.verySlowCalls > 0
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : performanceInsights.slowCalls > 0
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {performanceInsights.slowCalls > 0
                    ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    : <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Performance Analysis</h3>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Slow calls (&gt;250ms)</span>
                    <span className={`font-medium ${performanceInsights.slowCalls > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {performanceInsights.slowCalls.toLocaleString()} ({performanceInsights.slowCallPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Very slow calls (&gt;1s)</span>
                    <span className={`font-medium ${performanceInsights.verySlowCalls > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {performanceInsights.verySlowCalls.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Primary bottleneck</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200 capitalize">{performanceInsights.bottleneck === 'io' ? 'I/O' : performanceInsights.bottleneck === 'wait' ? 'Wait (locking)' : 'Processing'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  {performanceInsights.bottleneckAdvice}
                </p>
              </div>

              {performanceInsights.timeBreakdown.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Where Time is Spent</h3>
                  <p className="text-[10px] text-gray-400 mb-2">Elapsed = Wait + I/O + Processing</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={performanceInsights.timeBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {performanceInsights.timeBreakdown.map((_, i) => (
                          <Cell key={i} fill={BREAKDOWN_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [formatDuration(v)]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 text-[10px] text-gray-500 mt-1">
                    {performanceInsights.timeBreakdown.map((d, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BREAKDOWN_COLORS[i] }} />
                        {d.description}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Time Series Chart */}
          {timeSeriesData.length > 1 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Elapsed Time Trends</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: 'ms', position: 'insideLeft', offset: -5, style: { fontSize: 10 } }} />
                  <Tooltip formatter={(v) => [`${v.toFixed(1)} ms`]} labelStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="maxElapsedMs" name="Max Elapsed" stroke="#ef4444" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="avgElapsedMs" name="Avg Elapsed" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Operation Breakdown + Client Hotspots */}
          <div className="grid md:grid-cols-2 gap-4">
            {operationStats.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Operation Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={operationStats.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="operation" width={130} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [v.toLocaleString()]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="count" name="Count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {clientHotspots.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Client Hotspots (by appearance count)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={clientHotspots.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="client" width={160} tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(v) => [v.toLocaleString()]} />
                    <Bar dataKey="count" name="Appearances" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Expensive Calls Heatmap (Total Elapsed by Hour &amp; Day)</h3>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="px-1 py-1 text-gray-500 dark:text-gray-400" />
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} className="px-1 py-1 text-gray-400 font-normal w-6 text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, day) => (
                    <tr key={day}>
                      <td className="px-2 py-0.5 text-gray-500 dark:text-gray-400 font-medium">{dayLabels[day]}</td>
                      {row.map((val, hour) => {
                        const intensity = val / heatmapMax;
                        const r = Math.round(239 + (239 - 239) * intensity);
                        const g = Math.round(246 + (68 - 246) * intensity);
                        const b = Math.round(255 + (68 - 255) * intensity);
                        return (
                          <td
                            key={hour}
                            className="w-6 h-6 text-center"
                            title={`${dayLabels[day]} ${hour}:00 — ${formatDuration(val)} total`}
                            style={{
                              backgroundColor: val > 0 ? `rgb(${r},${g},${b})` : undefined,
                            }}
                          >
                            {val > 0 && <span className="text-[8px] text-white/80">{val > 1000000 ? `${(val / 1000000).toFixed(0)}s` : ''}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Target Analysis */}
          {targetStats.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <Target className="w-4 h-4 inline mr-1" />
                Top Targets by Total Elapsed Time
              </h3>
              <p className="text-xs text-gray-400 mb-3">Table IDs (e.g., table(138)) are internal FileMaker references. Use a DDR (Database Design Report) or tools like FMPerception to map these to actual table/layout names.</p>
              <div className="space-y-1">
                {targetStats.slice(0, 15).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1 border-b border-gray-100 dark:border-gray-700/50">
                    <span className="font-mono text-gray-500 w-6">{i + 1}</span>
                    <span className="font-mono text-gray-700 dark:text-gray-200 flex-1 truncate">{t.target || '(empty)'}</span>
                    <span className="text-gray-500">{t.count}x</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400 w-24 text-right">{formatDuration(t.totalElapsed)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Operation filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">Operation:</span>
        <select
          value={filterOperation}
          onChange={e => setFilterOperation(e.target.value)}
          className="text-xs px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          {operations.map(o => (
            <option key={o} value={o}>{o === 'all' ? 'All Operations' : o}</option>
          ))}
        </select>
      </div>

      {/* Active filter/sort indicator */}
      {(filterOperation !== 'all' || sortOverride) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {filterOperation !== 'all' ? `Showing: ${filterOperation}` : ''}
            {filterOperation !== 'all' && sortOverride ? ' | ' : ''}
            {sortOverride ? `Sorted by: ${sortOverride === 'elapsedTime' ? 'Elapsed Time' : sortOverride === 'waitTime' ? 'Wait Time' : 'I/O Time'}` : ''}
          </span>
          {filterOperation !== 'all' && (
            <span className="text-blue-400 dark:text-blue-500">
              ({filtered.length.toLocaleString()} of {entries.length.toLocaleString()})
            </span>
          )}
          <button
            onClick={() => { setFilterOperation('all'); setSortOverride(null); }}
            className="ml-auto text-xs text-blue-500 hover:text-blue-600 font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {/* Main table */}
      <DataTable
        key={sortOverride || 'default'}
        data={filtered}
        columns={columns}
        title="Top Call Statistics"
        exportFilename="topcallstats.csv"
        defaultSortKey={sortOverride || "elapsedTime"}
        defaultSortDir="desc"
      />
    </div>
  );
}
