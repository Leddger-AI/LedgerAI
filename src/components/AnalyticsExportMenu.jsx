import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, FileJson, Loader2 } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FORMATS = [
  { id: 'csv', label: 'CSV', desc: 'Spreadsheet-compatible tabular data', icon: FileSpreadsheet, color: '#22C55E' },
  { id: 'json', label: 'JSON', desc: 'Raw structured data for developers', icon: FileJson, color: '#F59E0B' },
  { id: 'pdf', label: 'PDF', desc: 'Print-ready summary report', icon: FileText, color: '#EF4444' },
];

/**
 * Dropdown that triggers a local file download of an analytics export.
 *
 * Props:
 *  - endpoint: '/api/analytics/export/overview' or '/api/analytics/export/templates/:draftId'
 */
export default function AnalyticsExportMenu({ endpoint }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = async (format) => {
    setDownloading(format);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${API_BASE_URL}${endpoint}?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      // Pull filename from Content-Disposition, fall back to a sensible default.
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="([^"]+)"/);
      const fallback = `analytics-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      const filename = match ? match[1] : fallback;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="analytics-export-menu" ref={ref}>
      <button
        className="analytics-export-trigger"
        onClick={() => setOpen(o => !o)}
        disabled={downloading !== null}
        type="button"
      >
        {downloading ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
        {downloading ? `Exporting ${downloading.toUpperCase()}…` : 'Download'}
        {!downloading && <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="analytics-export-dropdown">
          {FORMATS.map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                className="analytics-export-option"
                onClick={() => handleDownload(f.id)}
                disabled={downloading !== null}
                type="button"
              >
                <Icon size={16} style={{ color: f.color, flexShrink: 0 }} />
                <div className="analytics-export-option-text">
                  <span className="analytics-export-option-label">{f.label}</span>
                  <span className="analytics-export-option-desc">{f.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {error && (
        <div className="analytics-export-error">
          {error}
        </div>
      )}
    </div>
  );
}
