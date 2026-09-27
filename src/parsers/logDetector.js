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
  { pattern: /^fac(-old)?\.log$/i, type: 'fac' },
  { pattern: /^fmscwpc(-old)?\.log$/i, type: 'fmscwpc' },
  { pattern: /^LoadSchedules(-old)?\.log$/i, type: 'loadschedules' },
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

// Sidebar/overview ordering mirrors the FMS Detective Mac app
export const LOG_TYPE_ORDER = [
  'topcallstats', 'event', 'access', 'clientstats', 'stats', 'scriptevent',
  'fmdapi', 'fmodata', 'fac', 'fmscwpc', 'loadschedules', 'wpe',
];

export function sortLogTypes(entries) {
  return [...entries].sort(([a], [b]) => {
    const ia = LOG_TYPE_ORDER.indexOf(a);
    const ib = LOG_TYPE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export const LOG_TYPE_LABELS = {
  event: 'Event Log',
  access: 'Access Log',
  topcallstats: 'Top Call Stats',
  clientstats: 'Client Stats',
  stats: 'Server Stats',
  scriptevent: 'Script Events',
  wpe: 'WPE Log',
  fmdapi: 'Data API',
  fmodata: 'OData',
  fac: 'Admin Console',
  fmscwpc: 'Web Publishing',
  loadschedules: 'Load Schedules',
  troubleshooter: 'Performance Troubleshooter',
  unknown: 'Unknown',
};

// Color code mirrors the FMS Detective Mac app (Apple system palette):
// Event blue, Access orange, Top Call red, Client Stats purple, Server
// Stats indigo, Script Events pink-red, Data API green, OData teal,
// Admin Console orange, Web Publishing gray, Load Schedules blue.
export const LOG_TYPE_COLORS = {
  event: { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  access: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  topcallstats: { bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  clientstats: { bg: 'bg-purple-500', light: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  stats: { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  scriptevent: { bg: 'bg-rose-500', light: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
  wpe: { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  fmdapi: { bg: 'bg-green-500', light: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  fmodata: { bg: 'bg-teal-500', light: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  fac: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  fmscwpc: { bg: 'bg-gray-500', light: 'bg-gray-50 dark:bg-gray-900/30', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-800' },
  loadschedules: { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  unknown: { bg: 'bg-gray-500', light: 'bg-gray-50 dark:bg-gray-900/30', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-800' },
};
