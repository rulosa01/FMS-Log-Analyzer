// Auto-detect log type from filename and/or header row
const FILENAME_PATTERNS = [
  { pattern: /^Event(-old)?\.log$/i, type: 'event' },
  { pattern: /^Access(-old)?\.log$/i, type: 'access' },
  { pattern: /^TopCallStats(-old)?\.log$/i, type: 'topcallstats' },
  { pattern: /^ClientStats(-old)?\.log$/i, type: 'clientstats' },
  { pattern: /^Stats(-old)?\.log$/i, type: 'stats' },
  { pattern: /^scriptEvent(-old)?\.log$/i, type: 'scriptevent' },
  { pattern: /^wpe\d*(-old)?\.log$/i, type: 'wpe' },
  { pattern: /^wpe_access(-old)?\.log$/i, type: 'wpe' },
  { pattern: /^fmdapi(-old)?\.log$/i, type: 'fmdapi' },
  { pattern: /^fmodata(-old)?\.log$/i, type: 'fmodata' },
];

const HEADER_PATTERNS = {
  'topcallstats': /^Timestamp\tStart Time\tEnd Time\tTotal Elapsed\tOperation/,
  'clientstats': /^Timestamp\tNetwork Bytes In\tNetwork Bytes Out\tRemote Calls\tRemote Calls In Progress/,
  'stats': /^Timestamp\tNetwork KB\/sec In\tNetwork KB\/sec Out\tDisk KB\/sec Read/,
  'scriptevent': /^Timestamp\tError\tMessage$/,
  'fmdapi': /^Timestamp\tError\tMessage\tUsage$/,
};

export function detectLogType(filename, firstLine) {
  // Try filename match first
  for (const { pattern, type } of FILENAME_PATTERNS) {
    if (pattern.test(filename)) return type;
  }

  // Fall back to header detection
  if (firstLine) {
    for (const [type, pattern] of Object.entries(HEADER_PATTERNS)) {
      if (pattern.test(firstLine)) return type;
    }

    // Event and Access logs don't have headers - detect by content pattern
    // Event: timestamp + severity (Information/Warning/Error) + event ID + server + description
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+[+-]\d{4}\t(Information|Warning|Error)\t\d+\t/.test(firstLine)) {
      // Could be Event or Access - check description content
      if (/Client\s+"/.test(firstLine)) return 'access';
      return 'event';
    }
  }

  return 'unknown';
}

export const LOG_TYPE_LABELS = {
  event: 'Event Log',
  access: 'Access Log',
  topcallstats: 'Top Call Stats',
  clientstats: 'Client Stats',
  stats: 'Server Stats',
  scriptevent: 'Script Events',
  wpe: 'Web Publishing',
  fmdapi: 'Data API',
  fmodata: 'OData API',
  troubleshooter: 'Performance Troubleshooter',
  unknown: 'Unknown',
};

export const LOG_TYPE_COLORS = {
  event: { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  access: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  topcallstats: { bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  clientstats: { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
  stats: { bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
  scriptevent: { bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  wpe: { bg: 'bg-pink-500', light: 'bg-pink-50 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
  fmdapi: { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  fmodata: { bg: 'bg-teal-500', light: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  unknown: { bg: 'bg-gray-500', light: 'bg-gray-50 dark:bg-gray-900/30', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-800' },
};
