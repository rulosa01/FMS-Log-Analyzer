// fmscwpc.log format (Cloud web publishing crash/diagnostic log):
// Timestamp [ThreadName] message
// Stack traces appear as continuation lines with frame numbers
// e.g.: 2024-03-20 16:44:41.339 -0400 [ExternalThread_12f4] GetSlot invalid slot level 2 index 51
//       2024-03-20 16:44:41.839 -0400 [ExternalThread_12f4] 0 Draco::StackCrawl::SaveStack + 79

import { parseTimestamp } from '../utils/dateUtils.js';

export function parseFmscwpcLog(text, onProgress) {
  const lines = text.split('\n');
  const entries = [];
  let currentEntry = null;

  const lineRegex = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+[+-]\d{4})\s+\[([^\]]+)\]\s+(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    if (onProgress && i % 10000 === 0) onProgress(i / lines.length);

    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(lineRegex);
    if (!match) {
      // Continuation line
      if (currentEntry) currentEntry.message += '\n' + line;
      continue;
    }

    const [, timestampStr, thread, message] = match;
    const timestamp = parseTimestamp(timestampStr);
    if (!timestamp) continue;

    // Check if this is a stack frame (starts with a number)
    const isStackFrame = /^\d+\s+/.test(message);

    if (isStackFrame && currentEntry && currentEntry.thread === thread) {
      // Append stack frame to current entry
      currentEntry.message += '\n' + message;
      currentEntry.stackDepth++;
    } else {
      // New entry
      if (currentEntry) entries.push(currentEntry);
      currentEntry = {
        timestamp,
        timestampRaw: timestampStr,
        thread,
        message,
        stackDepth: 0,
      };
    }
  }

  if (currentEntry) entries.push(currentEntry);
  return entries;
}
