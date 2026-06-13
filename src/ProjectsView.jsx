import React, { useState, useMemo } from 'react';
import { Briefcase, DollarSign, Clock, Users, Plus, Edit2, Check, X, AlertTriangle, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function ProjectsView({ meetings, onUpdateMeetingProject }) {
  // Pre-configured projects with initial budgets
  const [projects, setProjects] = useState([
    {
      id: 'PHX-408',
      name: 'Project Phoenix',
      code: 'PHX-408',
      lead: 'Marcus Vance',
      budget: 15000,
      status: 'Active',
      description: 'Core database upgrades, migration to PostgreSQL cluster, and scaling backend architecture.'
    },
    {
      id: 'ABC-ONB',
      name: 'Client ABC Onboarding',
      code: 'ABC-ONB',
      lead: 'Evelyn Choi',
      budget: 8000,
      status: 'Active',
      description: 'Client coordination, feedback loops, frontend integration, and pilot onboarding for Client ABC.'
    },
    {
      id: 'MKT-Q4',
      name: 'Q4 Marketing Strategy',
      code: 'MKT-Q4',
      lead: 'David Miller',
      budget: 5000,
      status: 'Active',
      description: 'Social media campaigns, ad design, growth metrics, and customer acquisition marketing.'
    },
    {
      id: 'CORP-OPS',
      name: 'Internal Operations',
      code: 'CORP-OPS',
      lead: 'Sarah Jenkins',
      budget: 12000,
      status: 'Active',
      description: 'General administrative tasks, HR catchups, recurring standups, and internal resource management.'
    }
  ]);

  const [editingId, setEditingId] = useState(null);
  const [editBudgetVal, setEditBudgetVal] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  
  // Add Project Form State
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjLead, setNewProjLead] = useState('');
  const [newProjBudget, setNewProjBudget] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  // Calculate stats dynamically from meetings
  const projectStats = useMemo(() => {
    const stats = {};
    projects.forEach(p => {
      stats[p.name] = { spent: 0, hours: 0, meetingCount: 0 };
    });

    meetings.forEach(m => {
      // Normalise matching names
      let matchName = 'Internal Operations';
      if (m.project === 'Project Phoenix') matchName = 'Project Phoenix';
      else if (m.project === 'Client ABC Onboarding') matchName = 'Client ABC Onboarding';
      else if (m.project === 'Q4 Marketing Strategy') matchName = 'Q4 Marketing Strategy';

      if (!stats[matchName]) {
        stats[matchName] = { spent: 0, hours: 0, meetingCount: 0 };
      }

      stats[matchName].spent += m.cost;
      stats[matchName].meetingCount += 1;

      // Extract duration in hours
      let hr = 0;
      if (m.duration) {
        const hMatch = m.duration.match(/(\d+)h/);
        const mMatch = m.duration.match(/(\d+)m/);
        if (hMatch) hr += parseInt(hMatch[1]);
        if (mMatch) hr += parseInt(mMatch[1]) / 60;
      }
      stats[matchName].hours += hr;
    });

    return stats;
  }, [meetings, projects]);

  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalSpent = Object.values(projectStats).reduce((acc, curr) => acc + curr.spent, 0);

  const handleEditBudget = (proj) => {
    setEditingId(proj.id);
    setEditBudgetVal(proj.budget.toString());
  };

  const handleSaveBudget = (id) => {
    const parsed = parseFloat(editBudgetVal);
    if (!isNaN(parsed) && parsed >= 0) {
      setProjects(projects.map(p => p.id === id ? { ...p, budget: parsed } : p));
    }
    setEditingId(null);
  };

  const handleAddProject = (e) => {
    e.preventDefault();
    if (!newProjName || !newProjCode) return;

    const newProj = {
      id: newProjCode,
      name: newProjName,
      code: newProjCode,
      lead: newProjLead || 'TBD',
      budget: parseFloat(newProjBudget) || 5000,
      status: 'Active',
      description: newProjDesc || 'No description provided.'
    };

    setProjects([...projects, newProj]);
    setShowAddProject(false);
    
    // Clear form
    setNewProjName('');
    setNewProjCode('');
    setNewProjLead('');
    setNewProjBudget('');
    setNewProjDesc('');
  };

  return (
    <div className="projects-container">
      {/* Header title */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Briefcase size={20} style={{ color: 'var(--color-purple)' }} />
            Taxonomy & Project Cost Codes
          </h2>
          <p className="section-subtitle">Manage project scopes, cost caps, and real-time meeting expenditure burn rates</p>
        </div>
        <button 
          className="table-action-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
          onClick={() => setShowAddProject(!showAddProject)}
        >
          <Plus size={16} />
          <span>New Project Code</span>
        </button>
      </div>

      {/* KPI stats */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Cost Codes</span>
            <div className="kpi-icon-wrapper purple">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{projects.length} Codes</span>
            <span className="kpi-trend positive">
              Stable
            </span>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Allocated Budget</span>
            <div className="kpi-icon-wrapper cyan">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">${totalBudget.toLocaleString()}</span>
            <span className="kpi-trend positive">
              <TrendingUp size={12} />
              Approved
            </span>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Attributed Meeting Spend</span>
            <div className="kpi-icon-wrapper purple">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">${totalSpent.toLocaleString()}</span>
            <span className="kpi-trend" style={{ color: totalSpent > totalBudget ? 'var(--color-pink)' : 'var(--color-success)' }}>
              {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% Used
            </span>
          </div>
        </div>
      </div>

      {/* Add Project Form Modal/Panel */}
      {showAddProject && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', position: 'relative' }}>
          <button 
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={() => setShowAddProject(false)}
          >
            <X size={18} />
          </button>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#fff' }}>Create New Cost Code</h3>
          
          <form onSubmit={handleAddProject} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Project Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Project Apollo"
                value={newProjName}
                onChange={e => setNewProjName(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Taxonomy Code (Unique ID)</label>
              <input 
                type="text" 
                required
                placeholder="e.g. APL-101"
                value={newProjCode}
                onChange={e => setNewProjCode(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Project Lead</label>
              <input 
                type="text" 
                placeholder="e.g. Jane Doe"
                value={newProjLead}
                onChange={e => setNewProjLead(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Meeting Cost Budget ($)</label>
              <input 
                type="number" 
                placeholder="e.g. 5000"
                value={newProjBudget}
                onChange={e => setNewProjBudget(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Project Description</label>
              <textarea 
                rows={2}
                placeholder="Core objective and key deliverables of the project..."
                value={newProjDesc}
                onChange={e => setNewProjDesc(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px', resize: 'vertical' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                className="table-action-btn"
                style={{ backgroundColor: 'transparent', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                onClick={() => setShowAddProject(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="table-action-btn"
                style={{ backgroundColor: 'rgba(0, 240, 255, 0.12)', borderColor: 'rgba(0, 240, 255, 0.2)', color: 'var(--color-cyan)' }}
              >
                Add Code
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Projects */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {projects.map((proj) => {
          const stats = projectStats[proj.name] || { spent: 0, hours: 0, meetingCount: 0 };
          const burnPercent = proj.budget > 0 ? Math.min(100, Math.round((stats.spent / proj.budget) * 100)) : 0;
          const isOverBudget = stats.spent > proj.budget;

          return (
            <div className="glass-panel" key={proj.id} style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Card Title & Code */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {proj.name}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Code: {proj.code}</span>
                  </div>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                    backgroundColor: isOverBudget ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: isOverBudget ? 'var(--color-pink)' : 'var(--color-success)'
                  }}>
                    {isOverBudget ? 'Budget Alert' : 'Healthy'}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                  {proj.description}
                </p>

                {/* Team Lead / Meta info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Lead Owner</div>
                    <strong style={{ color: '#fff' }}>{proj.lead}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Meeting Burden</div>
                    <strong style={{ color: '#fff' }}>{stats.meetingCount} meetings ({Math.round(stats.hours)} hrs)</strong>
                  </div>
                </div>

                {/* Budget details & Burn bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Cost Consumed</span>
                    <span style={{ fontWeight: '600', color: '#fff' }}>
                      ${stats.spent.toLocaleString()} / 
                      {editingId === proj.id ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                          <input 
                            type="number"
                            className="search-input"
                            value={editBudgetVal}
                            onChange={e => setEditBudgetVal(e.target.value)}
                            style={{ width: '80px', height: '24px', padding: '0 4px', fontSize: '12px' }}
                          />
                          <button style={{ background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer' }} onClick={() => handleSaveBudget(proj.id)}>
                            <Check size={14} />
                          </button>
                          <button style={{ background: 'none', border: 'none', color: 'var(--color-pink)', cursor: 'pointer' }} onClick={() => setEditingId(null)}>
                            <X size={14} />
                          </button>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-cyan)', marginLeft: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleEditBudget(proj)}>
                          ${proj.budget.toLocaleString()} <Edit2 size={10} />
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${burnPercent}%`,
                      backgroundColor: isOverBudget ? 'var(--color-pink)' : burnPercent > 80 ? 'var(--color-warning)' : 'var(--color-cyan)',
                      boxShadow: isOverBudget ? 'none' : '0 0 8px var(--color-cyan-glow)',
                      borderRadius: '3px',
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                    <span>{burnPercent}% Spent</span>
                    <span>${Math.max(0, proj.budget - stats.spent).toLocaleString()} Remaining</span>
                  </div>
                </div>
              </div>

              {isOverBudget && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', color: 'var(--color-pink)', marginTop: '8px' }}>
                  <AlertTriangle size={14} />
                  <span>Cost overrun alert: Reconsider recurring meetings load.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Associated Meeting Log */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Project Allocation Registry</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="meetings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Meeting</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Project Tag</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Duration</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Attendees</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Meeting Cost</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr key={meeting.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <td style={{ padding: '16px', fontWeight: '600', color: '#fff' }}>{meeting.title}</td>
                  <td style={{ padding: '16px' }}>
                    <select
                      value={meeting.project}
                      onChange={(e) => onUpdateMeetingProject(meeting.id, e.target.value)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Project Phoenix">Project Phoenix</option>
                      <option value="Client ABC Onboarding">Client ABC Onboarding</option>
                      <option value="Q4 Marketing Strategy">Q4 Marketing Strategy</option>
                      <option value="Internal Operations">Internal Operations</option>
                    </select>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{meeting.duration}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{meeting.attendeeCount}</td>
                  <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--color-cyan)' }}>${meeting.cost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
