import React, { useState } from 'react';
import {
  Plus, Calendar as CalendarIcon, Link2, FileText,
  Search, ChevronDown, Download, ChevronLeft, ChevronRight,
  MoreHorizontal, Copy, ChevronRight as RightArrow, X
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// --- Mock Data ---
const initialUpcomingMeets = [
  { id: 1, title: 'Design Review', subtitle: 'ShopEase - Redesign E-Commerce Dashboard', team: 'Kobam Design', teamLogo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=32&h=32&fit=crop', date: 'February 20, 2025', time: '09:00 AM', participants: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=32&h=32&fit=crop'], moreCount: 4, link: 'meet.google.com/abc-defg-hij' },
  { id: 2, title: 'Design Review', subtitle: 'Fins - Finance Mobile App', team: 'D\'Sign Creative', teamLogo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=32&h=32&fit=crop', date: 'February 20, 2025', time: '11:30 AM', participants: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop'], moreCount: 5, link: 'meet.google.com/xyz-uvxw-rst' }
];

const pastMeets = [
  { id: 101, title: 'Q1 All Hands', subtitle: 'Company Wide Update', team: 'Internal', teamLogo: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=32&h=32&fit=crop', date: 'January 15, 2025', time: '10:00 AM', participants: ['https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=32&h=32&fit=crop'], moreCount: 42, link: 'meet.google.com/past-all-hands' },
  { id: 102, title: 'Engineering Sync', subtitle: 'Weekly Backend Review', team: 'Engineering', teamLogo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=32&h=32&fit=crop', date: 'January 28, 2025', time: '02:00 PM', participants: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=32&h=32&fit=crop'], moreCount: 8, link: 'meet.google.com/past-eng-sync' }
];

