import { useState, useCallback } from 'react';
import { Upload, FileText, X, Sparkles, Shield, AlertCircle, Heart, ExternalLink, AlertTriangle, Moon, Sun } from 'lucide-react';
import { parseLogFile, LOG_TYPE_LABELS } from '../parsers/index.js';
import { detectLogType } from '../parsers/logDetector.js';

export default function FileUploader({ onDataLoaded, darkMode, toggleDarkMode }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = useCallback((e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const newFiles = Array.from(e.dataTransfer.files || []);
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const parseFiles = useCallback(async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const results = [];
      for (let i = 0; i < files.length; i++) {
        setProgress((i / files.length) * 100);
        const result = await parseLogFile(files[i], (p) => {
          setProgress(((i + p) / files.length) * 100);
        });
        results.push(result);
      }
      setProgress(100);
      onDataLoaded(results);
    } catch (err) {
      setError(err.message || 'Failed to parse log files');
    } finally {
      setLoading(false);
    }
  }, [files, onDataLoaded]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className={`min-h-screen py-8 px-4 overflow-auto transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center relative">
          <button
            onClick={toggleDarkMode}
            className={`absolute right-0 top-0 p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/25">
            <FileText size={32} className="text-white" />
          </div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>FMS Log Analyzer</h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Analyze your FileMaker Server log files</p>
        </div>

        {/* Upload + About */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Card */}
          <div className={`rounded-2xl shadow-xl p-6 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <Upload size={20} className="text-blue-500" />
              Upload Log Files
            </h2>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all group ${darkMode ? 'border-gray-600 hover:border-blue-500 hover:bg-blue-900/20' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload size={32} className={`mx-auto mb-2 group-hover:text-blue-500 transition-colors ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <label className="cursor-pointer">
                <span className="text-blue-500 hover:text-blue-600 font-medium transition-colors">Choose log files</span>
                <input
                  type="file"
                  multiple
                  accept=".log,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>or drag and drop</p>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2 max-h-40 overflow-auto">
                {files.map((file, i) => {
                  const type = detectLogType(file.name, '');
                  return (
                    <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <FileText size={16} className={darkMode ? 'text-gray-400' : 'text-gray-400'} />
                      <span className={`flex-1 text-sm truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{file.name}</span>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatSize(file.size)}
                        {type !== 'unknown' && <span className="ml-2 text-blue-500">{LOG_TYPE_LABELS[type]}</span>}
                      </span>
                      <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <div className={`mt-4 rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${darkMode ? 'bg-red-900/30 border border-red-800 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {loading && (
              <div className="mt-3">
                <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Parsing... {Math.round(progress)}%</p>
              </div>
            )}

            <button
              onClick={parseFiles}
              disabled={loading || files.length === 0}
              className={`mt-4 w-full py-3 rounded-xl font-medium transition-all ${
                loading || files.length === 0
                  ? darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={18} className="animate-spin" />
                  Parsing...
                </span>
              ) : `Analyze ${files.length} ${files.length === 1 ? 'file' : 'files'}`}
            </button>
          </div>

          {/* About Card */}
          <div className={`rounded-2xl shadow-xl p-6 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <Heart size={20} className="text-pink-500" />
              About This Tool
            </h2>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              FMS Log Analyzer is a <strong>free, open-source tool</strong> for the FileMaker community.
              Upload your server logs and get interactive dashboards, charts, performance insights,
              and detailed breakdowns &mdash; all processed locally in your browser.
            </p>

            <div className={`mt-4 space-y-1.5 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <p className={`font-medium text-sm mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Supported Log Types:</p>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> Event.log &mdash; Server events, errors, schedules</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Access.log &mdash; Client connections &amp; database access</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> TopCallStats.log &mdash; Expensive remote call analysis</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" /> ClientStats.log &mdash; Per-client resource usage</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" /> Stats.log &mdash; Aggregate server statistics</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> Script event, Data API, and more</div>
            </div>

            <div className={`mt-4 p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <strong>Prefer to run it locally?</strong> Download the source code and run it yourself:
              </p>
              <a
                href="https://github.com/rulosa01/FMS-Log-Analyzer"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                <ExternalLink size={14} />
                github.com/rulosa01/FMS-Log-Analyzer
              </a>
            </div>
          </div>
        </div>

        {/* Privacy & Disclaimer Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Privacy Card */}
          <div className={`rounded-2xl shadow-xl p-6 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <Shield size={20} className="text-emerald-500" />
              Privacy &amp; Data Storage
            </h2>
            <div className={`rounded-lg p-3 mb-4 ${darkMode ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'}`}>
              <p className={`font-medium text-sm ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>Your data never leaves your browser.</p>
            </div>
            <ul className={`text-sm space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">{'\u2713'}</span>
                <span>All log files are processed <strong>entirely in your browser</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">{'\u2713'}</span>
                <span>No data is uploaded to any server &mdash; there is no server</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">{'\u2713'}</span>
                <span>No cookies, no tracking, no analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">{'\u2713'}</span>
                <span>When you close or refresh the page, all parsed data is gone</span>
              </li>
            </ul>
          </div>

          {/* Disclaimer Card */}
          <div className={`rounded-2xl shadow-xl p-6 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <AlertTriangle size={20} className="text-amber-500" />
              Disclaimer
            </h2>
            <div className={`rounded-lg p-4 text-sm ${darkMode ? 'bg-amber-900/30 border border-amber-800 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              <p className="mb-2">
                <strong>This tool is provided &ldquo;as-is&rdquo; without warranty of any kind.</strong>
              </p>
              <p>
                The authors make no guarantees about the accuracy, completeness, or reliability of the analysis
                provided. Use at your own risk. This is not affiliated with or endorsed by Claris International Inc.
                or FileMaker, Inc.
              </p>
            </div>
          </div>
        </div>

        {/* Tips & Workflow */}
        <div className={`rounded-2xl shadow-xl p-6 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Tips &amp; Workflow</h2>

          {/* Workflow */}
          <div className={`rounded-xl p-4 mb-4 ${darkMode ? 'bg-gradient-to-r from-blue-900/30 to-violet-900/30 border border-gray-700' : 'bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100'}`}>
            <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Recommended Performance Troubleshooting Workflow</p>
            <div className={`flex items-center gap-1.5 text-[11px] flex-wrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <span className={`px-2 py-0.5 rounded font-medium ${darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>Stats.log</span>
              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>&rarr;</span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Identify when performance degrades</span>
              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>&rarr;</span>
              <span className={`px-2 py-0.5 rounded font-medium ${darkMode ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>ClientStats.log</span>
              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>&rarr;</span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Find which client is responsible</span>
              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>&rarr;</span>
              <span className={`px-2 py-0.5 rounded font-medium ${darkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>TopCallStats.log</span>
              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>&rarr;</span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Identify the specific expensive operation</span>
            </div>
          </div>

          {/* Tips */}
          <ul className={`space-y-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>&bull;</span>
              Upload both current and -old.log files for longer history
            </li>
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>&bull;</span>
              Large files (40MB+) may take a moment to parse &mdash; standard logs roll at ~40MB
            </li>
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>&bull;</span>
              For cyclical businesses, ensure logs cover peak-load periods &mdash; <strong>2 weeks minimum</strong> for meaningful baselining
            </li>
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>&bull;</span>
              <strong>Stats.log</strong> and <strong>ClientStats.log</strong> must be enabled via Admin Console or <code className={`text-[10px] px-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>fmsadmin</code>
            </li>
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>&bull;</span>
              Check the Logs folder for <strong>.DMP (crash dump) files</strong> &mdash; these indicate internal exceptions and often precede outages
            </li>
          </ul>

          {/* Resource links */}
          <div className="flex flex-wrap gap-2 mt-4 text-[11px]">
            <a href="https://help.claris.com/en/server-help/content/monitor-log-files.html" target="_blank" rel="noopener noreferrer"
              className={`px-2.5 py-1 rounded-lg transition-colors ${darkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              Claris Log Documentation
            </a>
            <a href="https://www.soliantconsulting.com/blog/filemaker-server-statistics-logging/" target="_blank" rel="noopener noreferrer"
              className={`px-2.5 py-1 rounded-lg transition-colors ${darkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              Soliant: TopCallStats Deep Dive
            </a>
            <a href="https://blog.beezwax.net/quick-filemaker-stats-log-summaries/" target="_blank" rel="noopener noreferrer"
              className={`px-2.5 py-1 rounded-lg transition-colors ${darkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              Beezwax: Quick Stats Log Summaries
            </a>
            <a href="https://www.portagebay.com/blog/top-calls-log-analysis/" target="_blank" rel="noopener noreferrer"
              className={`px-2.5 py-1 rounded-lg transition-colors ${darkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              Portage Bay: Top Calls Log Analysis
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className={`text-center text-sm pt-4 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          Made with {'\u2764\uFE0F'} for the FileMaker community
        </div>
      </div>
    </div>
  );
}
