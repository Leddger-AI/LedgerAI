import React, { useState, useRef, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { Upload, Plus, Rocket, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

// Plain white "Excel-like" theme: white surface, light grey gridlines, black text
const excelTheme = themeQuartz.withParams({
  backgroundColor: '#FFFFFF',
  foregroundColor: '#1A1A1A',
  headerBackgroundColor: '#F5F5F5',
  headerTextColor: '#1A1A1A',
  headerFontWeight: 600,
  borderColor: '#D9D9D9',
  rowBorder: true,
  wrapperBorder: true,
  headerRowBorder: true,
  columnBorder: true,
  oddRowBackgroundColor: '#FFFFFF',
  rowHoverColor: '#F0F8FF',
  selectedRowBackgroundColor: '#E8F0FE',
  cellHorizontalPaddingScale: 1,
  fontFamily: { googleFont: 'Poppins' },
  fontSize: 13,
  accentColor: '#1A73E8'
});

let nextRowId = 1000;
const createEmptyRow = () => ({ id: nextRowId++, name: '', email: '', github: '' });

// Maps a variety of common spreadsheet header spellings to our grid's keys.
const HEADER_ALIASES = {
  name: ['name', 'full name', 'fullname', 'candidate name', 'candidate'],
  email: ['email', 'e-mail', 'candidate email', 'email address'],
  github: ['github', 'github username', 'github handle', 'gh username']
};

const normalizeHeader = (header) => String(header || '').trim().toLowerCase();

const buildHeaderMap = (sampleRow) => {
  const rowKeys = Object.keys(sampleRow || {});
  const map = {};
  for (const key of rowKeys) {
    const normalized = normalizeHeader(key);
    for (const field of Object.keys(HEADER_ALIASES)) {
      if (HEADER_ALIASES[field].includes(normalized) && !map[field]) {
        map[field] = key;
      }
    }
  }
  return map;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isRowBlank = (row) => !row.name?.trim() && !row.email?.trim() && !row.github?.trim();

const mapImportedRows = (rawRows) => {
  if (!rawRows.length) return [];
  const headerMap = buildHeaderMap(rawRows[0]);

  return rawRows.map((raw) => ({
    id: nextRowId++,
    name: headerMap.name ? String(raw[headerMap.name] ?? '').trim() : '',
    email: headerMap.email ? String(raw[headerMap.email] ?? '').trim() : '',
    github: headerMap.github ? String(raw[headerMap.github] ?? '').trim() : ''
  }));
};

export default function ExcelCampaignGrid() {
  const gridRef = useRef(null);
  const fileInputRef = useRef(null);

  const [rowData, setRowData] = useState([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow()
  ]);
  const [importStatus, setImportStatus] = useState(null);
  const [launchToast, setLaunchToast] = useState(null);

  const columnDefs = useMemo(() => [
    {
      field: 'name',
      headerName: 'Name',
      editable: true,
      flex: 1,
      minWidth: 160
    },
    {
      field: 'email',
      headerName: 'Email',
      editable: true,
      flex: 1,
      minWidth: 220
    },
    {
      field: 'github',
      headerName: 'GitHub Username',
      editable: true,
      flex: 1,
      minWidth: 180
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    editable: true,
    sortable: true,
    resizable: true,
    flex: 1
  }), []);

  const handleAddRow = useCallback(() => {
    setRowData(prev => [...prev, createEmptyRow()]);
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const mapped = mapImportedRows(rawRows);
        if (mapped.length === 0) {
          setImportStatus({ type: 'error', message: 'No rows found in the uploaded file.' });
          return;
        }

        setRowData(mapped);
        setImportStatus({ type: 'success', message: `Imported ${mapped.length} row${mapped.length !== 1 ? 's' : ''} from "${file.name}".` });
      } catch (err) {
        console.error('Failed to parse spreadsheet:', err);
        setImportStatus({ type: 'error', message: 'Could not parse this file. Please upload a valid .xlsx or .csv file.' });
      }
    };

    reader.onerror = () => {
      setImportStatus({ type: 'error', message: 'Failed to read the selected file.' });
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }, []);

  const handleLaunchCampaign = useCallback(() => {
    // Extract the latest edited state directly from the grid's rendered nodes
    // so any in-progress manual cell edits are captured.
    const currentRows = [];
    gridRef.current?.api?.forEachNode((node) => {
      if (node.data) currentRows.push(node.data);
    });
    const source = currentRows.length > 0 ? currentRows : rowData;

    const nonBlankRows = source.filter((row) => !isRowBlank(row));

    if (nonBlankRows.length === 0) {
      setLaunchToast({ type: 'error', message: 'No candidate rows to launch. Add or import some data first.' });
      return;
    }

    const invalidRows = nonBlankRows.filter((row) => !EMAIL_REGEX.test(row.email?.trim() || ''));

    if (invalidRows.length > 0) {
      setLaunchToast({
        type: 'error',
        message: `${invalidRows.length} row${invalidRows.length !== 1 ? 's' : ''} have a missing or invalid email address. Fix them before launching.`
      });
      return;
    }

    setLaunchToast({
      type: 'success',
      message: `${nonBlankRows.length} valid candidate${nonBlankRows.length !== 1 ? 's' : ''} ready for processing.`
    });

    // Payload of validated rows, ready to be sent to a campaign launch endpoint.
    console.log('Bulk campaign payload:', nonBlankRows);
  }, [rowData]);

  // Auto-dismiss the launch toast after a few seconds
  React.useEffect(() => {
    if (!launchToast) return;
    const timer = setTimeout(() => setLaunchToast(null), 4000);
    return () => clearTimeout(timer);
  }, [launchToast]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top control panel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          onClick={handleImportClick}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
            fontSize: '13px', fontWeight: 500, borderRadius: '6px', cursor: 'pointer',
            border: '1px solid #D9D9D9', backgroundColor: '#FFFFFF', color: '#1A1A1A'
          }}
        >
          <Upload size={15} />
          Import Excel/CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        <button
          type="button"
          onClick={handleAddRow}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
            fontSize: '13px', fontWeight: 500, borderRadius: '6px', cursor: 'pointer',
            border: '1px solid #D9D9D9', backgroundColor: '#FFFFFF', color: '#1A1A1A'
          }}
        >
          <Plus size={15} />
          Add Row
        </button>

        <span style={{ fontSize: '12px', color: '#6B6B6B', marginLeft: '4px' }}>
          {rowData.length} row{rowData.length !== 1 ? 's' : ''}
        </span>
      </div>

      {importStatus && (
        <div style={{
          padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px',
          backgroundColor: importStatus.type === 'success' ? '#EAF7ED' : '#FDEBEC',
          color: importStatus.type === 'success' ? '#1E7A34' : '#B3261E',
          border: `1px solid ${importStatus.type === 'success' ? '#BFE6C6' : '#F3C0C0'}`
        }}>
          {importStatus.message}
        </div>
      )}

      {/* Grid */}
      <div style={{ height: '460px', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          theme={excelTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          onCellValueChanged={(params) => {
            setRowData(prev => prev.map(r => r.id === params.data.id ? params.data : r));
          }}
        />
      </div>

      {/* Launch action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          type="button"
          onClick={handleLaunchCampaign}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px',
            fontSize: '13.5px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer',
            border: 'none', backgroundColor: '#D7FEFA', color: '#0F3D3A'
          }}
        >
          <Rocket size={16} />
          Confirm & Launch Campaign
        </button>

        {launchToast && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
            borderRadius: '6px', fontSize: '12.5px',
            backgroundColor: launchToast.type === 'success' ? '#EAF7ED' : '#FDEBEC',
            color: launchToast.type === 'success' ? '#1E7A34' : '#B3261E',
            border: `1px solid ${launchToast.type === 'success' ? '#BFE6C6' : '#F3C0C0'}`
          }}>
            {launchToast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {launchToast.message}
          </div>
        )}
      </div>
    </div>
  );
}
