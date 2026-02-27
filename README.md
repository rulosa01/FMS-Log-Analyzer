# FMS Log Analyzer

A client-side web application for analyzing FileMaker Server log files. Upload your logs and get interactive dashboards, charts, performance insights, and detailed breakdowns — all processed locally in your browser.

**[Live Demo](https://fms-log-analyzer.vercel.app)** (coming soon)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

### Supported Log Types

| Log | What It Analyzes |
|-----|-----------------|
| **Event.log** | Server events, errors, crashes, schedule runs, database open/close activity |
| **Access.log** | Client connections, disconnections, database access, denied attempts |
| **TopCallStats.log** | Most expensive remote calls with elapsed/wait/I/O time breakdown |
| **ClientStats.log** | Per-client resource consumption and anomaly detection |
| **Stats.log** | Aggregate server statistics — clients, cache, calls/sec, disk I/O |
| **scriptEvent.log** | Script execution errors, schedule failures, FM error codes |
| **fmdapi.log** | Data API requests — methods, endpoints, accounts, IPs, errors |

### Analysis Capabilities

- **Performance Insights** — Automatic bottleneck identification (Wait/I/O/Processing), slow call thresholds (>250ms / >1s), and actionable advice based on Claris best practices
- **Server Health Assessment** — Cache hit ratio monitoring (target: 100%), Remote Calls in Progress alerts (normal: 0-2), elapsed time spike detection, collection interval analysis
- **Critical Event Detection** — Process crash alerts (Event 701), client disconnect clustering analysis (server-side vs Wi-Fi), schedule abort vs timeout distinction (Event 690)
- **Anomaly Detection** — Clients with resource usage >2 standard deviations above the mean are flagged
- **Interactive Filtering** — Clickable stat cards, severity/category filters, date range presets
- **Drill-Down Panels** — Data API IP address and account breakdowns with click-to-filter
- **Time Breakdowns** — Per-client and per-operation Wait vs I/O vs Processing stacked charts
- **Heatmaps** — Day-of-week x hour-of-day visualization of expensive calls
- **CSV Export** — Export any table to CSV for further analysis
- **Dark Mode** — Full dark mode support with system preference detection

### Privacy

All parsing happens entirely in your browser. No data is uploaded to any server. No cookies, no tracking. Works offline once loaded.

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/rulosa01/FMS-Log-Analyzer.git
cd fms-log-analyzer

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and drag in your FMS log files.

## Build & Deploy

```bash
# Production build
npm run build

# Preview production build locally
npm run preview
```

The `dist/` folder is ready to deploy to any static host. Built for one-click deployment on **Vercel**, **Netlify**, **Cloudflare Pages**, or **GitHub Pages**.

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rulosa01/FMS-Log-Analyzer)

---

## Performance Troubleshooting Workflow

The recommended approach for diagnosing FileMaker Server performance issues:

```
Stats.log          →  Identify WHEN performance degrades
    ↓
ClientStats.log    →  Find WHICH client is responsible
    ↓
TopCallStats.log   →  Identify the specific expensive operation
    ↓
DDR / FMPerception →  Map internal table IDs to actual schema names
```

### Key Metrics to Watch

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Cache Hit % | 99-100% | 95-99% | <95% |
| Remote Calls in Progress | 0-2 | 3-4 | 5+ |
| Elapsed Time per Call | Stable baseline | 5x spikes above avg | Sustained elevation |

### Understanding Time Breakdown

```
Elapsed Time = Wait Time + I/O Time + Processing Time
```

- **Wait Time** — Record locking contention. Look for long-running scripts, "funnel table" architectures, or unstored calculations on related data
- **I/O Time** — Disk bottlenecks. Increase database cache, upgrade to SSD/NVMe, or optimize finds on unindexed fields
- **Processing Time** — CPU/network overhead. Check for complex calculations, wide-column layouts, or large transferred record sets

---

## Tech Stack

- **[React 19](https://react.dev)** — UI framework
- **[Vite 7](https://vite.dev)** — Build tool
- **[Tailwind CSS 4](https://tailwindcss.com)** — Styling
- **[Recharts](https://recharts.org)** — Charts and visualizations
- **[Lucide React](https://lucide.dev)** — Icons

## Project Structure

```
src/
├── App.jsx                  # Main app layout, routing, date filter
├── components/
│   ├── FileUploader.jsx     # Upload landing page with tips & resources
│   ├── DataTable.jsx        # Sortable, filterable, paginated table with CSV export
│   ├── DateRangeFilter.jsx  # Date range with quick presets
│   └── StatCard.jsx         # Clickable metric cards
├── parsers/
│   ├── index.js             # Main entry — file reading, line ending normalization
│   ├── logDetector.js       # Auto-detection of log type from filename/content
│   ├── eventLogParser.js    # Event.log parser + categorization
│   ├── accessLogParser.js   # Access.log parser + structured data extraction
│   ├── topCallStatsParser.js # TopCallStats parser + target parsing
│   ├── clientStatsParser.js # ClientStats parser
│   ├── statsParser.js       # Stats.log parser (18 columns)
│   ├── scriptEventParser.js # scriptEvent.log parser
│   └── fmdapiParser.js      # fmdapi.log parser
├── views/
│   ├── EventLogView.jsx     # Server info, critical alerts, schedule summary
│   ├── AccessLogView.jsx    # User activity, client types, database popularity
│   ├── TopCallStatsView.jsx # Performance insights, bottleneck analysis, heatmap
│   ├── ClientStatsView.jsx  # Per-client breakdown, anomaly detection
│   ├── StatsView.jsx        # Health assessment, client/performance trends
│   ├── ScriptEventView.jsx  # Script errors, FM error code breakdown
│   └── FmdapiView.jsx       # IP/account drill-down, method breakdown
└── utils/
    ├── dateUtils.js         # FMS timestamp parsing, formatting, duration display
    ├── exportUtils.js       # CSV export with proper escaping
    └── hooks.js             # Dark mode hook with localStorage persistence
```

## FMS Log Locations

| OS | Default Path |
|----|-------------|
| **macOS** | `/Library/FileMaker Server/Logs/` |
| **Windows** | `C:\Program Files\FileMaker\FileMaker Server\Logs\` |
| **Linux** | `/opt/FileMaker/FileMaker Server/Logs/` |

Logs roll at ~40MB. Upload both current and `-old.log` files for longer history.

> **Note:** `Stats.log` and `ClientStats.log` are **not enabled by default**. Enable them via Admin Console or `fmsadmin` CLI.

---

## Resources

- [Claris: Monitoring Log Files](https://help.claris.com/en/server-help/content/monitor-log-files.html)
- [Soliant: FileMaker Server Statistics Logging](https://www.soliantconsulting.com/blog/filemaker-server-statistics-logging/)
- [Beezwax: Quick FileMaker Stats Log Summaries](https://blog.beezwax.net/quick-filemaker-stats-log-summaries/)
- [Portage Bay: Top Calls Log Analysis](https://www.portagebay.com/blog/top-calls-log-analysis/)

---

## License

[MIT](LICENSE)

---

## Disclaimer

This tool is provided "as-is" without warranty of any kind. The authors make no guarantees about the accuracy, completeness, or reliability of the analysis provided. Use at your own risk. This is not affiliated with or endorsed by Claris International Inc. or FileMaker, Inc.
