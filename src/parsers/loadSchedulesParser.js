// LoadSchedules.log format (plain text, no timestamps):
// Loaded 4 schedules.
// Loaded schedule "Name", type "TYPE".
// File missing for schedule "Name": file:dbname

export function parseLoadSchedulesLog(text) {
  const lines = text.split('\n');
  const entries = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const entry = { message: line, scheduleName: null, scheduleType: null, status: 'info', missingFile: null };

    // "Loaded schedule "Name", type "TYPE"."
    const loadMatch = line.match(/Loaded schedule "([^"]+)",\s*type "([^"]+)"/);
    if (loadMatch) {
      entry.scheduleName = loadMatch[1];
      entry.scheduleType = loadMatch[2];
      entry.status = 'loaded';
    }

    // "File missing for schedule "Name": file:dbname"
    const missingMatch = line.match(/File missing for schedule "([^"]+)":\s*file:(\S+)/);
    if (missingMatch) {
      entry.scheduleName = missingMatch[1];
      entry.missingFile = missingMatch[2];
      entry.status = 'missing_file';
    }

    // "Loaded N schedules."
    const countMatch = line.match(/Loaded (\d+) schedules/);
    if (countMatch) {
      entry.status = 'summary';
    }

    entries.push(entry);
  }

  return entries;
}
