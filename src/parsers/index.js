import { detectLogType } from './logDetector.js';
import { parseEventLog } from './eventLogParser.js';
import { parseAccessLog } from './accessLogParser.js';
import { parseTopCallStatsLog } from './topCallStatsParser.js';
import { parseClientStatsLog } from './clientStatsParser.js';
import { parseStatsLog } from './statsParser.js';
import { parseScriptEventLog } from './scriptEventParser.js';
import { parseFmdapiLog } from './fmdapiParser.js';

const PARSERS = {
  event: parseEventLog,
  access: parseAccessLog,
  topcallstats: parseTopCallStatsLog,
  clientstats: parseClientStatsLog,
  stats: parseStatsLog,
  scriptevent: parseScriptEventLog,
  fmdapi: parseFmdapiLog,
};

export async function parseLogFile(file, onProgress) {
  const rawText = await readFileText(file);
  // Normalize \r\n (Windows/FMS) line endings to \n
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const firstLine = text.split('\n')[0] || '';
  const logType = detectLogType(file.name, firstLine);

  const parser = PARSERS[logType];
  if (!parser) {
    return {
      filename: file.name,
      type: logType,
      entries: [],
      error: `No parser available for log type: ${logType}`,
    };
  }

  const entries = parser(text, onProgress);

  return {
    filename: file.name,
    type: logType,
    entries,
    entryCount: entries.length,
    fileSize: file.size,
  };
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}

export { detectLogType } from './logDetector.js';
export { LOG_TYPE_LABELS, LOG_TYPE_COLORS } from './logDetector.js';
