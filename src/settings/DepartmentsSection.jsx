import { useState, useEffect } from 'react';
import { Building2, Plus, X, CheckCircle2, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DepartmentsSection() {
  const [departments, setDepartments] = useState([]);
  const [newDept, setNewDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/departments`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      // Use empty list on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newDept.trim();
    if (!trimmed || departments.includes(trimmed)) return;
    setDepartments([...departments, trimmed]);
    setNewDept('');
  };

  const handleRemove = (dept) => {
    setDepartments(departments.filter((d) => d !== dept));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departments }),
      });

      if (res.ok) {
        setSuccessMsg('Departments saved successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setSuccessMsg('Failed to save departments.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {successMsg && (
        <div className="settings-success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="settings-card">
        <div className="settings-card-title">
          <Building2 size={18} style={{ color: 'var(--color-cyan)' }} />
          Department Management
        </div>
        <div className="settings-card-desc">
          Manage the list of departments used for categorizing forms, emails, and analytics.
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Loader2 size={16} className="spin" />
            Loading departments...
          </div>
        ) : (
          <>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                className="settings-input"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                placeholder="Add a department name..."
              />
              <button type="submit" className="settings-btn" disabled={!newDept.trim()}>
                <Plus size={14} />
                Add
              </button>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {departments.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  No departments yet. Add one above to get started.
                </div>
              ) : (
                departments.map((dept) => (
                  <div
                    key={dept}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'rgba(20, 20, 20, 0.04)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {dept}
                    <button
                      type="button"
                      onClick={() => handleRemove(dept)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="settings-btn settings-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Departments'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
