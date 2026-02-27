import { useState, useMemo, useCallback } from 'react';
import {
  FileText, Sun, Moon, Upload,
  Activity, Users, Zap, BarChart3, Server,
  FileCode, Globe, Link2,
} from 'lucide-react';
import { useDarkMode } from './utils/hooks.js';
import { LOG_TYPE_LABELS } from './parsers/logDetector.js';
import { isInDateRange } from './utils/dateUtils.js';
import FileUploader from './components/FileUploader.jsx';
import DateRangeFilter from './components/DateRangeFilter.jsx';
import EventLogView from './views/EventLogView.jsx';
import AccessLogView from './views/AccessLogView.jsx';
import TopCallStatsView from './views/TopCallStatsView.jsx';
import ClientStatsView from './views/ClientStatsView.jsx';
import StatsView from './views/StatsView.jsx';
import ScriptEventView from './views/ScriptEventView.jsx';
import FmdapiView from './views/FmdapiView.jsx';

const VIEW_ICONS = {
  event: Activity,
  access: Users,
  topcallstats: Zap,
  clientstats: BarChart3,
  stats: Server,
  scriptevent: FileCode,
  fmdapi: Globe,
  fmodata: Globe,
  wpe: Globe,
  correlation: Link2,
};

function App() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [logData, setLogData] = useState(null);
  const [activeView, setActiveView] = useState(null);
  const [dateStart, setDateStart] = useState(null);
  const [dateEnd, setDateEnd] = useState(null);

  const handleDataLoaded = useCallback((results) => {
    // Merge entries by type (if multiple files of same type)
    const merged = {};
    results.forEach(r => {
      if (!merged[r.type]) {
        merged[r.type] = { type: r.type, entries: [], filenames: [], totalSize: 0 };
      }
      // Use concat instead of push(...) to avoid call stack overflow with large arrays
      merged[r.type].entries = merged[r.type].entries.concat(r.entries);
      merged[r.type].filenames.push(r.filename);
      merged[r.type].totalSize += r.fileSize || 0;
    });

    // Sort entries by timestamp within each type
    Object.values(merged).forEach(m => {
      m.entries.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    });

    setLogData(merged);

    // Auto-set date range to last 7 days to keep the browser responsive
    let maxTs = null;
    Object.values(merged).forEach(m => {
      for (const e of m.entries) {
        if (e.timestamp && (!maxTs || e.timestamp > maxTs)) maxTs = e.timestamp;
      }
    });
    if (maxTs) {
      const pad = (n) => String(n).padStart(2, '0');
      const toLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const end = new Date(maxTs);
      const start = new Date(maxTs);
      start.setDate(start.getDate() - 7);
      setDateEnd(toLocal(end));
      setDateStart(toLocal(start));
    }

    // Auto-select first view
    const types = Object.keys(merged);
    if (types.length > 0) setActiveView(types[0]);
  }, []);

  // Apply date range filter
  const filteredData = useMemo(() => {
    if (!logData) return null;
    if (!dateStart && !dateEnd) return logData;

    const start = dateStart ? new Date(dateStart) : null;
    const end = dateEnd ? new Date(dateEnd) : null;

    const filtered = {};
    Object.entries(logData).forEach(([type, data]) => {
      filtered[type] = {
        ...data,
        entries: data.entries.filter(e => isInDateRange(e.timestamp, start, end)),
      };
    });
    return filtered;
  }, [logData, dateStart, dateEnd]);

  // Compute overall data range across all logs
  const dataRange = useMemo(() => {
    if (!logData) return null;
    let start = null, end = null;
    Object.values(logData).forEach(data => {
      for (const e of data.entries) {
        if (!e.timestamp) continue;
        if (!start || e.timestamp < start) start = e.timestamp;
        if (!end || e.timestamp > end) end = e.timestamp;
      }
    });
    return start && end ? { start, end } : null;
  }, [logData]);

  const handleReset = useCallback(() => {
    setLogData(null);
    setActiveView(null);
    setDateStart(null);
    setDateEnd(null);
  }, []);

  const activeData = filteredData && activeView ? filteredData[activeView] : null;

  // If no data, show uploader
  if (!logData) {
    return (
      <FileUploader onDataLoaded={handleDataLoaded} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
    );
  }

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="px-5 py-3 flex items-center gap-4 shadow-sm border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-800 dark:text-gray-100">FMS Log Analyzer</h1>
          </div>
        </div>

        <div className="flex-1" />

        {/* Date range filter */}
        <DateRangeFilter
          startDate={dateStart}
          endDate={dateEnd}
          onStartChange={setDateStart}
          onEndChange={setDateEnd}
          onClear={() => { setDateStart(null); setDateEnd(null); }}
          dataRange={dataRange}
        />

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {darkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
        </button>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"
        >
          <Upload className="w-3.5 h-3.5" />
          New Analysis
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-52 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <div className="p-3 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mb-2">Loaded Logs</p>
            {Object.entries(logData).map(([type, data]) => {
              const Icon = VIEW_ICONS[type] || FileText;
              const isActive = activeView === type;
              return (
                <button
                  key={type}
                  onClick={() => setActiveView(type)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                    isActive
                      ? `bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg`
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{LOG_TYPE_LABELS[type]}</p>
                    <p className={`text-[10px] ${isActive ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                      {data.entries.length.toLocaleString()} entries
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* File info */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mb-2">Files</p>
            {Object.values(logData).flatMap(d => d.filenames).map((f, i) => (
              <p key={i} className="text-[10px] text-gray-400 dark:text-gray-500 px-2 truncate">{f}</p>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4">
          {activeView && activeData && (
            <div>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {LOG_TYPE_LABELS[activeView]}
                  </h2>
                  {(dateStart || dateEnd) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      Filtered
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {activeData.entries.length.toLocaleString()} entries
                    {filteredData !== logData && ` (of ${logData[activeView]?.entries.length.toLocaleString()})`}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {logData[activeView]?.filenames.join(', ')}
                </p>
              </div>
              {renderView(activeView, activeData.entries)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function renderView(type, entries) {
  switch (type) {
    case 'event': return <EventLogView entries={entries} />;
    case 'access': return <AccessLogView entries={entries} />;
    case 'topcallstats': return <TopCallStatsView entries={entries} />;
    case 'clientstats': return <ClientStatsView entries={entries} />;
    case 'stats': return <StatsView entries={entries} />;
    case 'scriptevent': return <ScriptEventView entries={entries} />;
    case 'fmdapi': return <FmdapiView entries={entries} />;
    default:
      return (
        <div className="text-center py-12 text-gray-400">
          <p>No detailed view available for this log type yet.</p>
          <p className="text-xs mt-1">Raw data contains {entries.length.toLocaleString()} entries</p>
        </div>
      );
  }
}

export default App;
