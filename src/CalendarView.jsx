import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, DollarSign, Brain, Plus, X, ChevronLeft, ChevronRight, User, Users, Check } from 'lucide-react';

export default function CalendarView({ meetings, onAddMeeting }) {
  // We mock a month grid: June 2026
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 13)); // June 13, 2026
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // New Meeting Form
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState('Project Phoenix');
  const [newDuration, setNewDuration] = useState('1h 00m');
  const [newAttendees, setNewAttendees] = useState('4');
  const [newDay, setNewDay] = useState(13); // Default June 13

  // Map meetings to days of June 2026 (1 to 30)
  // Let's associate original list to mock days:
  // Meeting 1: June 11
  // Meeting 2: June 12 (Yesterday)
  // Meeting 3: June 12 (Yesterday)
  // Meeting 4: June 11 (2 days ago)
  // Meeting 5: June 10 (3 days ago)
  // Meeting 6: June 9 (4 days ago)
  const getMeetingDay = (m) => {
    if (m.day) return m.day;
    if (m.id === 1) return 11;
    if (m.id === 2) return 12;
    if (m.id === 3) return 12;
    if (m.id === 4) return 11;
    if (m.id === 5) return 10;
    if (m.id === 6) return 9;
    return 13; // default to today
  };

  const meetingsByDay = {};
  meetings.forEach(m => {
    const day = getMeetingDay(m);
    if (!meetingsByDay[day]) meetingsByDay[day] = [];
    meetingsByDay[day].push(m);
  });

  // June 2026 starts on a Monday (1)
  // Total days in June = 30
  const daysInMonth = 30;
  const startDayOffset = 1; // Monday offset (0 for Sunday, 1 for Monday etc.)
  const calendarCells = [];

  // Empty cells at the start
  for (let i = 0; i < startDayOffset; i++) {
    calendarCells.push({ empty: true });
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push({
      day,
      date: new Date(2026, 5, day),
      meetings: meetingsByDay[day] || []
    });
  }

  const handleCellClick = (cell) => {
    if (cell.empty || cell.meetings.length === 0) return;
    setSelectedMeeting(cell.meetings[0]); // Select first meeting
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!newTitle) return;

    // Calculate mock cost
    const durationMins = newDuration.includes('h') 
      ? parseInt(newDuration.split('h')[0]) * 60 + (newDuration.includes('m') ? parseInt(newDuration.split('h')[1].replace('m','').trim()) : 0)
      : parseInt(newDuration.replace('m','').trim());
    
    const count = parseInt(newAttendees) || 1;
    const rate = 75; // Default rate
    const calculatedCost = Math.round((durationMins / 60) * count * rate);

    const createdMeeting = {
      id: Date.now(),
      title: newTitle,
      duration: newDuration,
      attendeeCount: count,
      cost: calculatedCost,
      project: newProject,
      confidence: 90,
      status: 'approved',
      time: '02:00 PM',
      day: newDay // store the day index
    };

    onAddMeeting(createdMeeting);
    setShowScheduleForm(false);
    
    // reset form
    setNewTitle('');
    setNewDuration('1h 00m');
    setNewAttendees('4');
  };

  return (
    <div className="calendar-view-container" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
      
      {/* Left side: Calendar board */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="section-header" style={{ marginBottom: '20px', borderBottom: 'none', paddingBottom: 0 }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '18px' }}>
              <CalendarIcon size={18} style={{ color: 'var(--color-cyan)', marginRight: '6px' }} />
              Active Calendar Ledger
            </h2>
            <p className="section-subtitle">June 2026</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="table-action-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
              onClick={() => setShowScheduleForm(true)}
            >
              <Plus size={14} />
              <span>Attributes Scheduler</span>
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
          <span>SUN</span>
        </div>

        {/* Calendar Monthly Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', gridAutoRows: '85px' }}>
          {calendarCells.map((cell, idx) => {
            const isToday = cell.day === 13;
            
            if (cell.empty) {
              return <div key={`empty-${idx}`} style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid transparent', borderRadius: '8px' }} />;
            }

            return (
              <div
                key={`day-${cell.day}`}
                onClick={() => handleCellClick(cell)}
                style={{
                  backgroundColor: isToday ? 'rgba(0, 240, 255, 0.04)' : 'rgba(255,255,255,0.02)',
                  border: isToday ? '1px solid var(--color-cyan-dim)' : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: cell.meetings.length > 0 ? 'pointer' : 'default',
                  transition: 'var(--transition-smooth)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  if (cell.meetings.length > 0) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isToday ? 'var(--color-cyan-dim)' : 'var(--border-color)';
                  e.currentTarget.style.backgroundColor = isToday ? 'rgba(0, 240, 255, 0.04)' : 'rgba(255,255,255,0.02)';
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: '700', color: isToday ? 'var(--color-cyan)' : 'var(--text-secondary)' }}>
                  {cell.day}
                </span>

                {cell.meetings.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {cell.meetings.slice(0, 2).map((m) => {
                      const color = m.project === 'Project Phoenix' ? 'var(--color-purple)' : 
                                    m.project === 'Client ABC Onboarding' ? 'var(--color-cyan)' : 'var(--color-warning)';
                      return (
                        <div
                          key={m.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMeeting(m);
                          }}
                          style={{
                            fontSize: '9px',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            borderLeft: `2.5px solid ${color}`,
                            color: 'var(--text-primary)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontWeight: '500'
                          }}
                        >
                          {m.title}
                        </div>
                      );
                    })}
                    {cell.meetings.length > 2 && (
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'right' }}>
                        +{cell.meetings.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side: Meeting details panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Schedule form */}
        {showScheduleForm && (
          <div className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setShowScheduleForm(false)}
            >
              <X size={16} />
            </button>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>Schedule Meeting</h3>
            
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Meeting Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Phoenix Code Review"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cost Code</label>
                  <select 
                    value={newProject}
                    onChange={e => setNewProject(e.target.value)}
                    style={{ width: '100%', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
                  >
                    <option value="Project Phoenix">Project Phoenix</option>
                    <option value="Client ABC Onboarding">Client ABC Onboarding</option>
                    <option value="Q4 Marketing Strategy">Q4 Marketing Strategy</option>
                    <option value="Internal Operations">Internal Operations</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date (June 2026)</label>
                  <select 
                    value={newDay}
                    onChange={e => setNewDay(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>June {day}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Duration</label>
                  <select 
                    value={newDuration}
                    onChange={e => setNewDuration(e.target.value)}
                    style={{ width: '100%', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
                  >
                    <option value="30m">30m</option>
                    <option value="45m">45m</option>
                    <option value="1h 00m">1h 00m</option>
                    <option value="1h 30m">1h 30m</option>
                    <option value="2h 00m">2h 00m</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Attendees</label>
                  <input 
                    type="number" 
                    value={newAttendees}
                    onChange={e => setNewAttendees(e.target.value)}
                    style={{ width: '100%', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="table-action-btn"
                style={{ width: '100%', padding: '10px', fontSize: '12px', marginTop: '6px', backgroundColor: 'rgba(0, 240, 255, 0.12)', borderColor: 'rgba(0, 240, 255, 0.2)', color: 'var(--color-cyan)' }}
              >
                Log Inbound Meeting
              </button>
            </form>
          </div>
        )}

        {/* Selected meeting details card */}
        <div className="glass-panel" style={{ padding: '24px', flex: 1, minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {selectedMeeting ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Meeting Inspector</span>
                <span style={{
                  fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold',
                  backgroundColor: selectedMeeting.project === 'Project Phoenix' ? 'rgba(181, 95, 230, 0.15)' : 
                                  selectedMeeting.project === 'Client ABC Onboarding' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: selectedMeeting.project === 'Project Phoenix' ? 'var(--color-purple)' : 
                         selectedMeeting.project === 'Client ABC Onboarding' ? 'var(--color-cyan)' : 'var(--color-warning)'
                }}>
                  {selectedMeeting.project}
                </span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
                {selectedMeeting.title}
              </h3>
              
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> {selectedMeeting.duration}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={12} /> {selectedMeeting.attendeeCount} Attendees
                </span>
              </div>

              {/* Cost card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(0, 240, 255, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-cyan)'
                }}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Attributed HR Cost</div>
                  <strong style={{ fontSize: '18px', color: 'var(--color-cyan)' }}>${selectedMeeting.cost.toLocaleString()}</strong>
                </div>
              </div>

              {/* AI Details */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Brain size={14} style={{ color: 'var(--color-purple)' }} />
                  AI Attribution Diagnosis
                </h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Confidence Score</span>
                  <span style={{
                    fontWeight: '600',
                    color: selectedMeeting.confidence > 80 ? 'var(--color-success)' : selectedMeeting.confidence > 50 ? 'var(--color-warning)' : 'var(--color-pink)'
                  }}>
                    {selectedMeeting.confidence}%
                  </span>
                </div>

                <div style={{ height: '4px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{
                    height: '100%',
                    width: `${selectedMeeting.confidence}%`,
                    backgroundColor: selectedMeeting.confidence > 80 ? 'var(--color-success)' : selectedMeeting.confidence > 50 ? 'var(--color-warning)' : 'var(--color-pink)'
                  }} />
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {selectedMeeting.project === 'Unassigned' 
                    ? 'Defaulted to Unassigned due to missing keyword correlations. Action needed.'
                    : `Classified by the engine taxonomy model. Key meeting details match ${selectedMeeting.project} attributes.`}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
              <CalendarIcon size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <div style={{ fontSize: '13px' }}>Select a meeting from the calendar board to inspect details.</div>
            </div>
          )}

          {selectedMeeting && (
            <button
              className="table-action-btn"
              style={{ width: '100%', padding: '8px', fontSize: '12px', marginTop: '16px' }}
              onClick={() => setSelectedMeeting(null)}
            >
              Close Inspector
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
