import { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, Clock, Database, PlayCircle, Zap, Server } from 'lucide-react';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatTimestamp } from '../utils/dateUtils.js';
import { categorizeEventEntry } from '../parsers/eventLogParser.js';

const SEVERITY_STYLES = {
  Error: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  Warning: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  Information: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
};

const SEVERITY_ICONS = {
  Error: AlertCircle,
  Warning: AlertTriangle,
  Information: Info,
};

export default function EventLogView({ entries }) {
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const categorized = useMemo(() =>
    entries.map(e => ({ ...e, category: categorizeEventEntry(e) })),
  [entries]);

  const stats = useMemo(() => {
    const errors = entries.filter(e => e.severity === 'Error').length;
    const warnings = entries.filter(e => e.severity === 'Warning').length;
    const info = entries.filter(e => e.severity === 'Information').length;

    const starts = categorized.filter(e => e.category === 'server_started');
    const stops = categorized.filter(e => e.category === 'server_stopping');

    const dbNames = new Set();
    categorized.forEach(e => {
      if (e.category === 'db_opened' || e.category === 'db_closed' || e.category === 'db_opening' || e.category === 'db_closing') {
        const m = e.description.match(/database "([^"]+)"/i);
        if (m) dbNames.add(m[1]);
      }
    });

    const schedNames = new Set();
    categorized.forEach(e => {
      const m = e.description.match(/Schedule "([^"]+)"/);
      if (m) schedNames.add(m[1]);
    });

    return { errors, warnings, info, restarts: Math.min(starts.length, stops.length), databases: dbNames.size, schedules: schedNames.size };
  }, [entries, categorized]);

  const handleStatClick = (type) => {
    // Toggle: if already active, clear to 'all'
    switch (type) {
      case 'all':
        setFilterSeverity('all');
        setFilterCategory('all');
        break;
      case 'errors':
        setFilterSeverity(filterSeverity === 'Error' ? 'all' : 'Error');
        setFilterCategory('all');
        break;
      case 'warnings':
        setFilterSeverity(filterSeverity === 'Warning' ? 'all' : 'Warning');
        setFilterCategory('all');
        break;
      case 'restarts':
        setFilterSeverity('all');
        setFilterCategory(filterCategory === 'server_stopping' ? 'all' : 'server_stopping');
        break;
      case 'databases':
        setFilterSeverity('all');
        setFilterCategory(filterCategory === 'db_opened' ? 'all' : 'db_opened');
        break;
      case 'schedules':
        setFilterSeverity('all');
        setFilterCategory(filterCategory === 'schedule_start' ? 'all' : 'schedule_start');
        break;
    }
  };

  const filtered = useMemo(() => {
    let result = categorized;
    if (filterSeverity !== 'all') {
      result = result.filter(e => e.severity === filterSeverity);
    }
    if (filterCategory !== 'all') {
      result = result.filter(e => e.category === filterCategory);
    }
    return result;
  }, [categorized, filterSeverity, filterCategory]);

  const errorBreakdown = useMemo(() => {
    const map = {};
    entries.filter(e => e.severity === 'Error').forEach(e => {
      const key = e.eventId;
      if (!map[key]) map[key] = { eventId: key, count: 0, sample: e.description };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [entries]);

  const scheduleStats = useMemo(() => {
    const map = {};
    categorized.forEach(e => {
      const m = e.description.match(/Schedule "([^"]+)"/);
      if (!m) return;
      const name = m[1];
      if (!map[name]) map[name] = { name, runs: 0, completed: 0, errors: 0, timeouts: 0, aborted: 0 };
      if (e.category === 'schedule_start') map[name].runs++;
      if (e.category === 'schedule_complete') map[name].completed++;
      if (e.category === 'schedule_script_error') map[name].errors++;
      if (e.category === 'schedule_timeout') map[name].timeouts++;
      if (e.category === 'schedule_aborted') map[name].aborted++;
    });
    return Object.values(map).sort((a, b) => b.runs - a.runs);
  }, [categorized]);

  // Critical alerts analysis — process crashes, disconnect clustering, schedule aborts
  const criticalAlerts = useMemo(() => {
    const alerts = [];

    // Event 701: Process crashes
    const crashes = categorized.filter(e => e.category === 'process_crash');
    if (crashes.length > 0) {
      alerts.push({
        severity: 'critical',
        title: `Process Crash${crashes.length > 1 ? 'es' : ''} Detected (Event 701)`,
        detail: `${crashes.length} crash event${crashes.length > 1 ? 's' : ''} found. Crash dumps (.DMP files) may precede outages — check the Logs folder and consider a proactive server restart.`,
        entries: crashes,
      });
    }

    // Event 30: Client disconnects — detect clustering (server-side vs random)
    const disconnects = categorized.filter(e => e.category === 'client_disconnect');
    if (disconnects.length > 5) {
      // Look for clusters: >3 disconnects within 2 minutes
      const clusters = [];
      let clusterStart = 0;
      for (let i = 1; i < disconnects.length; i++) {
        const gap = disconnects[i].timestamp - disconnects[i - 1].timestamp;
        if (gap > 120000) { // 2 minute gap = new cluster
          if (i - clusterStart >= 3) {
            clusters.push({ start: disconnects[clusterStart].timestamp, end: disconnects[i - 1].timestamp, count: i - clusterStart });
          }
          clusterStart = i;
        }
      }
      if (disconnects.length - clusterStart >= 3) {
        clusters.push({ start: disconnects[clusterStart].timestamp, end: disconnects[disconnects.length - 1].timestamp, count: disconnects.length - clusterStart });
      }

      if (clusters.length > 0) {
        const totalClustered = clusters.reduce((sum, c) => sum + c.count, 0);
        alerts.push({
          severity: 'warning',
          title: `Client Disconnect Clusters Detected`,
          detail: `${disconnects.length} total disconnects, ${totalClustered} in ${clusters.length} cluster${clusters.length > 1 ? 's' : ''} (3+ within 2 min). Clustered disconnects suggest server-side network issues, not individual client Wi-Fi problems.`,
          entries: disconnects,
        });
      } else {
        alerts.push({
          severity: 'info',
          title: `Client Disconnects: Randomly Distributed`,
          detail: `${disconnects.length} disconnects with no clustering — likely individual client network issues (Wi-Fi drops, VPN timeouts).`,
        });
      }
    }

    // Schedule aborts (Event 690 Error) vs timeouts (Event 690 Warning)
    const aborts = categorized.filter(e => e.category === 'schedule_aborted');
    if (aborts.length > 0) {
      alerts.push({
        severity: 'warning',
        title: `Schedule${aborts.length > 1 ? 's' : ''} Aborted (Event 690 Error)`,
        detail: `${aborts.length} schedule${aborts.length > 1 ? 's were' : ' was'} forcefully aborted (not just slow — stopped entirely). This is different from a 690 Warning, which means the schedule ran past its time limit but still finished.`,
        entries: aborts,
      });
    }

    return alerts;
  }, [categorized]);

  // Extract server session info from startup events
  const serverInfo = useMemo(() => {
    const startEvents = categorized.filter(e =>
      e.category === 'server_started' || e.category === 'engine_started'
    );
    if (startEvents.length === 0) return null;
    // Look for version/spec info in description of nearby events
    const specEntries = entries.filter(e =>
      /FileMaker Server (\d+\.\d+)/i.test(e.description) ||
      /version/i.test(e.description)
    );
    const versionMatch = specEntries.length > 0
      ? specEntries[0].description.match(/FileMaker Server (\d+[\d.]+)/i)
      : null;
    return {
      version: versionMatch ? versionMatch[1] : null,
      serverName: entries[0]?.server || null,
      lastStart: startEvents[startEvents.length - 1]?.timestamp,
    };
  }, [entries, categorized]);

  const categories = useMemo(() => {
    const cats = new Set(categorized.map(e => e.category));
    return ['all', ...Array.from(cats).sort()];
  }, [categorized]);

  const columns = [
    {
      key: 'timestamp', label: 'Timestamp', accessor: 'timestamp',
      render: (val) => <span className="whitespace-nowrap font-mono text-[11px]">{formatTimestamp(val)}</span>,
    },
    {
      key: 'severity', label: 'Severity', accessor: 'severity',
      render: (val) => {
        const SevIcon = SEVERITY_ICONS[val];
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${SEVERITY_STYLES[val] || ''}`}>
            {SevIcon && <SevIcon className="w-3 h-3" />}
            {val}
          </span>
        );
      },
    },
    { key: 'eventId', label: 'Event ID', accessor: 'eventId' },
    {
      key: 'description', label: 'Description', accessor: 'description',
      render: (val) => <span className="max-w-lg truncate block">{val}</span>,
      className: 'max-w-lg',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Entries" value={entries.length.toLocaleString()} color="blue" icon={Info}
          onClick={() => handleStatClick('all')} active={filterSeverity === 'all' && filterCategory === 'all'} />
        <StatCard label="Errors" value={stats.errors.toLocaleString()} color="red" icon={AlertCircle}
          onClick={() => handleStatClick('errors')} active={filterSeverity === 'Error'} />
        <StatCard label="Warnings" value={stats.warnings.toLocaleString()} color="amber" icon={AlertTriangle}
          onClick={() => handleStatClick('warnings')} active={filterSeverity === 'Warning'} />
        <StatCard label="Restarts" value={stats.restarts} color="violet" icon={Clock}
          onClick={() => handleStatClick('restarts')} active={filterCategory === 'server_stopping'} />
        <StatCard label="Databases" value={stats.databases} color="cyan" icon={Database}
          onClick={() => handleStatClick('databases')} active={filterCategory === 'db_opened'} />
        <StatCard label="Schedules" value={stats.schedules} color="emerald" icon={PlayCircle}
          onClick={() => handleStatClick('schedules')} active={filterCategory === 'schedule_start'} />
      </div>

      {/* Analysis panels — hidden when a stat card filter is active */}
      {filterSeverity === 'all' && filterCategory === 'all' && (
        <>
          {/* Server Info */}
          {serverInfo && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5 flex items-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-blue-700 dark:text-blue-300 font-medium">Server Session</span>
              </div>
              {serverInfo.serverName && (
                <span className="text-gray-600 dark:text-gray-300">Host: <strong>{serverInfo.serverName}</strong></span>
              )}
              {serverInfo.version && (
                <span className="text-gray-600 dark:text-gray-300">FMS: <strong>v{serverInfo.version}</strong></span>
              )}
              {serverInfo.lastStart && (
                <span className="text-gray-600 dark:text-gray-300">Last Start: <strong>{formatTimestamp(serverInfo.lastStart)}</strong></span>
              )}
            </div>
          )}

          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <div className="space-y-2">
              {criticalAlerts.map((alert, i) => (
                <div key={i} className={`border rounded-xl p-3 ${
                  alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800' :
                  alert.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800' :
                  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {alert.severity === 'critical' ? <Zap className="w-4 h-4 text-red-500" /> :
                     alert.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                     <Info className="w-4 h-4 text-blue-500" />}
                    <span className={`text-xs font-semibold ${
                      alert.severity === 'critical' ? 'text-red-700 dark:text-red-300' :
                      alert.severity === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                      'text-blue-700 dark:text-blue-300'
                    }`}>{alert.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 ml-6">{alert.detail}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Severity:</span>
          {['all', 'Error', 'Warning', 'Information'].map(s => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterSeverity === s
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Category:</span>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-xs px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Breakdown — hidden when a specific stat card filter is active */}
      {errorBreakdown.length > 0 && filterSeverity === 'all' && filterCategory === 'all' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">Error Breakdown by Event ID</h3>
          <div className="space-y-1">
            {errorBreakdown.slice(0, 10).map(e => (
              <div key={e.eventId} className="flex items-center gap-3 text-xs">
                <span className="font-mono font-medium text-red-600 dark:text-red-400 w-12">#{e.eventId}</span>
                <span className="text-red-500 font-medium w-12">{e.count}x</span>
                <span className="text-red-600 dark:text-red-300 truncate">{e.sample}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Summary — shown when Schedules stat card is active */}
      {scheduleStats.length > 0 && filterCategory === 'schedule_start' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Schedule Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-1.5 pr-4">Schedule</th>
                  <th className="pb-1.5 pr-4">Runs</th>
                  <th className="pb-1.5 pr-4">Completed</th>
                  <th className="pb-1.5 pr-4">Script Errors</th>
                  <th className="pb-1.5 pr-4">Timeouts</th>
                  <th className="pb-1.5">Aborted</th>
                </tr>
              </thead>
              <tbody>
                {scheduleStats.map(s => (
                  <tr key={s.name} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-1.5 pr-4 font-medium text-gray-700 dark:text-gray-200">{s.name}</td>
                    <td className="py-1.5 pr-4">{s.runs}</td>
                    <td className="py-1.5 pr-4 text-emerald-600 dark:text-emerald-400">{s.completed}</td>
                    <td className="py-1.5 pr-4 text-red-600 dark:text-red-400">{s.errors || '-'}</td>
                    <td className="py-1.5 pr-4 text-amber-600 dark:text-amber-400">{s.timeouts || '-'}</td>
                    <td className="py-1.5 text-red-600 dark:text-red-400 font-medium">{s.aborted || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active filter indicator */}
      {(filterSeverity !== 'all' || filterCategory !== 'all') && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            Showing: {filterSeverity !== 'all' ? filterSeverity + 's' : filterCategory.replace(/_/g, ' ')}
          </span>
          <span className="text-blue-400 dark:text-blue-500">
            ({filtered.length.toLocaleString()} of {entries.length.toLocaleString()})
          </span>
          <button
            onClick={() => { setFilterSeverity('all'); setFilterCategory('all'); }}
            className="ml-auto text-xs text-blue-500 hover:text-blue-600 font-medium"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Main event table */}
      <DataTable
        data={filtered}
        columns={columns}
        title="Event Log Entries"
        exportFilename="event-log.csv"
        defaultSortKey="timestamp"
        defaultSortDir="desc"
      />
    </div>
  );
}
