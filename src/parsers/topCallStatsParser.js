import { parseTimestamp } from '../utils/dateUtils.js';

// TopCallStats.log format (tab-delimited with header):
// Timestamp\tStart Time\tEnd Time\tTotal Elapsed\tOperation\tTarget\tNetwork Bytes In\tNetwork Bytes Out\tElapsed Time\tWait Time\tI/O Time\tClient name
//
// Start Time and End Time are in seconds since server start (not absolute timestamps)
// Time values (Total Elapsed, Elapsed Time, Wait Time, I/O Time) are in microseconds

export function parseTopCallStatsLog(text, onProgress) {
  const lines = text.split('\n');
  const entries = [];

  // First line is header
  const startIdx = lines[0]?.startsWith('Timestamp') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    if (onProgress && i % 10000 === 0) onProgress(i / lines.length);

    const line = lines[i];
    if (!line.trim()) continue;

    const fields = line.split('\t');
    if (fields.length < 12) continue;

    const timestamp = parseTimestamp(fields[0]);
    if (!timestamp) continue;

    entries.push({
      timestamp,
      timestampRaw: fields[0],
      startTime: parseFloat(fields[1]),     // seconds since server start
      endTime: parseFloat(fields[2]),       // seconds since server start
      totalElapsed: parseInt(fields[3], 10), // microseconds
      operation: fields[4],
      target: fields[5],
      networkBytesIn: parseInt(fields[6], 10),
      networkBytesOut: parseInt(fields[7], 10),
      elapsedTime: parseInt(fields[8], 10),  // microseconds
      waitTime: parseInt(fields[9], 10),     // microseconds
      ioTime: parseInt(fields[10], 10),      // microseconds
      clientName: fields[11],
    });
  }

  return entries;
}

// Parse the target field: "SalesDB::table(204)" -> { database, object, tableId }
export function parseTarget(target) {
  if (!target) return { database: '', object: '', tableId: null };
  const parts = target.split('::');
  const database = parts[0] || '';
  const rest = parts.slice(1).join('::');

  const tableMatch = rest.match(/table\((\d+)\)/);
  const tableId = tableMatch ? parseInt(tableMatch[1], 10) : null;

  return { database, object: rest, tableId };
}
