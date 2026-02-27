import { parseTimestamp } from '../utils/dateUtils.js';

// Access.log format (tab-delimited, no header):
// Same format as Event.log: Timestamp\tSeverity\tEvent ID\tServer\tDescription
// The description contains connection info like:
//   Client "name (type)" opening database "DB" as "user".
//   Client "name (type)" closing a connection.

export function parseAccessLog(text, onProgress) {
  const lines = text.split('\n');
  const entries = [];
  let currentEntry = null;

  for (let i = 0; i < lines.length; i++) {
    if (onProgress && i % 10000 === 0) onProgress(i / lines.length);

    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+[+-]\d{4})\t(Information|Warning|Error)\t(\d+)\t([^\t]*)\t(.*)$/);

    if (match) {
      if (currentEntry) entries.push(currentEntry);

      const [, timestampStr, severity, eventId, server, description] = match;
      const parsed = parseAccessDescription(description, parseInt(eventId, 10));

      currentEntry = {
        timestamp: parseTimestamp(timestampStr),
        timestampRaw: timestampStr,
        severity,
        eventId: parseInt(eventId, 10),
        server,
        description,
        ...parsed,
      };
    } else if (currentEntry) {
      currentEntry.description += '\n' + line;
    }
  }

  if (currentEntry) entries.push(currentEntry);
  return entries;
}

function parseAccessDescription(desc, eventId) {
  const result = {
    action: 'unknown',
    clientName: null,
    clientType: null,
    database: null,
    accountName: null,
    ip: null,
    appVersion: null,
  };

  // Extract client name from "Client "..." pattern
  const clientMatch = desc.match(/Client "([^"]+)"/);
  if (clientMatch) {
    result.clientName = clientMatch[1];

    // Extract client type from parenthetical in the client name
    const typeMatch = result.clientName.match(/\(([^)]+)\)$/);
    if (typeMatch) {
      result.clientType = typeMatch[1];
    }
  }

  // Event IDs define the action type
  switch (eventId) {
    case 638: // Opening a connection
      result.action = 'connect';
      // Extract connection source and app version
      {
        const connMatch = desc.match(/opening a connection from "([^"]*)" using "([^"]*)"/);
        if (connMatch) {
          result.clientType = connMatch[1] || result.clientType;
          result.appVersion = connMatch[2];
        }
      }
      break;
    case 22: // Closing a connection
      result.action = 'disconnect';
      break;
    case 94: // Opening database
      result.action = 'open_db';
      {
        const dbMatch = desc.match(/opening database "([^"]+)" as "([^"]*)"/);
        if (dbMatch) {
          result.database = dbMatch[1];
          result.accountName = dbMatch[2];
        }
      }
      break;
    case 98: // Closing database
      result.action = 'close_db';
      {
        const dbMatch = desc.match(/closing database "([^"]+)" as "([^"]*)"/);
        if (dbMatch) {
          result.database = dbMatch[1];
          result.accountName = dbMatch[2];
        }
      }
      break;
    case 20: // Authentication failed
    case 21: // Access denied
      result.action = 'denied';
      break;
    default:
      // Try to detect from description
      if (/opening a connection/i.test(desc)) result.action = 'connect';
      else if (/closing a connection/i.test(desc)) result.action = 'disconnect';
      else if (/opening database/i.test(desc)) result.action = 'open_db';
      else if (/closing database/i.test(desc)) result.action = 'close_db';
      else if (/denied|failed|not authorized/i.test(desc)) result.action = 'denied';
  }

  // Extract IP from brackets in client name, e.g. "User (Machine) [1.2.3.4]"
  const ipMatch = desc.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
  if (ipMatch) {
    result.ip = ipMatch[1];
  }

  return result;
}
