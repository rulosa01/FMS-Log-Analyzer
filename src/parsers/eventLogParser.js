import { parseTimestamp } from '../utils/dateUtils.js';

// Event.log format (tab-delimited, no header):
// Timestamp\tSeverity\tEvent ID\tServer\tDescription
// e.g.: 2023-12-17 01:31:29.725 -0500\tInformation\t745\tfms.example.com\tStopping FileMaker Server processes...

export function parseEventLog(text, onProgress) {
  const lines = text.split('\n');
  const entries = [];
  let currentEntry = null;

  for (let i = 0; i < lines.length; i++) {
    if (onProgress && i % 10000 === 0) onProgress(i / lines.length);

    const line = lines[i];
    if (!line.trim()) continue;

    // Try to match a new log entry line
    const match = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+[+-]\d{4})\t(Information|Warning|Error)\t(\d+)\t([^\t]*)\t(.*)$/);

    if (match) {
      // Save previous entry
      if (currentEntry) entries.push(currentEntry);

      const [, timestampStr, severity, eventId, server, description] = match;
      currentEntry = {
        timestamp: parseTimestamp(timestampStr),
        timestampRaw: timestampStr,
        severity,
        eventId: parseInt(eventId, 10),
        server,
        description,
      };
    } else if (currentEntry) {
      // Multi-line description continuation
      currentEntry.description += '\n' + line;
    }
  }

  // Push last entry
  if (currentEntry) entries.push(currentEntry);

  return entries;
}

// Extract structured insights from event entries
export function categorizeEventEntry(entry) {
  const desc = entry.description;
  const eid = entry.eventId;

  // Critical events (process crashes, client disconnects)
  if (eid === 701) return 'process_crash';
  if (eid === 30) return 'client_disconnect';

  // Schedule events — distinguish 690 warning (exceeded but finished) vs error (aborted)
  if (eid === 690 && entry.severity === 'Error') return 'schedule_aborted';
  if (eid === 690 && entry.severity === 'Warning') return 'schedule_timeout';
  if (/Schedule "([^"]+)" running/i.test(desc)) return 'schedule_start';
  if (/Schedule "([^"]+)" completed/i.test(desc)) return 'schedule_complete';
  if (/Schedule "([^"]+)" scheduled for/i.test(desc)) return 'schedule_next';
  if (/Schedule "([^"]+)" has exceeded its time limit/i.test(desc)) return 'schedule_timeout';
  if (/Schedule "([^"]+)" has started FileMaker script/i.test(desc)) return 'schedule_script_start';
  if (/Schedule "([^"]+)" completed; last scripting error/i.test(desc)) return 'schedule_script_error';

  if (/Closing database "([^"]+)"/i.test(desc)) return 'db_closing';
  if (/Database "([^"]+)" closed/i.test(desc)) return 'db_closed';
  if (/Opening database "([^"]+)"/i.test(desc)) return 'db_opening';
  if (/Database "([^"]+)" opened/i.test(desc)) return 'db_opened';

  if (/Starting FileMaker Server processes/i.test(desc)) return 'server_starting';
  if (/FileMaker Server processes started/i.test(desc)) return 'server_started';
  if (/Stopping FileMaker Server processes/i.test(desc)) return 'server_stopping';
  if (/FileMaker Server processes stopped/i.test(desc)) return 'server_stopped';
  if (/FileMaker Database Engine stopped/i.test(desc)) return 'engine_stopped';
  if (/FileMaker Database Engine started/i.test(desc)) return 'engine_started';

  if (/Consistency check/i.test(desc)) return 'consistency_check';

  return 'other';
}
