import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, FileSpreadsheet, Search, Trash2, Download, ExternalLink,
  Plus, Calendar, Table2, Columns3, HardDrive, X, AlertTriangle, Loader2,
} from 'lucide-react';
import { getAuthToken } from './supabaseAuth';
import * as XLSX from 'xlsx';
import './FilesView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FilesView() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [count, setCount] = useState(0);
  const [limit] = useState(20);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Not authenticated. Please sign in to view your files.');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/spreadsheets/metadata`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data.spreadsheets || []);
      setCount(data.count || 0);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleOpen = (fileId) => {
    navigate(`/dashboard/roster-studio?fileId=${fileId}`);
  };

  const handleExport = async (file) => {
    setExporting(file._id);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/spreadsheets/${file._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load file');
      const data = await res.json();
      const sheets = data.spreadsheet.sheets || [];

      const wb = XLSX.utils.book_new();
      for (const sheet of sheets) {
        let aoa = [];
        if (sheet.data && Array.isArray(sheet.data)) {
          aoa = sheet.data.map((row) =>
            (row || []).map((cell) => (cell ? (cell.v ?? cell.m ?? '') : ''))
          );
        } else if (sheet.celldata && Array.isArray(sheet.celldata)) {
          const maxR = Math.max(...sheet.celldata.map((cd) => cd.r));
          const maxC = Math.max(...sheet.celldata.map((cd) => cd.c));
          aoa = Array.from({ length: maxR + 1 }, () =>
            Array.from({ length: maxC + 1 }, () => '')
          );
          for (const cd of sheet.celldata) {
            aoa[cd.r][cd.c] = cd.v?.v ?? cd.v?.m ?? '';
          }
        }
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name || `Sheet${sheet.index + 1}`);
      }
      XLSX.writeFile(wb, `${file.name}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export file. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/spreadsheets/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setFiles((prev) => prev.filter((f) => f._id !== deleteTarget._id));
      setCount((prev) => prev - 1);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete file. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = files
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'createdAt') return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  const usagePct = Math.min((count / limit) * 100, 100);

  return (
    <div className="files-view-container">
      {/* Header */}
      <div className="files-view-header">
        <div className="files-view-title-row">
          <h2 className="files-view-title">
            <FolderOpen size={22} />
            Files
          </h2>
          <button className="files-new-btn" onClick={() => navigate('/dashboard/roster-studio')}>
            <Plus size={16} />
            New File
          </button>
        </div>
        <p className="files-view-subtitle">
          Your saved spreadsheet workspace — all cloud files in one place
        </p>
      </div>

      {/* Storage usage bar */}
      <div className="files-usage-bar-wrapper">
        <div className="files-usage-bar-header">
          <span className="files-usage-label">
            <HardDrive size={14} />
            Storage Usage
          </span>
          <span className="files-usage-count">
            {count} / {limit} files
          </span>
        </div>
        <div className="files-usage-bar-track">
          <div
            className={`files-usage-bar-fill ${usagePct >= 90 ? 'danger' : usagePct >= 70 ? 'warning' : ''}`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
      </div>

      {/* Search + Sort */}
      <div className="files-controls">
        <div className="files-search-wrapper">
          <Search size={16} className="files-search-icon" />
          <input
            type="text"
            placeholder="Search files by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="files-search-input"
          />
          {searchQuery && (
            <X size={14} className="files-search-clear" onClick={() => setSearchQuery('')} />
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="files-sort-select"
        >
          <option value="updatedAt">Last Modified</option>
          <option value="createdAt">Date Created</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="files-loading">
          <Loader2 size={32} className="files-spinner" />
          <p>Loading your files...</p>
        </div>
      ) : error ? (
        <div className="files-error">
          <AlertTriangle size={32} />
          <p>{error}</p>
          <button className="files-retry-btn" onClick={fetchFiles}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="files-empty">
          <FileSpreadsheet size={48} />
          <h3>{searchQuery ? 'No files match your search' : 'No files yet'}</h3>
          <p>{searchQuery ? 'Try a different search term.' : 'Create your first spreadsheet to get started.'}</p>
          {!searchQuery && (
            <button className="files-empty-cta" onClick={() => navigate('/dashboard/roster-studio')}>
              <Plus size={16} />
              Create New File
            </button>
          )}
        </div>
      ) : (
        <div className="files-grid">
          {filtered.map((file) => (
            <div key={file._id} className="file-card">
              <div className="file-card-top">
                <div className="file-card-icon">
                  <FileSpreadsheet size={24} />
                </div>
                <div className="file-card-name" title={file.name}>
                  {file.name}
                </div>
              </div>

              <div className="file-card-stats">
                <div className="file-stat">
                  <Table2 size={13} />
                  <span>{file.sheetCount} {file.sheetCount === 1 ? 'sheet' : 'sheets'}</span>
                </div>
                <div className="file-stat">
                  <Columns3 size={13} />
                  <span>{file.maxRows} rows × {file.maxCols} cols</span>
                </div>
                <div className="file-stat">
                  <HardDrive size={13} />
                  <span>{formatBytes(file.sizeBytes)}</span>
                </div>
              </div>

              <div className="file-card-dates">
                <div className="file-date-row">
                  <Calendar size={12} />
                  <span>Created: {formatFullDate(file.createdAt)}</span>
                </div>
                <div className="file-date-row">
                  <span className="file-date-relative">Modified {formatDate(file.updatedAt)}</span>
                </div>
              </div>

              <div className="file-card-actions">
                <button
                  className="file-action-btn primary"
                  onClick={() => handleOpen(file._id)}
                  title="Open in Roster Studio"
                >
                  <ExternalLink size={14} />
                  Open
                </button>
                <button
                  className="file-action-btn"
                  onClick={() => handleExport(file)}
                  disabled={exporting === file._id}
                  title="Export as .xlsx"
                >
                  {exporting === file._id ? (
                    <Loader2 size={14} className="files-spinner" />
                  ) : (
                    <Download size={14} />
                  )}
                  Export
                </button>
                <button
                  className="file-action-btn danger"
                  onClick={() => setDeleteTarget(file)}
                  title="Delete file"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="files-modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="files-modal" onClick={(e) => e.stopPropagation()}>
            <div className="files-modal-header">
              <h3>Delete File</h3>
              <X size={18} className="files-modal-close" onClick={() => !deleting && setDeleteTarget(null)} />
            </div>
            <div className="files-modal-body">
              <AlertTriangle size={36} className="files-modal-warning" />
              <p>
                Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
              </p>
              <p className="files-modal-subtext">
                This action cannot be undone. The file will be permanently removed from cloud storage.
                Export it first if you need a copy.
              </p>
            </div>
            <div className="files-modal-actions">
              <button className="files-modal-btn cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="files-modal-btn delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <><Loader2 size={14} className="files-spinner" /> Deleting...</>
                ) : (
                  <><Trash2 size={14} /> Delete Permanently</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
