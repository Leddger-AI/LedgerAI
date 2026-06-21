import React, { useState, useMemo } from 'react';
import { Users, UserPlus, DollarSign, Clock, Shield, Search, Filter, Trash2, Edit2, Check, X } from 'lucide-react';

const INITIAL_MEMBERS = [
  { id: 1, name: 'Marcus Vance', role: 'Principal Architect', dept: 'Engineering', rate: 120, hours: 28, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80' },
  { id: 2, name: 'Evelyn Choi', role: 'Lead Product Designer', dept: 'Product & Design', rate: 95, hours: 24, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80' },
  { id: 3, name: 'David Miller', role: 'Growth Marketing Lead', dept: 'Growth & Marketing', rate: 85, hours: 18, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80' },
  { id: 4, name: 'Elena Rostova', role: 'Senior Backend Engineer', dept: 'Engineering', rate: 105, hours: 22, avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&h=100&q=80' },
  { id: 5, name: 'Tyler Durden', role: 'DevOps Specialist', dept: 'Engineering', rate: 110, hours: 16, avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=100&h=100&q=80' },
  { id: 6, name: 'Sarah Jenkins', role: 'VP Operations', dept: 'Operations & HR', rate: 130, hours: 15, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80' }
];

export default function TeamsView() {
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchMember, setSearchMember] = useState('');
  
  // Member edit state
  const [editingId, setEditingId] = useState(null);
  const [editRate, setEditRate] = useState('');

  // Add Member State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDept, setNewDept] = useState('Engineering');
  const [newRate, setNewRate] = useState('');
  const [newHours, setNewHours] = useState('');

  const departments = ['All', 'Engineering', 'Product & Design', 'Growth & Marketing', 'Operations & HR'];

  // Calculate stats dynamically
  const stats = useMemo(() => {
    const filtered = members.filter(m => selectedDept === 'All' || m.dept === selectedDept);
    const totalCost = filtered.reduce((acc, m) => acc + (m.rate * m.hours), 0);
    const totalHours = filtered.reduce((acc, m) => acc + m.hours, 0);
    const avgRate = filtered.length > 0 ? Math.round(filtered.reduce((acc, m) => acc + m.rate, 0) / filtered.length) : 0;
    
    return {
      headcount: filtered.length,
      totalCost,
      totalHours,
      avgRate
    };
  }, [members, selectedDept]);

  const handleEditRate = (m) => {
    setEditingId(m.id);
    setEditRate(m.rate.toString());
  };

  const handleSaveRate = (id) => {
    const val = parseInt(editRate);
    if (!isNaN(val) && val > 0) {
      setMembers(members.map(m => m.id === id ? { ...m, rate: val } : m));
    }
    setEditingId(null);
  };

  const handleDeleteMember = (id) => {
    if (confirm("Are you sure you want to remove this team member?")) {
      setMembers(members.filter(m => m.id !== id));
    }
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newName || !newRole) return;

    const newM = {
      id: Date.now(),
      name: newName,
      role: newRole,
      dept: newDept,
      rate: parseInt(newRate) || 75,
      hours: parseInt(newHours) || 10,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80'
    };

    setMembers([...members, newM]);
    setShowAddForm(false);

    // Reset Form
    setNewName('');
    setNewRole('');
    setNewRate('');
    setNewHours('');
  };

  // Filter members list
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchDept = selectedDept === 'All' || m.dept === selectedDept;
      const matchSearch = m.name.toLowerCase().includes(searchMember.toLowerCase()) || 
                          m.role.toLowerCase().includes(searchMember.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [members, selectedDept, searchMember]);

  return (
    <div className="teams-container">
      {/* Header title */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Users size={20} style={{ color: 'var(--color-cyan)' }} />
            Teams & Individual Headcount Burden
          </h2>
          <p className="section-subtitle">Track hourly cost rates, cumulative meeting time, and individual HR burden metrics</p>
        </div>
        <button 
          className="table-action-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <UserPlus size={16} />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Team Size ({selectedDept})</span>
            <div className="kpi-icon-wrapper cyan">
              <Users size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{stats.headcount} Members</span>
            <span className="kpi-trend positive">Active</span>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Est. Monthly Meeting Spend</span>
            <div className="kpi-icon-wrapper purple">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">${stats.totalCost.toLocaleString()}</span>
            <span className="kpi-trend negative">Cost cap limit</span>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Calendar Burden</span>
            <div className="kpi-icon-wrapper cyan">
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{stats.totalHours} Hours</span>
            <span className="kpi-trend">Per Month</span>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Average Hourly Rate</span>
            <div className="kpi-icon-wrapper purple">
              <Shield size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">${stats.avgRate}/hr</span>
            <span className="kpi-trend positive">Corporate standard</span>
          </div>
        </div>
      </div>

      {/* Add Member Form Drawer */}
      {showAddForm && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', position: 'relative' }}>
          <button 
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={() => setShowAddForm(false)}
          >
            <X size={18} />
          </button>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#fff' }}>Add New Team Member</h3>
          
          <form onSubmit={handleAddMember} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. John Doe"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Role / Designation</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Senior Frontend Dev"
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Department</label>
              <select 
                value={newDept}
                onChange={e => setNewDept(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              >
                {departments.slice(1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hourly Cost Rate ($/hr)</label>
              <input 
                type="number" 
                required
                placeholder="e.g. 75"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Monthly Meeting Hours</label>
              <input 
                type="number" 
                required
                placeholder="e.g. 20"
                value={newHours}
                onChange={e => setNewHours(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                className="table-action-btn"
                style={{ backgroundColor: 'transparent', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="table-action-btn"
                style={{ backgroundColor: 'rgba(0, 240, 255, 0.12)', borderColor: 'rgba(0, 240, 255, 0.2)', color: 'var(--color-cyan)' }}
              >
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: selectedDept === dept ? 'rgba(0, 240, 255, 0.2)' : 'var(--border-color)',
                backgroundColor: selectedDept === dept ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                color: selectedDept === dept ? 'var(--color-cyan)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {dept}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search member..."
            value={searchMember}
            onChange={e => setSearchMember(e.target.value)}
            style={{
              width: '100%',
              height: '32px',
              paddingLeft: '32px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px'
            }}
          />
        </div>
      </div>

      {/* Members List Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="meetings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Member Name</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Department</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Hourly Rate</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Monthly Meeting Hours</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Monthly Burden</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No team members match the criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={m.avatar} alt={m.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: '700', color: '#fff' }}>{m.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.role}</div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        fontSize: '11px', padding: '3px 8px', borderRadius: '12px',
                        backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)'
                      }}>
                        {m.dept}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {editingId === m.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input 
                            type="number"
                            value={editRate}
                            onChange={e => setEditRate(e.target.value)}
                            style={{ width: '60px', padding: '4px', backgroundColor: '#1c1e20', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                          />
                          <button style={{ background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer' }} onClick={() => handleSaveRate(m.id)}>
                            <Check size={14} />
                          </button>
                          <button style={{ background: 'none', border: 'none', color: 'var(--color-pink)', cursor: 'pointer' }} onClick={() => setEditingId(null)}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                          <span>${m.rate}/hr</span>
                          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => handleEditRate(m)}>
                            <Edit2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{m.hours} hrs</td>
                    <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--color-cyan)' }}>
                      ${(m.rate * m.hours).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                        onClick={() => handleDeleteMember(m.id)}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-pink)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
