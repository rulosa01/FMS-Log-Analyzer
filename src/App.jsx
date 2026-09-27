import { useState, useMemo, useCallback } from 'react';
import {
  FileText, Sun, Moon, Upload,
  AlertTriangle, Users, BarChart3, Contact, Clock,
  Globe, Monitor, Cog, Cloud, Calendar, Stethoscope, LayoutGrid,
} from 'lucide-react';
import { useDarkMode } from './utils/hooks.js';
import { LOG_TYPE_LABELS, sortLogTypes } from './parsers/logDetector.js';
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
import PerformanceTroubleshooterView from './views/PerformanceTroubleshooterView.jsx';
import OverviewView from './views/OverviewView.jsx';
import FacView from './views/FacView.jsx';
import FmscwpcView from './views/FmscwpcView.jsx';
import LoadSchedulesView from './views/LoadSchedulesView.jsx';

// Compact counts for the sidebar pills, e.g. 12500 -> "12.5K"
function compactCount(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

// Icons mirror the FMS Detective Mac app's sidebar symbols
const VIEW_ICONS = {
  event: AlertTriangle,
  access: Users,
  topcallstats: BarChart3,
  clientstats: Contact,
  stats: Clock,
  scriptevent: FileText,
  fmdapi: Globe,
  fmodata: Monitor,
  wpe: Globe,
  fac: Cog,
  fmscwpc: Cloud,
  loadschedules: Calendar,
};

function App() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [logData, setLogData] = useState(null);
  const [activeView, setActiveView] = useState(null);
  const [dateStart, setDateStart] = useState(null);
  const [dateEnd, setDateEnd] = useState(null);

  const handleDataLoaded = useCallback((results) => {
    // Merge entries by type (if multiple files of same type)
    const merged = Object.create(null);
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

    // Show overview screen after parsing
    setActiveView('overview');
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
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="FMS Detective" className="w-8 h-8 rounded-lg shadow-sm" />
          <div>
            <h1 className="text-sm font-bold text-gray-800 dark:text-gray-100">FMS Detective Lite</h1>
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
        <nav className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <div className="p-3 pb-0">
            <button
              onClick={() => setActiveView('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                activeView === 'overview'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <p className="text-xs font-medium truncate min-w-0 flex-1">Overview</p>
            </button>
          </div>
          <div className="p-3 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mb-2">Loaded Logs</p>
            {sortLogTypes(Object.entries(logData)).filter(([, data]) => data.entries.length > 0).map(([type, data]) => {
              const Icon = VIEW_ICONS[type] || FileText;
              const isActive = activeView === type;
              return (
                <button
                  key={type}
                  onClick={() => setActiveView(type)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                    isActive
                      ? `bg-blue-500 text-white`
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <p className="text-xs font-medium truncate min-w-0 flex-1">{LOG_TYPE_LABELS[type]}</p>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}
                    title={`${data.entries.length.toLocaleString()} entries`}
                  >
                    {compactCount(data.entries.length)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Troubleshooter tool */}
          {logData['stats'] && logData['clientstats'] && logData['topcallstats'] && (
            <div className="p-3 pt-0 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mt-3 mb-2">Tools</p>
              <button
                onClick={() => setActiveView('troubleshooter')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                  activeView === 'troubleshooter'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Stethoscope className="w-4 h-4 shrink-0" />
                <p className="text-xs font-medium truncate min-w-0 flex-1">Troubleshooter</p>
              </button>
            </div>
          )}

          {/* File info */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mb-2">Files</p>
            {Object.values(logData).flatMap(d => d.filenames).map((f, i) => (
              <p key={i} className="text-[10px] text-gray-400 dark:text-gray-500 px-2 truncate">{f}</p>
            ))}
          </div>

          {/* Full app upsell */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900">
              <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 mb-1">Only in the Mac app</p>
              <p className="text-[10px] leading-relaxed text-gray-500 dark:text-gray-400 mb-2">
                Log Correlation &middot; AI Assistant &middot; Activity Timeline &middot; Investigators &middot; DDR &amp; Admin API
              </p>
              <a
                href="https://fmsdetective.com/"
                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Get FMS Detective &rarr;
              </a>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4">
          {activeView === 'overview' && filteredData && (
            <OverviewView logData={filteredData} onSelectView={setActiveView} />
          )}
          {activeView === 'troubleshooter' && filteredData && (
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
                </div>
              </div>
              <PerformanceTroubleshooterView filteredData={filteredData} />
            </div>
          )}
          {activeView && activeView !== 'troubleshooter' && activeData && (
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
    case 'fac': return <FacView entries={entries} />;
    case 'fmscwpc': return <FmscwpcView entries={entries} />;
    case 'loadschedules': return <LoadSchedulesView entries={entries} />;
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
