import { useMemo } from 'react';
import { Cloud, AlertTriangle, Layers } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import DataTable from '../components/DataTable.jsx';
import { formatTimestamp } from '../utils/dateUtils.js';

export default function FmscwpcView({ entries }) {
  const stats = useMemo(() => ({
    total: entries.length,
    threads: new Set(entries.map(e => e.thread)).size,
    withStacks: entries.filter(e => e.stackDepth > 0).length,
  }), [entries]);

  const columns = [
    { key: 'timestamp', label: 'Timestamp', accessor: 'timestamp', render: (v) => <span className="whitespace-nowrap font-mono text-[11px]">{formatTimestamp(v)}</span> },
    { key: 'thread', label: 'Thread', accessor: 'thread', render: (v) => <span className="font-mono text-[11px]">{v}</span> },
    { key: 'stackDepth', label: 'Stack Frames', accessor: 'stackDepth' },
    { key: 'message', label: 'Message', accessor: 'message', render: (v) => {
      const firstLine = v.split('\n')[0];
      const lines = v.split('\n').length;
      return (
        <span className="text-[11px] max-w-lg block" title={v}>
          <span className="truncate block">{firstLine}</span>
          {lines > 1 && <span className="text-[10px] text-gray-400">+{lines - 1} stack frames</span>}
        </span>
      );
    }},
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Events" value={stats.total} color="rose" icon={Cloud} />
        <StatCard label="Unique Threads" value={stats.threads} color="violet" icon={Layers} />
        <StatCard label="Stack Traces" value={stats.withStacks} color="amber" icon={AlertTriangle} />
      </div>

      <DataTable
        data={entries}
        columns={columns}
        title="Cloud Web Publishing Log"
        exportFilename="fmscwpc.csv"
        defaultSortKey="timestamp"
        defaultSortDir="desc"
      />
    </div>
  );
}
