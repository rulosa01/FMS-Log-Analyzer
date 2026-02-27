import { parseTimestamp } from '../utils/dateUtils.js';

// ClientStats.log format (tab-delimited with header):
// Timestamp\tNetwork Bytes In\tNetwork Bytes Out\tRemote Calls\tRemote Calls In Progress\tElapsed Time\tWait Time\tI/O Time\tClient name
//
// Time values are in microseconds

export function parseClientStatsLog(text, onProgress) {
  const lines = text.split('\n');
  const entries = [];

  const startIdx = lines[0]?.startsWith('Timestamp') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    if (onProgress && i % 10000 === 0) onProgress(i / lines.length);

    const line = lines[i];
    if (!line.trim()) continue;

    const fields = line.split('\t');
    if (fields.length < 9) continue;

    const timestamp = parseTimestamp(fields[0]);
    if (!timestamp) continue;

    entries.push({
      timestamp,
      timestampRaw: fields[0],
      networkBytesIn: parseInt(fields[1], 10),
      networkBytesOut: parseInt(fields[2], 10),
      remoteCalls: parseInt(fields[3], 10),
      remoteCallsInProgress: parseInt(fields[4], 10),
      elapsedTime: parseInt(fields[5], 10),   // microseconds
      waitTime: parseInt(fields[6], 10),      // microseconds
      ioTime: parseInt(fields[7], 10),        // microseconds
      clientName: fields[8],
    });
  }

  return entries;
}
