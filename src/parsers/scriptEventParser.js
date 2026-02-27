import { parseTimestamp } from '../utils/dateUtils.js';

// scriptEvent.log format (tab-delimited with header):
// Timestamp\tError\tMessage
// e.g.: 2025-07-27 20:16:39.534 -0400\t0\tSchedule "Nightly Backup" scripting error (101 [8x]) at "MyDatabase : Export_Records : 131 : Go to Related Record".

export function parseScriptEventLog(text, onProgress) {
  const lines = text.split('\n');
  const entries = [];

  const startIdx = lines[0]?.startsWith('Timestamp') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    if (onProgress && i % 10000 === 0) onProgress(i / lines.length);

    const line = lines[i];
    if (!line.trim()) continue;

    const fields = line.split('\t');
    if (fields.length < 3) continue;

    const timestamp = parseTimestamp(fields[0]);
    if (!timestamp) continue;

    const errorCode = parseInt(fields[1], 10);
    const message = fields.slice(2).join('\t');

    // Parse structured info from message
    const parsed = parseScriptEventMessage(message);

    entries.push({
      timestamp,
      timestampRaw: fields[0],
      errorCode,
      message,
      ...parsed,
    });
  }

  return entries;
}

function parseScriptEventMessage(msg) {
  const result = {
    scheduleName: null,
    fmErrorCode: null,
    errorCount: null,
    database: null,
    scriptName: null,
    scriptStep: null,
    scriptStepNumber: null,
  };

  // Match: Schedule "Name" scripting error (101 [8x]) at "DB : Script : Step# : StepName"
  const schedMatch = msg.match(/Schedule "([^"]+)"/);
  if (schedMatch) result.scheduleName = schedMatch[1];

  const errMatch = msg.match(/error \((\d+)(?:\s+\[(\d+)x\])?\)/);
  if (errMatch) {
    result.fmErrorCode = parseInt(errMatch[1], 10);
    result.errorCount = errMatch[2] ? parseInt(errMatch[2], 10) : 1;
  }

  const atMatch = msg.match(/at "([^"]+)"/);
  if (atMatch) {
    const parts = atMatch[1].split(' : ').map(s => s.trim());
    if (parts.length >= 1) result.database = parts[0];
    if (parts.length >= 2) result.scriptName = parts[1];
    if (parts.length >= 3) result.scriptStepNumber = parseInt(parts[2], 10) || parts[2];
    if (parts.length >= 4) result.scriptStep = parts[3];
  }

  return result;
}
