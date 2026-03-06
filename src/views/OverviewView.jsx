import { useMemo } from 'react';
import {
  BookOpen, Activity, Users, Zap, BarChart3, Server,
  FileCode, Globe, FileText, Link2, ArrowRight,
} from 'lucide-react';
import { LOG_TYPE_LABELS, LOG_TYPE_COLORS } from '../parsers/logDetector.js';
const formatShortDate = (d) => {
  if (!d || !(d instanceof Date) || isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

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
};

export default function OverviewView({ logData, onSelectView }) {
  const logTypes = useMemo(() => {
    if (!logData) return [];
    return Object.entries(logData).map(([type, data]) => {
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
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">FMS Log Analysis</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a log type below to begin analysis, or click any log in the sidebar.
            </p>
          </div>
        </div>
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
              className={`group text-left p-4 rounded-xl border-l-4 ${colors.border.split(' ')[0]} bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${colors.light} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${colors.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</h3>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs font-medium ${colors.text}`}>
                      {count.toLocaleString()} entries
                    </span>
                    {minTs && maxTs && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatShortDate(minTs)} — {formatShortDate(maxTs)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Troubleshooter callout */}
      {hasTroubleshooter && (
        <button
          onClick={() => onSelectView('troubleshooter')}
          className="w-full mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20 border border-blue-200 dark:border-blue-800 text-left hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
              <Link2 className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Performance Troubleshooter</h3>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Guided drill-down: identify <strong>when</strong> performance degrades (Stats) → <strong>who</strong> is responsible (ClientStats) → <strong>what</strong> operations are expensive (TopCallStats)
              </p>
            </div>
          </div>
        </button>
      )}

    </div>
  );
}
