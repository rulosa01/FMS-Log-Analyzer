export default function StatCard({ label, value, subValue, color = 'blue', icon: Icon, onClick, active }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
    red: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
    violet: 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400',
    gray: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
  };

  const activeRing = {
    blue: 'ring-blue-400', emerald: 'ring-emerald-400', amber: 'ring-amber-400',
    red: 'ring-red-400', violet: 'ring-violet-400', cyan: 'ring-cyan-400', gray: 'ring-gray-400',
  };

  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 shadow-sm ${colors[color] || colors.blue} ${
        isClickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all' : ''
      } ${active ? `ring-2 ${activeRing[color] || 'ring-blue-400'}` : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4 opacity-70" />}
        <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subValue && <p className="text-xs opacity-60 mt-0.5">{subValue}</p>}
    </div>
  );
}
