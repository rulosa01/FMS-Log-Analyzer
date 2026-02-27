import { parseTimestamp } from '../utils/dateUtils.js';

// fmdapi.log format (tab-delimited with header):
// Timestamp\tError\tMessage\tUsage
// The "Message" column actually contains multiple sub-fields separated by tabs:
// IP, Account, HTTP Method, Endpoint
// e.g.: 2024-05-08 14:47:17.031 -0400\t9\tERROR\t192.0.2.1\t\tGET\t/fmi/data/v1/databases/\t77

export function parseFmdapiLog(text, onProgress) {
  const lines = text.split('\n');
  const entries = [];

  const startIdx = lines[0]?.startsWith('Timestamp') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    if (onProgress && i % 10000 === 0) onProgress(i / lines.length);

    const line = lines[i];
    if (!line.trim()) continue;

    const fields = line.split('\t');
    if (fields.length < 7) continue;

    const timestamp = parseTimestamp(fields[0]);
    if (!timestamp) continue;

    const errorCode = parseInt(fields[1], 10);
    const level = fields[2]; // INFO, ERROR, etc.
    const ip = fields[3];
    const account = fields[4];
    const method = fields[5];
    const endpoint = fields[6];
    const usage = fields[7] ? parseInt(fields[7], 10) : null;

    // Extract database from endpoint
    const dbMatch = endpoint.match(/\/databases\/([^/]+)/);
    const database = dbMatch ? dbMatch[1] : null;

    entries.push({
      timestamp,
      timestampRaw: fields[0],
      errorCode,
      level,
      ip,
      account,
      method,
      endpoint,
      usage,
      database,
    });
  }

  return entries;
}
