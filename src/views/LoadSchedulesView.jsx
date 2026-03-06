import { useMemo } from 'react';
import { Calendar, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';

const STATUS_STYLES = {
  loaded: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle, iconColor: 'text-emerald-500' },
  missing_file: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: AlertTriangle, iconColor: 'text-amber-500' },
  summary: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: FileText, iconColor: 'text-blue-500' },
  info: { bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', icon: FileText, iconColor: 'text-gray-400' },
};

export default function LoadSchedulesView({ entries }) {
  const stats = useMemo(() => ({
    total: entries.length,
    loaded: entries.filter(e => e.status === 'loaded').length,
    missing: entries.filter(e => e.status === 'missing_file').length,
    types: new Set(entries.filter(e => e.scheduleType).map(e => e.scheduleType)).size,
  }), [entries]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Lines" value={stats.total} color="lime" icon={FileText} />
        <StatCard label="Schedules Loaded" value={stats.loaded} color="emerald" icon={CheckCircle} />
        <StatCard label="Missing Files" value={stats.missing} color="amber" icon={AlertTriangle} />
        <StatCard label="Schedule Types" value={stats.types} color="blue" icon={Calendar} />
      </div>

      <div className="space-y-2">
        {entries.map((entry, i) => {
          const style = STATUS_STYLES[entry.status] || STATUS_STYLES.info;
          const Icon = style.icon;
          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${style.border} ${style.bg}`}>
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.iconColor}`} />
              <div className="min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-100">{entry.message}</p>
                {entry.scheduleName && (
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Schedule: <strong className="text-gray-700 dark:text-gray-200">{entry.scheduleName}</strong></span>
                    {entry.scheduleType && <span>Type: <strong className="text-gray-700 dark:text-gray-200">{entry.scheduleType}</strong></span>}
                    {entry.missingFile && <span>Missing: <strong className="text-amber-600 dark:text-amber-400">{entry.missingFile}</strong></span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
