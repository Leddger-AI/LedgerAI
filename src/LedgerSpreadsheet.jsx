import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import LuckyExcel from 'luckyexcel';
import { Upload, Plus, Sparkles, Save, FolderOpen, Trash2, Cloud, AlertTriangle, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getAuthToken } from './supabaseAuth';
import './RosterStudioView.css';

const TOOLBAR_ITEMS = [
  'undo', 'redo', 'format-painter', 'clear-format', '|',
  'currency-format', 'percentage-format', 'number-decrease', 'number-increase', 'format', 'font-size', '|',
  'bold', 'italic', 'strike-through', 'underline', '|',
  'font-color', 'background', 'border', 'merge-cell', '|',
  'horizontal-align', 'vertical-align', 'text-wrap', 'text-rotation', '|',
  'freeze', 'sort', 'image', 'comment', 'quick-formula',
];

const CELL_CONTEXT_MENU = [
  'copy', 'paste', '|',
  'insert-row', 'insert-column',
  'delete-row', 'delete-column', 'delete-cell',
  'hide-row', 'hide-column',
  'clear', 'sort', 'filter',
  'chart', 'image', 'link', 'data', 'cell-format',
];

const SHEET_TAB_CONTEXT_MENU = [
  'delete', 'copy', 'rename', 'color', 'hide', '|', 'move',
];

