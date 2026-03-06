// fac.log format (Admin Console log, space-delimited):
// Timestamp -0500 - severity:   source   IP   component   category   errorCode   "message"
// e.g.: 2026-02-14 00:02:00 -0500 - warn:   fmi   127.0.0.1   notifications   general   n/a   "New system notification generated, type: CPU_USAGE_EXCEED_SOFT_LIMIT"

export function parseFacLog(text, onProgress) {
  const lines = text.split('\n');
  const entries = [];

  // Match: timestamp with timezone, then " - ", then rest
  const lineRegex = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+([+-]\d{4})\s+-\s+(\w+):\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+"(.+)"$/;

  for (let i = 0; i < lines.length; i++) {
    if (onProgress && i % 10000 === 0) onProgress(i / lines.length);

    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(lineRegex);
    if (!match) continue;

    const [, dateStr, tz, severity, source, ip, component, category, errorCode, message] = match;

    // Parse timestamp: "2026-02-14 00:02:00" + "-0500"
    const ts = new Date(`${dateStr.replace(' ', 'T')}${tz.slice(0, 3)}:${tz.slice(3)}`);
    if (isNaN(ts)) continue;

    // Extract notification type if present
    let notificationType = null;
    const notifMatch = message.match(/type:\s*(\S+)/);
    if (notifMatch) notificationType = notifMatch[1];

    entries.push({
      timestamp: ts,
      timestampRaw: `${dateStr} ${tz}`,
      severity,
      source,
      ip,
      component,
      category,
      errorCode,
      message,
      notificationType,
    });
  }

  return entries;
}
