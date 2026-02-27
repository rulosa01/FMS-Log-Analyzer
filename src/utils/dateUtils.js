// Parse FMS timestamp format: "2023-12-17 01:31:29.725 -0500"
export function parseTimestamp(str) {
  if (!str) return null;
  const match = str.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\.(\d{3})\s+([+-]\d{4})$/);
  if (!match) return null;
  const [, date, time, ms, tz] = match;
  return new Date(`${date}T${time}.${ms}${tz.slice(0, 3)}:${tz.slice(3)}`);
}

export function formatTimestamp(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

export function formatDuration(microseconds) {
  if (microseconds == null) return '';
  if (microseconds < 1000) return `${microseconds} µs`;
  if (microseconds < 1000000) return `${(microseconds / 1000).toFixed(1)} ms`;
  return `${(microseconds / 1000000).toFixed(2)} s`;
}

export function formatBytes(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export function formatNumber(n) {
  if (n == null) return '';
  return n.toLocaleString();
}

export function getDateRange(entries) {
  if (!entries || entries.length === 0) return { start: null, end: null };
  let start = entries[0].timestamp;
  let end = entries[0].timestamp;
  for (const e of entries) {
    if (e.timestamp < start) start = e.timestamp;
    if (e.timestamp > end) end = e.timestamp;
  }
  return { start, end };
}

export function isInDateRange(timestamp, start, end) {
  if (!timestamp) return false;
  if (start && timestamp < start) return false;
  if (end && timestamp > end) return false;
  return true;
}
