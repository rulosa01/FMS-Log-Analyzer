import { parseTimestamp } from '../utils/dateUtils.js';

// Stats.log format (tab-delimited with header):
// Timestamp\tNetwork KB/sec In\tNetwork KB/sec Out\tDisk KB/sec Read\tDisk KB/sec Written\t
// Cache Hit %\tCache Unsaved %\tPro Clients\tOpen Databases\tODBC/JDBC Clients\t
// WebDirect Clients\tCustom Web Clients\tRemote Calls/sec\tRemote Calls In Progress\t
// Elapsed Time/call\tWait Time/call\tI/O Time/call\tGo Clients

export function parseStatsLog(text, onProgress) {
  const lines = text.split('\n');
  const entries = [];

  const startIdx = lines[0]?.startsWith('Timestamp') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    if (onProgress && i % 10000 === 0) onProgress(i / lines.length);

    const line = lines[i];
    if (!line.trim()) continue;

    const fields = line.split('\t');
    if (fields.length < 18) continue;

    const timestamp = parseTimestamp(fields[0]);
    if (!timestamp) continue;

    entries.push({
      timestamp,
      timestampRaw: fields[0],
      networkKBSecIn: parseFloat(fields[1]),
      networkKBSecOut: parseFloat(fields[2]),
      diskKBSecRead: parseFloat(fields[3]),
      diskKBSecWritten: parseFloat(fields[4]),
      cacheHitPct: parseFloat(fields[5]),
      cacheUnsavedPct: parseFloat(fields[6]),
      proClients: parseInt(fields[7], 10),
      openDatabases: parseInt(fields[8], 10),
      odbcClients: parseInt(fields[9], 10),
      webDirectClients: parseInt(fields[10], 10),
      customWebClients: parseInt(fields[11], 10),
      remoteCallsSec: parseFloat(fields[12]),
      remoteCallsInProgress: parseInt(fields[13], 10),
      elapsedTimePerCall: parseInt(fields[14], 10),   // microseconds
      waitTimePerCall: parseInt(fields[15], 10),      // microseconds
      ioTimePerCall: parseInt(fields[16], 10),        // microseconds
      goClients: parseInt(fields[17], 10),
    });
  }

  return entries;
}