const DEFAULT_SHEET = [
  {
    name: 'Sheet1',
    celldata: [],
    row: 200,
    column: 26,
    status: 1,
    order: 0,
    index: 0
  }
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reads a cell's display value from either the dense `data` matrix or the
// sparse `celldata` array, whichever the active sheet happens to have.
const getCellText = (sheet, r, c) => {
  if (sheet.data && sheet.data[r] && sheet.data[r][c]) {
    const cell = sheet.data[r][c];
    return String(cell?.m ?? cell?.v ?? '').trim();
  }
  const found = sheet.celldata?.find((cd) => cd.r === r && cd.c === c);
  return String(found?.v?.m ?? found?.v?.v ?? '').trim();
};

const getSheetRowCount = (sheet) => {
  if (sheet.data) return sheet.data.length;
  if (sheet.celldata?.length) return Math.max(...sheet.celldata.map((cd) => cd.r)) + 1;
  return 0;
};

export default function LedgerSpreadsheet() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(DEFAULT_SHEET);
  const [importVersion, setImportVersion] = useState(0);
  const [importError, setImportError] = useState(null);
  const [queueToast, setQueueToast] = useState(null);
  const [aiToast, setAiToast] = useState(null);
  const fileInputRef = useRef(null);
  const workbookRef = useRef(null);
  const gridContainerRef = useRef(null);
  const autoLoadTriggered = useRef(false);

  // Cloud save/load state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [cloudFiles, setCloudFiles] = useState([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState({ count: 0, limit: 20 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showExportConfirm, setShowExportConfirm] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Auto-load file from ?fileId= URL param (used by FilesView "Open" action)
  useEffect(() => {
    if (autoLoadTriggered.current) return;
    const fileId = searchParams.get('fileId');
    if (!fileId) return;
    autoLoadTriggered.current = true;

    (async () => {
      setCloudLoading(true);
      try {
        const token = await getAuthToken();
        if (!token) return;
        const response = await fetch(`${API_BASE}/api/spreadsheets/${fileId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const result = await response.json();
        if (response.ok && result.spreadsheet?.sheets) {
          setData(result.spreadsheet.sheets);
          setImportVersion((v) => v + 1);
          setQueueToast({ type: 'success', message: `Loaded "${result.spreadsheet.name}" from cloud.` });
        }
      } catch (err) {
        console.error('Auto-load file error:', err);
        setQueueToast({ type: 'error', message: 'Failed to auto-load file: ' + err.message });
      } finally {
        setCloudLoading(false);
      }
    })();
  }, [searchParams]);

  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      const scrollbarY = container.querySelector('.luckysheet-scrollbar-y');
      const scrollbarX = container.querySelector('.luckysheet-scrollbar-x');
      if (!scrollbarY && !scrollbarX) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.deltaY !== 0 && scrollbarY) {
        scrollbarY.scrollTop = Math.max(0, scrollbarY.scrollTop + e.deltaY);
      }
      if (e.deltaX !== 0 && scrollbarX) {
        scrollbarX.scrollLeft = Math.max(0, scrollbarX.scrollLeft + e.deltaX);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => container.removeEventListener('wheel', onWheel, { capture: true });
  }, [importVersion]);

  const handleAskAI = useCallback(() => {
    setAiToast('AI assistance is coming soon.');
  }, []);

  const handleAddSheet = useCallback(() => {
    workbookRef.current?.addSheet?.();
  }, []);

  React.useEffect(() => {
    if (!aiToast) return;
    const timer = setTimeout(() => setAiToast(null), 3000);
    return () => clearTimeout(timer);
  }, [aiToast]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);

    LuckyExcel.transformExcelToLucky(
      file,
      (exportJson) => {
        if (!exportJson.sheets || exportJson.sheets.length === 0) {
          setImportError('Failed to read the content of this file. Only .xlsx files are supported.');
          return;
        }
        setData(exportJson.sheets);
        setImportVersion((v) => v + 1);
      },
      (err) => {
        console.error('LuckyExcel import failed:', err);
        setImportError('Import failed. Please make sure this is a valid .xlsx file.');
      }
    );

    e.target.value = '';
  }, []);

  const handleSaveToFile = useCallback(() => {
    const sheets = workbookRef.current?.getAllSheets?.();
    if (!sheets || sheets.length === 0) {
      setQueueToast({ type: 'error', message: 'No sheet data found.' });
      return;
    }

    const wb = XLSX.utils.book_new();

    sheets.forEach((sheet) => {
      const rowCount = getSheetRowCount(sheet);
      const colCount = sheet.column || 26;
      const aoa = [];

      for (let r = 0; r < rowCount; r++) {
        const row = [];
        for (let c = 0; c < colCount; c++) {
          row.push(getCellText(sheet, r, c) || '');
        }
        aoa.push(row);
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name || `Sheet${sheet.order + 1}`);
    });

    XLSX.writeFile(wb, 'roster-studio.xlsx');
    setQueueToast({ type: 'success', message: 'Saved to roster-studio.xlsx' });
  }, []);

  // --- CLOUD SAVE / LOAD / DELETE ---

  const handleSaveToCloud = useCallback(async () => {
    const sheets = workbookRef.current?.getAllSheets?.();
    if (!sheets || sheets.length === 0) {
      setQueueToast({ type: 'error', message: 'No sheet data found.' });
      return;
    }
    if (!saveName.trim()) {
      setQueueToast({ type: 'error', message: 'Please enter a file name.' });
      return;
    }

    setCloudLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setQueueToast({ type: 'error', message: 'Not authenticated.' });
        return;
      }

      const response = await fetch(`${API_BASE}/api/spreadsheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: saveName.trim(), sheets }),
      });

      const result = await response.json();

      if (response.status === 409) {
        setShowSaveModal(false);
        setLimitInfo({ count: result.limit || 20, limit: result.limit || 20 });
        setShowLimitModal(true);
        setQueueToast({ type: 'error', message: result.message || 'Spreadsheet limit reached.' });
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save');
      }

      setShowSaveModal(false);
      setSaveName('');
      setQueueToast({ type: 'success', message: `Saved "${saveName.trim()}" to cloud.` });
    } catch (err) {
      console.error('Cloud save error:', err);
      setQueueToast({ type: 'error', message: 'Cloud save failed: ' + err.message });
    } finally {
      setCloudLoading(false);
    }
  }, [saveName]);

  const handleLoadList = useCallback(async () => {
    setCloudLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setQueueToast({ type: 'error', message: 'Not authenticated.' });
        return;
      }

      const response = await fetch(`${API_BASE}/api/spreadsheets`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok) {
        setCloudFiles(result.spreadsheets || []);
        setShowLoadModal(true);
      } else {
        throw new Error(result.error || 'Failed to load list');
      }
    } catch (err) {
      console.error('Load list error:', err);
      setQueueToast({ type: 'error', message: 'Failed to load file list.' });
    } finally {
      setCloudLoading(false);
    }
  }, []);

  const handleLoadFile = useCallback(async (id, name) => {
    setCloudLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/spreadsheets/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok && result.spreadsheet?.sheets) {
        setData(result.spreadsheet.sheets);
        setImportVersion((v) => v + 1);
        setShowLoadModal(false);
        setQueueToast({ type: 'success', message: `Loaded "${name}" from cloud.` });
      } else {
        throw new Error(result.error || 'Failed to load');
      }
    } catch (err) {
      console.error('Load file error:', err);
      setQueueToast({ type: 'error', message: 'Failed to load file: ' + err.message });
    } finally {
      setCloudLoading(false);
    }
  }, []);

  const handleExportAndDelete = useCallback((id, name) => {
    setShowExportConfirm({ id, name });
  }, []);

  const handleConfirmExportDelete = useCallback(async () => {
    if (!showExportConfirm) return;
    const { id, name } = showExportConfirm;

    // Export first
    const sheets = workbookRef.current?.getAllSheets?.();
    if (sheets && sheets.length > 0) {
      const wb = XLSX.utils.book_new();
      sheets.forEach((sheet) => {
        const rowCount = getSheetRowCount(sheet);
        const colCount = sheet.column || 26;
        const aoa = [];
        for (let r = 0; r < rowCount; r++) {
          const row = [];
          for (let c = 0; c < colCount; c++) {
            row.push(getCellText(sheet, r, c) || '');
          }
          aoa.push(row);
        }
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name || `Sheet${sheet.order + 1}`);
      });
      XLSX.writeFile(wb, `${name}.xlsx`);
    }

    // Then delete from cloud
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/spreadsheets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setQueueToast({ type: 'success', message: `Exported and deleted "${name}".` });
        handleLoadList();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setQueueToast({ type: 'error', message: 'Delete failed: ' + err.message });
    } finally {
      setShowExportConfirm(null);
    }
  }, [showExportConfirm]);

  const handleDeleteDirect = useCallback(async (id, name) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/spreadsheets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setQueueToast({ type: 'success', message: `Deleted "${name}" from cloud.` });
        handleLoadList();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setQueueToast({ type: 'error', message: 'Delete failed: ' + err.message });
    }
  }, []);

  React.useEffect(() => {
    if (!queueToast) return;
    const timer = setTimeout(() => setQueueToast(null), 4000);
    return () => clearTimeout(timer);
  }, [queueToast]);

  return (
    <div className="roster-window">
      {/* Toolbar: Import + Add Sheet + Ask AI */}
      <div className="roster-toolbar">
        <div className="roster-toolbar-left">
          <button type="button" className="roster-btn" onClick={handleUploadClick}>
            <Upload size={14} />
            Import Excel File
          </button>
          <button type="button" className="roster-add-sheet-btn" onClick={handleAddSheet} title="Add sheet">
            <Plus size={14} />
            Add Sheet
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {aiToast && <span className="roster-toast" style={{ color: '#64748B' }}>{aiToast}</span>}
        </div>

        <button type="button" className="roster-ask-ai-btn" onClick={handleAskAI}>
          <Sparkles size={14} />
          Ask AI
        </button>
      </div>

      {importError && (
        <div className="roster-import-error">{importError}</div>
      )}

      {/* Grid */}
      <div className="roster-grid-area" ref={gridContainerRef}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Workbook
            ref={workbookRef}
            key={importVersion}
            data={data}
            showToolbar
            showFormulaBar
            showSheetTabs
            allowEdit
            lang="en"
            toolbarItems={TOOLBAR_ITEMS}
            cellContextMenu={CELL_CONTEXT_MENU}
            sheetTabContextMenu={SHEET_TAB_CONTEXT_MENU}
          />
        </div>
      </div>

      {/* Footer: Save to File + Save to Cloud + Load from Cloud */}
      <div className="roster-footer">
        <button type="button" className="roster-launch-btn" onClick={handleSaveToFile}>
          <Save size={14} />
          Save to File
        </button>
        <button type="button" className="roster-btn" onClick={() => setShowSaveModal(true)} style={{ marginLeft: '8px' }}>
          <Cloud size={14} />
          Save to Cloud
        </button>
        <button type="button" className="roster-btn" onClick={handleLoadList} style={{ marginLeft: '8px' }}>
          <FolderOpen size={14} />
          Load from Cloud
        </button>

        {queueToast && (
          <span className={`roster-toast ${queueToast.type}`}>
            {queueToast.message}
          </span>
        )}
      </div>

      {/* --- SAVE TO CLOUD MODAL --- */}
      {showSaveModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ maxWidth: '400px', padding: '24px', borderRadius: '12px', background: 'var(--bg-secondary, #1a1d1d)', border: '1px solid var(--border-color, #333)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cloud size={18} /> Save to Cloud
              </h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary, #888)' }} onClick={() => setShowSaveModal(false)} />
            </div>
            <input
              type="text"
              placeholder="Enter file name..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveToCloud()}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #444)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary, #fff)', fontSize: '14px', marginBottom: '16px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="alert-btn secondary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color, #444)', background: 'transparent', color: 'var(--text-primary, #fff)' }} onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
              <button className="alert-btn primary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: '#3B82F6', color: '#fff', fontWeight: 600 }} onClick={handleSaveToCloud} disabled={cloudLoading}>
                {cloudLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LOAD FROM CLOUD MODAL --- */}
      {showLoadModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ maxWidth: '500px', maxHeight: '70vh', padding: '24px', borderRadius: '12px', background: 'var(--bg-secondary, #1a1d1d)', border: '1px solid var(--border-color, #333)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={18} /> Cloud Files ({cloudFiles.length}/20)
              </h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary, #888)' }} onClick={() => setShowLoadModal(false)} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {cloudFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted, #666)', fontSize: '14px' }}>
                  No saved files found.
                </div>
              ) : (
                cloudFiles.map((file) => (
                  <div key={file._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #333)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #fff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #666)' }}>{new Date(file.updatedAt).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                      <button title="Load" onClick={() => handleLoadFile(file._id, file.name)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#3B82F6', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        Load
                      </button>
                      <button title="Export & Delete" onClick={() => handleExportAndDelete(file._id, file.name)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#F59E0B', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        <Download size={12} />
                      </button>
                      <button title="Delete" onClick={() => setDeleteTarget(file)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="alert-btn secondary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color, #444)', background: 'transparent', color: 'var(--text-primary, #fff)' }} onClick={() => setShowLoadModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIMIT REACHED MODAL --- */}
      {showLimitModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ maxWidth: '450px', padding: '24px', borderRadius: '12px', background: 'var(--bg-secondary, #1a1d1d)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> Storage Limit Reached
              </h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary, #888)' }} onClick={() => setShowLimitModal(false)} />
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary, #aaa)', lineHeight: '1.6', marginBottom: '16px' }}>
              You have reached the maximum of <strong style={{ color: '#F59E0B' }}>{limitInfo.limit} spreadsheets</strong> stored in the cloud.
              <br /><br />
              To save new files, please <strong>export</strong> existing files to your computer and <strong>delete</strong> them from LedgerAI to free up space.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="alert-btn primary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: '#3B82F6', color: '#fff', fontWeight: 600 }} onClick={() => { setShowLimitModal(false); handleLoadList(); }}>
                Manage Files
              </button>
              <button className="alert-btn secondary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color, #444)', background: 'transparent', color: 'var(--text-primary, #fff)' }} onClick={() => setShowLimitModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteTarget && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ maxWidth: '400px', padding: '24px', borderRadius: '12px', background: 'var(--bg-secondary, #1a1d1d)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#EF4444', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={18} /> Delete File
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #aaa)', marginBottom: '8px' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary, #fff)' }}>"{deleteTarget.name}"</strong>?
            </p>
            <p style={{ fontSize: '12px', color: '#F59E0B', marginBottom: '16px' }}>
              ⚠️ This will permanently remove it from MongoDB. Make sure you have exported a copy if needed.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="alert-btn secondary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color, #444)', background: 'transparent', color: 'var(--text-primary, #fff)' }} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: '#EF4444', color: '#fff', fontWeight: 600 }} onClick={() => { handleDeleteDirect(deleteTarget._id, deleteTarget.name); setDeleteTarget(null); }}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EXPORT BEFORE DELETE CONFIRMATION --- */}
      {showExportConfirm && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ maxWidth: '400px', padding: '24px', borderRadius: '12px', background: 'var(--bg-secondary, #1a1d1d)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} /> Export & Delete
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #aaa)', marginBottom: '16px' }}>
              This will export <strong style={{ color: 'var(--text-primary, #fff)' }}>"{showExportConfirm.name}"</strong> as an .xlsx file to your computer and then delete it from the cloud.
              <br /><br />
              Continue?
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="alert-btn secondary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color, #444)', background: 'transparent', color: 'var(--text-primary, #fff)' }} onClick={() => setShowExportConfirm(null)}>
                Cancel
              </button>
              <button style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 600 }} onClick={handleConfirmExportDelete} disabled={cloudLoading}>
                {cloudLoading ? 'Processing...' : 'Export & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
