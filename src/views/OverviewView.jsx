import { useMemo } from 'react';
import {
  AlertTriangle, Users, BarChart3, Contact, Clock, FileText, Globe,
  Monitor, Cog, Cloud, Calendar, Stethoscope, Sparkles, ArrowRight,
} from 'lucide-react';
import { LOG_TYPE_LABELS, LOG_TYPE_COLORS, sortLogTypes } from '../parsers/logDetector.js';
const formatShortDate = (d) => {
  if (!d || !(d instanceof Date) || isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

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

const LOG_DESCRIPTIONS = {
  event: 'Server events, errors, crashes, schedule runs, and database open/close activity',
  access: 'Client connections, disconnections, database access, and denied attempts',
  topcallstats: 'Most expensive remote calls with elapsed/wait/I/O time breakdown',
  clientstats: 'Per-client resource consumption and anomaly detection',
  stats: 'Aggregate server statistics — clients, cache, calls/sec, disk I/O',
  scriptevent: 'Script execution errors, schedule failures, and FM error codes',
  fmdapi: 'Data API requests — methods, endpoints, accounts, IPs, and errors',
  fmodata: 'OData API request logging',
  wpe: 'Web Publishing Engine request logging',
  fac: 'Admin Console activity, API errors, CPU/memory alerts, and system notifications',
  fmscwpc: 'Cloud web publishing engine crash diagnostics and stack traces',
  loadschedules: 'Schedule import results — loaded schedules and missing file warnings',
};

export default function OverviewView({ logData, onSelectView }) {
  const logTypes = useMemo(() => {
    if (!logData) return [];
    return sortLogTypes(Object.entries(logData)).map(([type, data]) => {
      const entries = data.entries;
      let minTs = null, maxTs = null;
      for (const e of entries) {
        if (!e.timestamp) continue;
        if (!minTs || e.timestamp < minTs) minTs = e.timestamp;
        if (!maxTs || e.timestamp > maxTs) maxTs = e.timestamp;
      }
      return { type, entries, count: entries.length, minTs, maxTs };
    });
  }, [logData]);

  const hasTroubleshooter = logData?.stats && logData?.clientstats && logData?.topcallstats;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Log Analysis &mdash; Overview</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {logTypes.length} log type{logTypes.length === 1 ? '' : 's'} loaded
        </p>
      </div>

      {/* Log type cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {logTypes.map(({ type, count, minTs, maxTs }) => {
          const Icon = VIEW_ICONS[type] || FileText;
          const colors = LOG_TYPE_COLORS[type] || LOG_TYPE_COLORS.unknown;
          const label = LOG_TYPE_LABELS[type] || type;
          const description = LOG_DESCRIPTIONS[type] || 'Log file data';

          return (
            <button
              key={type}
              onClick={() => onSelectView(type)}
              className="group text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg ${colors.light} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{label}</h3>
                </div>
                <span className={`text-xl font-bold tabular-nums shrink-0 ${colors.text}`}>
                  {count.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{description}</p>
              {minTs && maxTs && (
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                  <Calendar className="w-3 h-3 shrink-0" />
                  {formatShortDate(minTs)} &ndash; {formatShortDate(maxTs)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Troubleshooter banner */}
      {hasTroubleshooter && (
        <button
          onClick={() => onSelectView('troubleshooter')}
          className="w-full mb-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-left hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 shadow-sm">
              <Stethoscope className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Performance Troubleshooter</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Guided drill-down: identify <strong>when</strong> performance degrades (Stats) &rarr; <strong>who</strong> is responsible (ClientStats) &rarr; <strong>what</strong> operations are expensive (TopCallStats)
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      )}

      {/* Mac app banner */}
      <a
        href="https://fmsdetective.com/"
        className="block w-full mb-6 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Go deeper with FMS Detective for Mac</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Log Correlation &amp; root cause &middot; AI Assistant &middot; Server Activity Timeline &middot; User, Script &amp; Trigger Investigators &middot; DDR &amp; Admin API &mdash; free 7-day trial
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-violet-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>

    </div>
  );
}