export default function WorkspaceMeetView() {
  const [meetings, setMeetings] = useState(initialUpcomingMeets);
  const [searchQuery, setSearchQuery] = useState('');

  // States
  const [viewMode, setViewMode] = useState('upcoming'); // 'upcoming' or 'history'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // Modal states
  const [isScheduling, setIsScheduling] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [videoRequired, setVideoRequired] = useState(true);
  const [participantsToggle, setParticipantsToggle] = useState(true);

  // --- Actions ---

  const handleInstantMeet = async () => {
    // Open the window immediately in the click handler to bypass popup blockers
    const meetWindow = window.open('about:blank', '_blank');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/meet/instant`, { method: 'POST' });
      const data = await res.json();
      
      if (data.hangoutLink) {
        meetWindow.location.href = data.hangoutLink;
      } else {
        meetWindow.close();
        alert("Could not generate meeting link.");
      }
    } catch (err) {
      // Fallback if API fails
      meetWindow.location.href = 'https://meet.google.com/new';
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/meet/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, teamId: 'Internal', startTime: `${newDate}T${newTime}:00Z` })
      });
      const data = await res.json();

      const newMeet = {
        id: Date.now(),
        title: newTitle,
        subtitle: 'Scheduled Meeting',
        team: 'Internal',
        teamLogo: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=32&h=32&fit=crop',
        date: newDate,
        time: newTime,
        participants: [],
        moreCount: 0,
        link: data.hangoutLink ? data.hangoutLink.replace('https://', '') : 'meet.google.com/new-link'
      };

      setMeetings([newMeet, ...meetings]);
      setIsScheduling(false);
      setNewTitle('');
      setNewDate('');
      setNewTime('');
      setViewMode('upcoming');
    } catch (err) {
      console.error("Schedule error:", err);
      alert(`Failed to schedule. Error: ${err.message}. Make sure your backend server is running on port 5000!`);
    }
  };

  const handleCopy = (link) => {
    navigator.clipboard?.writeText(`https://${link}`);
    alert("Link copied!");
  };

  const toggleHistory = () => {
    setViewMode(viewMode === 'history' ? 'upcoming' : 'history');
  };

  // --- Calendar Math ---
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const firstDayIndex = firstDay === 0 ? 6 : firstDay - 1; // Mon=0, Sun=6
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Generate calendar grid array
  const calendarCells = [];
  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({ day: i, isCurrentMonth: true });
  }
  // Next month padding
  const remainingCells = 42 - calendarCells.length; // 6 rows of 7
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({ day: i, isCurrentMonth: false });
  }

  const displayedMeetings = viewMode === 'history' ? pastMeets : meetings;

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100%', padding: '32px 40px', fontFamily: 'var(--font-body)', position: 'relative' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1A1D1F', marginBottom: '8px' }}>Meetings</h1>
          <p style={{ fontSize: '14px', color: '#6F767E' }}>Plan meetings, check schedules, and stay connected with your team.</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
          backgroundColor: '#FFFFFF', border: '1px solid #EFEFEF', borderRadius: '10px',
          color: '#1A1D1F', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
          boxShadow: '0px 2px 4px rgba(0,0,0,0.02)'
        }}>
          <Download size={16} />
          Export
        </button>
      </div>

      {/* TOP SECTION: Grid & Calendar */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '40px' }}>

        {/* Left Action Grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          <div onClick={handleInstantMeet} style={{ ...cardStyle, gridColumn: '1 / -1' }}>
            <div style={iconBadgeStyle}><Plus size={24} color="#FFF" /></div>
            <h3 style={cardTitleStyle}>Start an Instant Meeting</h3>
            <p style={cardDescStyle}>Launch a meeting immediately with your team.</p>
          </div>

          <div onClick={() => setIsScheduling(true)} style={cardStyle}>
            <div style={iconBadgeStyle}><CalendarIcon size={24} color="#FFF" /></div>
            <h3 style={cardTitleStyle}>Set a Scheduled Meeting</h3>
            <p style={cardDescStyle}>Pick a date and time to notify your team in advance.</p>
          </div>

          <div onClick={toggleHistory} style={{ ...cardStyle, border: viewMode === 'history' ? '2px solid #1A1D1F' : '1px solid #EFEFEF' }}>
            <div style={iconBadgeStyle}><FileText size={24} color="#FFF" /></div>
            <h3 style={cardTitleStyle}>Meeting History</h3>
            <p style={cardDescStyle}>Access recordings, notes, and attendance logs.</p>
          </div>

        </div>

        {/* Right Calendar Widget */}
        <div style={{ width: '400px', backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #EFEFEF', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1D1F' }}>Meeting Calendar</h3>
            <MoreHorizontal size={20} color="#6F767E" style={{ cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))} style={navBtnStyle}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1A1D1F', minWidth: '110px', textAlign: 'center' }}>
              {monthName} {currentYear}
            </span>
            <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))} style={navBtnStyle}><ChevronRight size={16} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: '8px' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} style={{ fontSize: '12px', color: '#6F767E', fontWeight: '500', marginBottom: '8px' }}>{day}</div>
            ))}

            {calendarCells.map((cell, idx) => {
              // Check if any meeting exists on this day
              const cellDateString = new Date(currentYear, currentMonth, cell.day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              const hasMeeting = cell.isCurrentMonth && displayedMeetings.some(m => m.date === cellDateString);
              const isToday = cell.isCurrentMonth && cell.day === new Date().getDate() && currentMonth === new Date().getMonth();

              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setSelectedCalendarDate(selectedCalendarDate === cell.day ? null : cell.day);
                    }
                  }}
                  style={{
                    ...dateBoxStyle,
                    color: cell.isCurrentMonth ? (isToday ? '#FFF' : '#1A1D1F') : '#C4C4C4',
                    backgroundColor: isToday ? '#1A1D1F' : (selectedCalendarDate === cell.day ? '#E8F5FF' : 'transparent'),
                    borderRadius: isToday || selectedCalendarDate === cell.day ? '50%' : '0',
                    cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                    boxShadow: selectedCalendarDate === cell.day && !isToday ? 'inset 0 0 0 1px #00f0ff' : 'none'
                  }}
                >
                  {cell.day}
                  {hasMeeting && !isToday && <div style={dotStyle('#DC2626')}></div>}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: Meeting Schedule */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #EFEFEF', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' }}>

        {/* Table Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1D1F' }}>
            {viewMode === 'history' ? 'Past Meetings' : 'Meeting Schedule'}
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#6F767E" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search meeting..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #EFEFEF', backgroundColor: '#F8F9FA', fontSize: '14px', outline: 'none' }}
              />
            </div>
            <button style={filterBtnStyle}>All Teams <ChevronDown size={14} /></button>
            <button style={filterBtnStyle}>Sort by</button>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ width: '100%', borderCollapse: 'collapse', display: 'table' }}>
          {(() => {
            let filtered = displayedMeetings.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
            if (selectedCalendarDate) {
              const selectedDateString = new Date(currentYear, currentMonth, selectedCalendarDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              filtered = filtered.filter(m => m.date === selectedDateString);
            }

            if (filtered.length === 0) {
              return (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', backgroundColor: '#F8F9FA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                    <CalendarIcon size={24} color="#6F767E" />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1D1F', marginBottom: '8px' }}>No meetings found</h3>
                  <p style={{ fontSize: '14px', color: '#6F767E' }}>Try adjusting your search or select a different date from the calendar.</p>
                </div>
              );
            }

            return filtered.map((m, idx) => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 1fr 1fr auto', alignItems: 'center', padding: '16px 0', borderTop: idx !== 0 ? '1px solid #EFEFEF' : 'none' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1A1D1F', marginBottom: '4px' }}>{m.title}</div>
                <div style={{ fontSize: '12px', color: '#6F767E' }}>{m.subtitle}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6F767E', marginBottom: '4px' }}>Team</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={m.teamLogo} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1D1F' }}>{m.team}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6F767E', marginBottom: '4px' }}>Date</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1A1D1F' }}>{m.date}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6F767E', marginBottom: '4px' }}>Time</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1A1D1F' }}>{m.time}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6F767E', marginBottom: '4px' }}>Participant</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {m.participants.map((p, i) => (
                    <img key={i} src={p} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #FFF', marginLeft: i > 0 ? '-8px' : '0' }} />
                  ))}
                  {m.moreCount > 0 && (
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1A1D1F', color: '#FFF', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFF', marginLeft: '-8px', zIndex: 1 }}>
                      +{m.moreCount}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', paddingRight: '8px' }}>
                <button onClick={() => handleCopy(m.link)} style={actionIconStyle}><Copy size={16} color="#FFF" /></button>
                <button onClick={() => window.open(`https://${m.link}`, '_blank')} style={{ ...actionIconStyle, backgroundColor: '#F8F9FA', border: '1px solid #EFEFEF' }}><RightArrow size={16} color="#1A1D1F" /></button>
              </div>
            </div>
            ));
          })()}
        </div>
      </div>

      {/* SCHEDULING MODAL */}
      {isScheduling && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#252525', borderRadius: '12px', padding: '24px', width: '540px', color: '#FFF', boxShadow: '0px 12px 32px rgba(0,0,0,0.3)', fontFamily: 'var(--font-body)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #3A3A3A', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '500' }}>Schedule Meeting</h3>
              <X size={20} style={{ cursor: 'pointer', color: '#A0A0A0' }} onClick={() => setIsScheduling(false)} />
            </div>

            <form onSubmit={handleScheduleSubmit}>
              {/* Add Title */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#E0E0E0', marginBottom: '8px' }}>Add Title</label>
                <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Design UX Workshop" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #454545', backgroundColor: '#353535', color: '#FFF', fontSize: '14px', outline: 'none' }} />
              </div>

              {/* Date and Time */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#E0E0E0', marginBottom: '8px' }}>Date and Time</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input type="date" required value={newDate} onChange={e => setNewDate(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #454545', backgroundColor: '#353535', color: '#FFF', fontSize: '14px', outline: 'none' }} />
                  <input type="time" required value={newTime} onChange={e => setNewTime(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #454545', backgroundColor: '#353535', color: '#FFF', fontSize: '14px', outline: 'none' }} />
                </div>
              </div>

              {/* Toggles: Video Required & Participants */}
              <div style={{ display: 'flex', gap: '48px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#E0E0E0', marginBottom: '8px' }}>Video Required</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="radio" checked={videoRequired} onChange={() => setVideoRequired(true)} style={{ accentColor: '#FFF' }} /> On
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="radio" checked={!videoRequired} onChange={() => setVideoRequired(false)} style={{ accentColor: '#FFF' }} /> Off
                    </label>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#E0E0E0', marginBottom: '8px' }}>Participants</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="radio" checked={participantsToggle} onChange={() => setParticipantsToggle(true)} style={{ accentColor: '#FFF' }} /> On
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="radio" checked={!participantsToggle} onChange={() => setParticipantsToggle(false)} style={{ accentColor: '#FFF' }} /> Off
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#E0E0E0', marginBottom: '8px' }}>Description</label>
                <textarea rows="4" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #454545', backgroundColor: '#353535', color: '#FFF', fontSize: '14px', outline: 'none', resize: 'none' }}></textarea>
              </div>

              {/* Notifications */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#E0E0E0', marginBottom: '8px' }}>Notifications</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #454545', backgroundColor: '#353535', color: '#FFF', fontSize: '13px', outline: 'none', width: '140px' }}>
                    <option>Email and SMS</option>
                    <option>Email Only</option>
                    <option>SMS Only</option>
                  </select>
                  <input type="number" defaultValue={30} style={{ width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #454545', backgroundColor: '#353535', color: '#FFF', fontSize: '13px', outline: 'none', textAlign: 'center' }} />
                  <select style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #454545', backgroundColor: '#353535', color: '#FFF', fontSize: '13px', outline: 'none', width: '100px' }}>
                    <option>Minutes</option>
                    <option>Hours</option>
                    <option>Days</option>
                  </select>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#A0A0A0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <Plus size={14} /> Add Notification
                  </button>
                </div>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsScheduling(false)} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#FFF', border: '1px solid #555', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#FFF', color: '#000', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                  Save Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Styles ---
const cardStyle = {
  backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '32px 24px', border: '1px solid #EFEFEF',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0px 4px 12px rgba(0,0,0,0.02)',
};

const iconBadgeStyle = {
  width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#1A1D1F',
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
};

const cardTitleStyle = { fontSize: '15px', fontWeight: '600', color: '#1A1D1F', marginBottom: '8px' };
const cardDescStyle = { fontSize: '13px', color: '#6F767E', lineHeight: '1.4' };
const navBtnStyle = { background: '#1A1D1F', color: '#FFF', border: 'none', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const dateBoxStyle = { fontSize: '14px', color: '#1A1D1F', fontWeight: '500', width: '32px', height: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto', position: 'relative' };
const dotStyle = (color) => ({ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: color, position: 'absolute', bottom: '2px' });
const filterBtnStyle = { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#FFFFFF', border: '1px solid #EFEFEF', borderRadius: '8px', fontSize: '13px', fontWeight: '500', color: '#1A1D1F', cursor: 'pointer' };
const actionIconStyle = { width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#353535', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' };
