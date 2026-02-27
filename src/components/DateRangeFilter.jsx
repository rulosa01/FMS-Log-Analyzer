import { useMemo } from 'react';
import { Calendar } from 'lucide-react';

function toLocalDatetimeString(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange, onClear, dataRange }) {
  const presets = useMemo(() => {
    if (!dataRange?.end) return [];
    const end = new Date(dataRange.end);
    const items = [];

    const hoursAgo = (h) => {
      const d = new Date(end);
      d.setHours(d.getHours() - h);
      return d;
    };
    const daysAgo = (n) => {
      const d = new Date(end);
      d.setDate(d.getDate() - n);
      return d;
    };

    items.push({ label: 'Last 24h', start: hoursAgo(24) });
    items.push({ label: 'Last 7d', start: daysAgo(7) });
    items.push({ label: 'Last 30d', start: daysAgo(30) });
    items.push({ label: 'All', start: null });

    return items;
  }, [dataRange]);

  const rangeLabel = useMemo(() => {
    if (!dataRange?.start || !dataRange?.end) return null;
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(dataRange.start)} — ${fmt(dataRange.end)}`;
  }, [dataRange]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="w-4 h-4 text-gray-400" />

      {rangeLabel && !startDate && !endDate && (
        <span className="text-[10px] text-gray-400">{rangeLabel}</span>
      )}

      {/* Quick presets */}
      {presets.map(p => (
        <button
          key={p.label}
          onClick={() => {
            if (p.start === null) {
              onClear();
            } else {
              onStartChange(toLocalDatetimeString(p.start));
              onEndChange(toLocalDatetimeString(dataRange.end));
            }
          }}
          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
            (startDate && p.start && toLocalDatetimeString(p.start) === startDate)
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {p.label}
        </button>
      ))}

      <input
        type="datetime-local"
        value={startDate || ''}
        onChange={e => onStartChange(e.target.value || null)}
        min={dataRange?.start ? toLocalDatetimeString(dataRange.start) : undefined}
        max={dataRange?.end ? toLocalDatetimeString(dataRange.end) : undefined}
        className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-44"
      />
      <span className="text-xs text-gray-400">to</span>
      <input
        type="datetime-local"
        value={endDate || ''}
        onChange={e => onEndChange(e.target.value || null)}
        min={dataRange?.start ? toLocalDatetimeString(dataRange.start) : undefined}
        max={dataRange?.end ? toLocalDatetimeString(dataRange.end) : undefined}
        className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-44"
      />
      {(startDate || endDate) && (
        <button
          onClick={onClear}
          className="text-xs text-blue-500 hover:text-blue-600 font-medium"
        >
          Clear
        </button>
      )}
    </div>
  );
}
