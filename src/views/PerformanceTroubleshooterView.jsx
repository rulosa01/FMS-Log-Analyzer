import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Clock, Users, Zap, Activity, HardDrive, AlertTriangle,
  TrendingUp, ChevronRight, Target, Search,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceArea,
  PieChart, Pie, Cell,
} from 'recharts';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatTimestamp, formatDuration, formatBytes } from '../utils/dateUtils.js';

const BREAKDOWN_COLORS = ['#f59e0b', '#06b6d4', '#8b5cf6'];
const PIE_COLORS = ['#f59e0b', '#06b6d4', '#8b5cf6'];

export default function PerformanceTroubleshooterView({ filteredData }) {
  const statsEntries = useMemo(() => filteredData?.stats?.entries || [], [filteredData]);
  const clientStatsEntries = useMemo(() => filteredData?.clientstats?.entries || [], [filteredData]);
  const topCallStatsEntries = useMemo(() => filteredData?.topcallstats?.entries || [], [filteredData]);

  // --- State ---
  const [step, setStep] = useState(1);
  const [selectedTimeRange, setSelectedTimeRange] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectStart, setSelectStart] = useState(null);
  const [selectEnd, setSelectEnd] = useState(null);

  // Reset drill-down if data changes out from under us
  useEffect(() => {
    if (selectedTimeRange && statsEntries.length > 0) {
      const dataStart = statsEntries[0].timestamp;
      const dataEnd = statsEntries[statsEntries.length - 1].timestamp;
      if (selectedTimeRange.end < dataStart || selectedTimeRange.start > dataEnd) {
        setSelectedTimeRange(null);
        setSelectedClient(null);
        setStep(1);
      }
    }
  }, [statsEntries, selectedTimeRange]);

  const goToStep = useCallback((targetStep) => {
    if (targetStep <= 1) {
      setStep(1);
      setSelectedTimeRange(null);
      setSelectedClient(null);
    } else if (targetStep <= 2) {
      setStep(2);
      setSelectedClient(null);
    }
  }, []);

  // ===================== STEP 1: WHEN =====================

  const statsChartData = useMemo(() =>
    statsEntries.map((e, idx) => ({
      idx,
      timestamp: e.timestamp,
      time: e.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      elapsedMs: (e.elapsedTimePerCall || 0) / 1000,
      waitMs: (e.waitTimePerCall || 0) / 1000,
      ioMs: (e.ioTimePerCall || 0) / 1000,
      cacheHitPct: e.cacheHitPct || 0,
      callsInProgress: e.remoteCallsInProgress || 0,
      callsSec: e.remoteCallsSec || 0,
    })),
  [statsEntries]);

  const statsOverview = useMemo(() => {
    if (statsChartData.length === 0) return null;
    let totalElapsed = 0, maxElapsed = 0, totalCache = 0, maxCalls = 0;
    statsChartData.forEach(d => {
      totalElapsed += d.elapsedMs;
      if (d.elapsedMs > maxElapsed) maxElapsed = d.elapsedMs;
      totalCache += d.cacheHitPct;
      if (d.callsSec > maxCalls) maxCalls = d.callsSec;
    });
    return {
      avgElapsed: totalElapsed / statsChartData.length,
      maxElapsed,
      avgCache: totalCache / statsChartData.length,
      maxCalls,
    };
  }, [statsChartData]);

  const hotSpots = useMemo(() => {
    if (statsChartData.length < 10) return [];
    const values = statsChartData.map(d => d.elapsedMs);
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const threshold = Math.max(median * 3, 5);

    const spots = [];
    let current = null;
    statsChartData.forEach((d, i) => {
      if (d.elapsedMs > threshold) {
        if (!current) {
          current = { startIdx: i, endIdx: i, peakMs: d.elapsedMs, peakIdx: i };
        } else {
          current.endIdx = i;
          if (d.elapsedMs > current.peakMs) { current.peakMs = d.elapsedMs; current.peakIdx = i; }
        }
      } else if (current) {
        spots.push(current);
        current = null;
      }
    });
    if (current) spots.push(current);

    return spots.map(s => {
      const si = Math.max(0, s.startIdx - 2);
      const ei = Math.min(statsChartData.length - 1, s.endIdx + 2);
      return {
        startIdx: si, endIdx: ei,
        start: statsChartData[si].timestamp,
        end: statsChartData[ei].timestamp,
        peakMs: s.peakMs,
        label: `${statsChartData[si].time} — ${statsChartData[ei].time}`,
      };
    });
  }, [statsChartData]);

  const handleChartMouseDown = useCallback((e) => {
    if (e && e.activeTooltipIndex != null) {
      setSelectStart(e.activeTooltipIndex);
      setSelectEnd(e.activeTooltipIndex);
    }
  }, []);

  const handleChartMouseMove = useCallback((e) => {
    if (selectStart !== null && e && e.activeTooltipIndex != null) {
      setSelectEnd(e.activeTooltipIndex);
    }
  }, [selectStart]);

  const handleChartMouseUp = useCallback(() => {
    if (selectStart !== null && selectEnd !== null) {
      const lo = Math.min(selectStart, selectEnd);
      const hi = Math.max(selectStart, selectEnd);
      if (hi - lo >= 1 && statsChartData[lo] && statsChartData[hi]) {
        setSelectedTimeRange({
          start: statsChartData[lo].timestamp,
          end: statsChartData[hi].timestamp,
          label: `${statsChartData[lo].time} — ${statsChartData[hi].time}`,
        });
        setStep(2);
      }
    }
    setSelectStart(null);
    setSelectEnd(null);
  }, [selectStart, selectEnd, statsChartData]);

  const selectHotSpot = useCallback((spot) => {
    setSelectedTimeRange({ start: spot.start, end: spot.end, label: spot.label });
    setStep(2);
  }, []);

  // ===================== STEP 2: WHO =====================

  const timeFilteredClientStats = useMemo(() => {
    if (!selectedTimeRange) return [];
    return clientStatsEntries.filter(e =>
      e.timestamp >= selectedTimeRange.start && e.timestamp <= selectedTimeRange.end
    );
  }, [clientStatsEntries, selectedTimeRange]);

  const clientSummary = useMemo(() => {
    const map = Object.create(null);
    timeFilteredClientStats.forEach(e => {
      const name = e.clientName || 'Unknown';
      if (!map[name]) map[name] = {
        client: name, intervals: 0,
        totalElapsed: 0, totalWait: 0, totalIO: 0,
        totalCalls: 0, totalBytesIn: 0, totalBytesOut: 0,
        maxElapsed: 0,
      };
      const c = map[name];
      c.intervals++;
      c.totalElapsed += e.elapsedTime || 0;
      c.totalWait += e.waitTime || 0;
      c.totalIO += e.ioTime || 0;
      c.totalCalls += e.remoteCalls || 0;
      c.totalBytesIn += e.networkBytesIn || 0;
      c.totalBytesOut += e.networkBytesOut || 0;
      if (e.elapsedTime > c.maxElapsed) c.maxElapsed = e.elapsedTime;
    });
    return Object.values(map).sort((a, b) => b.totalElapsed - a.totalElapsed);
  }, [timeFilteredClientStats]);

  const clientChartData = useMemo(() =>
    clientSummary.slice(0, 10).map(c => ({
      client: c.client.length > 20 ? c.client.slice(0, 18) + '...' : c.client,
      clientFull: c.client,
      wait: c.totalWait / 1000,
      io: c.totalIO / 1000,
      processing: Math.max(0, (c.totalElapsed - c.totalWait - c.totalIO)) / 1000,
    })),
  [clientSummary]);

  const clientGlobalStats = useMemo(() => {
    let totalElapsed = 0, totalCalls = 0, totalBytes = 0;
    clientSummary.forEach(c => {
      totalElapsed += c.totalElapsed;
      totalCalls += c.totalCalls;
      totalBytes += c.totalBytesIn + c.totalBytesOut;
    });
    return { uniqueClients: clientSummary.length, totalElapsed, totalCalls, totalBytes };
  }, [clientSummary]);

  const handleClientClick = useCallback((clientName) => {
    setSelectedClient(clientName);
    setStep(3);
  }, []);

  const handleBarClick = useCallback((data) => {
    if (data && data.activePayload?.[0]?.payload?.clientFull) {
      handleClientClick(data.activePayload[0].payload.clientFull);
    }
  }, [handleClientClick]);

  // ===================== STEP 3: WHAT =====================

  const filteredTopCalls = useMemo(() => {
    if (!selectedTimeRange || !selectedClient) return [];
    return topCallStatsEntries.filter(e =>
      e.timestamp >= selectedTimeRange.start &&
      e.timestamp <= selectedTimeRange.end &&
      e.clientName === selectedClient
    );
  }, [topCallStatsEntries, selectedTimeRange, selectedClient]);

  const operationBreakdown = useMemo(() => {
    const map = Object.create(null);
    filteredTopCalls.forEach(e => {
      const op = e.operation || 'Unknown';
      if (!map[op]) map[op] = { operation: op, count: 0, totalElapsed: 0, totalWait: 0, totalIO: 0, maxElapsed: 0 };
      const m = map[op];
      m.count++;
      m.totalElapsed += e.elapsedTime || 0;
      m.totalWait += e.waitTime || 0;
      m.totalIO += e.ioTime || 0;
      if (e.elapsedTime > m.maxElapsed) m.maxElapsed = e.elapsedTime;
    });
    return Object.values(map).sort((a, b) => b.totalElapsed - a.totalElapsed);
  }, [filteredTopCalls]);

  const targetBreakdown = useMemo(() => {
    const map = Object.create(null);
    filteredTopCalls.forEach(e => {
      const key = e.target || 'Unknown';
      if (!map[key]) map[key] = { target: key, count: 0, totalElapsed: 0 };
      map[key].count++;
      map[key].totalElapsed += e.elapsedTime || 0;
    });
    return Object.values(map).sort((a, b) => b.totalElapsed - a.totalElapsed);
  }, [filteredTopCalls]);

  const bottleneckAnalysis = useMemo(() => {
    let totalWait = 0, totalIO = 0, totalElapsed = 0, maxElapsed = 0, slowCalls = 0;
    filteredTopCalls.forEach(e => {
      totalWait += e.waitTime || 0;
      totalIO += e.ioTime || 0;
      totalElapsed += e.elapsedTime || 0;
      if (e.elapsedTime > maxElapsed) maxElapsed = e.elapsedTime;
      if (e.elapsedTime > 250000) slowCalls++;
    });
    const totalProcessing = Math.max(0, totalElapsed - totalWait - totalIO);

    let bottleneck = 'processing';
    if (totalWait > totalIO && totalWait > totalProcessing) bottleneck = 'wait';
    else if (totalIO > totalWait && totalIO > totalProcessing) bottleneck = 'io';

    const advice = {
      wait: 'High wait time indicates record locking contention. Look for operations on shared tables, long-running scripts holding locks, or funnel table architecture.',
      io: 'High I/O suggests disk-bound operations. Check for finds/sorts on unindexed fields, insufficient database cache, or operations pulling large record sets.',
      processing: 'Processing time dominates. Check for complex unstored calculations, large data transfers, or wide layouts with many fields.',
    };

    const bottleneckLabel = { wait: 'Wait (Locking)', io: 'I/O (Disk)', processing: 'Processing' };

    return {
      totalWait, totalIO, totalProcessing, totalElapsed, maxElapsed,
      bottleneck, slowCalls,
      advice: advice[bottleneck],
      bottleneckLabel: bottleneckLabel[bottleneck],
      avgElapsed: filteredTopCalls.length > 0 ? totalElapsed / filteredTopCalls.length : 0,
      breakdown: [
        { name: 'Wait (Locking)', value: totalWait },
        { name: 'I/O (Disk)', value: totalIO },
        { name: 'Processing', value: totalProcessing },
      ].filter(d => d.value > 0),
    };
  }, [filteredTopCalls]);

  // ===================== RENDER =====================

  // Empty state
  if (statsEntries.length === 0 || clientStatsEntries.length === 0 || topCallStatsEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          The Performance Troubleshooter requires data in all three log types within the current date range.
        </p>
        <div className="mt-3 space-y-1 text-xs text-gray-400">
          <p>Stats.log: {statsEntries.length.toLocaleString()} entries {statsEntries.length === 0 && <span className="text-red-400">(missing)</span>}</p>
          <p>ClientStats.log: {clientStatsEntries.length.toLocaleString()} entries {clientStatsEntries.length === 0 && <span className="text-red-400">(missing)</span>}</p>
          <p>TopCallStats.log: {topCallStatsEntries.length.toLocaleString()} entries {topCallStatsEntries.length === 0 && <span className="text-red-400">(missing)</span>}</p>
        </div>
        <p className="text-xs text-gray-400 mt-3">Try widening the date range filter or loading the missing log files.</p>
      </div>
    );
  }

  // Breadcrumb
  const breadcrumb = (
    <div className="flex items-center gap-1 text-xs mb-4 flex-wrap">
      <button
        onClick={() => goToStep(1)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
          step === 1
            ? 'bg-blue-500 text-white'
            : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
        }`}
      >
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          step === 1 ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/40'
        }`}>1</span>
        WHEN
      </button>

      <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />

      <button
        onClick={() => selectedTimeRange && goToStep(2)}
        disabled={!selectedTimeRange}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
          step === 2
            ? 'bg-blue-500 text-white'
            : selectedTimeRange
              ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
        }`}
      >
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          step === 2 ? 'bg-white/20' : selectedTimeRange ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'
        }`}>2</span>
        WHO
        {selectedTimeRange && step >= 2 && (
          <span className="ml-1 text-[10px] opacity-70 max-w-[200px] truncate">({selectedTimeRange.label})</span>
        )}
      </button>

      <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />

      <button
        disabled={!selectedClient}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
          step === 3
            ? 'bg-blue-500 text-white'
            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
        }`}
      >
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          step === 3 ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
        }`}>3</span>
        WHAT
        {selectedClient && step === 3 && (
          <span className="ml-1 text-[10px] opacity-70 max-w-[150px] truncate">({selectedClient})</span>
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {breadcrumb}

      {/* ==================== STEP 1: WHEN ==================== */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Stat cards */}
          {statsOverview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Avg Elapsed/Call" value={`${statsOverview.avgElapsed.toFixed(1)} ms`} color="blue" icon={Clock} />
              <StatCard label="Max Elapsed/Call" value={`${statsOverview.maxElapsed.toFixed(1)} ms`} color="red" icon={AlertTriangle} />
              <StatCard label="Avg Cache Hit" value={`${statsOverview.avgCache.toFixed(1)}%`} color="emerald" icon={HardDrive} />
              <StatCard label="Max Calls/sec" value={statsOverview.maxCalls.toFixed(1)} color="violet" icon={Activity} />
            </div>
          )}

          {/* Hot spots */}
          {hotSpots.length > 0 ? (
            <div className="flex items-start gap-2 flex-wrap px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-700 dark:text-red-300">Performance spikes detected:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hotSpots.map((spot, i) => (
                  <button
                    key={i}
                    onClick={() => selectHotSpot(spot)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/60 transition-colors font-medium"
                  >
                    {spot.label} (peak: {spot.peakMs.toFixed(0)} ms)
                  </button>
                ))}
              </div>
            </div>
          ) : statsChartData.length >= 10 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">No performance spikes detected.</span>
              <span className="text-emerald-600 dark:text-emerald-400">Server performance appears stable. You can still drag to select any time range to investigate.</span>
            </div>
          )}

          {/* Main timeline chart */}
          {statsChartData.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Elapsed Time per Call</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">Click and drag on the chart to select a time range, or click a spike above</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={statsChartData}
                  onMouseDown={handleChartMouseDown}
                  onMouseMove={handleChartMouseMove}
                  onMouseUp={handleChartMouseUp}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: 'ms', position: 'insideLeft', offset: -5, style: { fontSize: 10 } }} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} ms`]} labelStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="elapsedMs" name="Elapsed" stroke="#ef4444" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="waitMs" name="Wait" stroke="#f59e0b" dot={false} strokeWidth={1} />
                  <Line type="monotone" dataKey="ioMs" name="I/O" stroke="#06b6d4" dot={false} strokeWidth={1} />

                  {hotSpots.map((spot, i) => (
                    <ReferenceArea
                      key={`hot-${i}`}
                      x1={statsChartData[spot.startIdx].time}
                      x2={statsChartData[spot.endIdx].time}
                      fill="#ef4444"
                      fillOpacity={0.08}
                      stroke="#ef4444"
                      strokeOpacity={0.3}
                      strokeDasharray="3 3"
                    />
                  ))}

                  {selectStart !== null && selectEnd !== null && (
                    <ReferenceArea
                      x1={statsChartData[Math.min(selectStart, selectEnd)]?.time}
                      x2={statsChartData[Math.max(selectStart, selectEnd)]?.time}
                      fill="#3b82f6"
                      fillOpacity={0.15}
                      stroke="#3b82f6"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Secondary charts */}
          {statsChartData.length > 1 && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Cache Hit %</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={statsChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`]} labelStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="cacheHitPct" name="Cache Hit %" stroke="#10b981" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Remote Calls In Progress</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={statsChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip labelStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="callsInProgress" name="In Progress" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== STEP 2: WHO ==================== */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Info bar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-blue-700 dark:text-blue-300">
              <span className="font-medium">Time window:</span> {selectedTimeRange?.label}
            </span>
            <span className="text-blue-500 dark:text-blue-400">
              ({timeFilteredClientStats.length.toLocaleString()} client intervals)
            </span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Unique Clients" value={clientGlobalStats.uniqueClients} color="blue" icon={Users} />
            <StatCard label="Total Elapsed" value={formatDuration(clientGlobalStats.totalElapsed)} color="red" icon={Clock} />
            <StatCard label="Total Calls" value={clientGlobalStats.totalCalls.toLocaleString()} color="violet" icon={Zap} />
            <StatCard label="Total Network" value={formatBytes(clientGlobalStats.totalBytes)} color="cyan" icon={Activity} />
          </div>

          {/* Client time breakdown chart */}
          {clientChartData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Client Time Breakdown (Top 10)</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">Click a bar to drill into that client&apos;s operations</p>
              <ResponsiveContainer width="100%" height={Math.max(200, clientChartData.length * 36)}>
                <BarChart data={clientChartData} layout="vertical" onClick={handleBarClick}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 10 }} label={{ value: 'ms', position: 'insideBottom', offset: -2, style: { fontSize: 10 } }} />
                  <YAxis type="category" dataKey="client" tick={{ fontSize: 10 }} width={140} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} ms`]} labelStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="wait" name="Wait (Locking)" stackId="a" fill={BREAKDOWN_COLORS[0]} cursor="pointer" />
                  <Bar dataKey="io" name="I/O (Disk)" stackId="a" fill={BREAKDOWN_COLORS[1]} cursor="pointer" />
                  <Bar dataKey="processing" name="Processing" stackId="a" fill={BREAKDOWN_COLORS[2]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Client summary table */}
          {clientSummary.length > 0 && (
            <DataTable
              data={clientSummary}
              title="Client Summary"
              defaultSortKey="totalElapsed"
              defaultSortDir="desc"
              exportFilename="troubleshooter-clients"
              columns={[
                {
                  key: 'client', label: 'Client', accessor: 'client',
                  render: (v) => (
                    <button
                      onClick={() => handleClientClick(v)}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-left max-w-xs truncate block"
                    >
                      {v}
                    </button>
                  ),
                },
                { key: 'intervals', label: 'Intervals', accessor: 'intervals', className: 'text-right' },
                { key: 'totalCalls', label: 'Calls', accessor: 'totalCalls', className: 'text-right', render: v => v.toLocaleString() },
                { key: 'totalElapsed', label: 'Total Elapsed', accessor: 'totalElapsed', className: 'text-right', render: v => formatDuration(v) },
                { key: 'maxElapsed', label: 'Max Elapsed', accessor: 'maxElapsed', className: 'text-right', render: v => formatDuration(v) },
                { key: 'totalWait', label: 'Total Wait', accessor: 'totalWait', className: 'text-right', render: v => formatDuration(v) },
                { key: 'totalIO', label: 'Total I/O', accessor: 'totalIO', className: 'text-right', render: v => formatDuration(v) },
                { key: 'network', label: 'Network', accessor: (row) => row.totalBytesIn + row.totalBytesOut, className: 'text-right', render: v => formatBytes(v) },
              ]}
            />
          )}
        </div>
      )}

      {/* ==================== STEP 3: WHAT ==================== */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Info bar */}
          <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-blue-700 dark:text-blue-300">
              <span className="font-medium">Client:</span> {selectedClient}
            </span>
            <span className="text-blue-500 dark:text-blue-400">|</span>
            <span className="text-blue-700 dark:text-blue-300">
              <span className="font-medium">Window:</span> {selectedTimeRange?.label}
            </span>
            <span className="text-blue-500 dark:text-blue-400">|</span>
            <span className="text-blue-700 dark:text-blue-300">
              {filteredTopCalls.length.toLocaleString()} expensive operations
            </span>
          </div>

          {filteredTopCalls.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p>No expensive operations recorded for <strong className="text-gray-500 dark:text-gray-300">{selectedClient}</strong> in this time window.</p>
              <p className="text-xs mt-1">This client may not have triggered any calls that exceeded the TopCallStats threshold.</p>
              <button onClick={() => goToStep(2)} className="mt-3 text-blue-500 hover:text-blue-600 text-xs font-medium">
                &larr; Back to client selection
              </button>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Calls" value={filteredTopCalls.length.toLocaleString()} color="blue" icon={Zap} />
                <StatCard label="Avg Elapsed" value={formatDuration(bottleneckAnalysis.avgElapsed)} color="amber" icon={Clock} />
                <StatCard label="Max Elapsed" value={formatDuration(bottleneckAnalysis.maxElapsed)} color="red" icon={AlertTriangle} />
                <StatCard
                  label="Bottleneck"
                  value={bottleneckAnalysis.bottleneckLabel}
                  color={bottleneckAnalysis.bottleneck === 'wait' ? 'amber' : bottleneckAnalysis.bottleneck === 'io' ? 'cyan' : 'violet'}
                  icon={Target}
                />
              </div>

              {/* Bottleneck analysis + pie */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Bottleneck Analysis</h3>
                  <div className={`rounded-lg px-3 py-2 text-xs mb-3 ${
                    bottleneckAnalysis.bottleneck === 'wait'
                      ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                      : bottleneckAnalysis.bottleneck === 'io'
                        ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300'
                        : 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300'
                  }`}>
                    <p className="font-medium mb-1">Primary bottleneck: {bottleneckAnalysis.bottleneckLabel}</p>
                    <p>{bottleneckAnalysis.advice}</p>
                  </div>
                  {bottleneckAnalysis.slowCalls > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-red-500">{bottleneckAnalysis.slowCalls}</span> calls exceeded 250ms
                    </p>
                  )}
                </div>

                {bottleneckAnalysis.breakdown.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Where Time is Spent</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={bottleneckAnalysis.breakdown}
                          cx="50%" cy="50%"
                          outerRadius={70}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {bottleneckAnalysis.breakdown.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [formatDuration(v)]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Operation breakdown chart */}
              {operationBreakdown.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Operations by Total Elapsed Time</h3>
                  <ResponsiveContainer width="100%" height={Math.max(150, operationBreakdown.length * 30)}>
                    <BarChart data={operationBreakdown.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="operation" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip formatter={(v) => [formatDuration(v)]} labelStyle={{ fontSize: 11 }} />
                      <Bar dataKey="totalElapsed" name="Total Elapsed" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Target list */}
              {targetBreakdown.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Top Targets</h3>
                  <div className="space-y-1">
                    {targetBreakdown.slice(0, 15).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="w-5 text-right text-gray-400 shrink-0">{i + 1}</span>
                        <span className="flex-1 font-mono text-gray-700 dark:text-gray-300 truncate">{t.target}</span>
                        <span className="text-gray-400 shrink-0">{t.count} calls</span>
                        <span className="text-gray-600 dark:text-gray-300 font-medium shrink-0">{formatDuration(t.totalElapsed)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full data table */}
              <DataTable
                data={filteredTopCalls}
                title="Expensive Operations"
                defaultSortKey="elapsedTime"
                defaultSortDir="desc"
                exportFilename="troubleshooter-operations"
                columns={[
                  { key: 'timestamp', label: 'Timestamp', accessor: 'timestamp', render: v => formatTimestamp(v) },
                  { key: 'operation', label: 'Operation', accessor: 'operation' },
                  { key: 'target', label: 'Target', accessor: 'target', className: 'font-mono text-xs max-w-[200px] truncate' },
                  { key: 'elapsedTime', label: 'Elapsed', accessor: 'elapsedTime', className: 'text-right', render: v => formatDuration(v) },
                  { key: 'waitTime', label: 'Wait', accessor: 'waitTime', className: 'text-right', render: v => formatDuration(v) },
                  { key: 'ioTime', label: 'I/O', accessor: 'ioTime', className: 'text-right', render: v => formatDuration(v) },
                  { key: 'netIn', label: 'Net In', accessor: 'networkBytesIn', className: 'text-right', render: v => formatBytes(v) },
                  { key: 'netOut', label: 'Net Out', accessor: 'networkBytesOut', className: 'text-right', render: v => formatBytes(v) },
                ]}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
