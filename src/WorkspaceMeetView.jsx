import React, { useState } from 'react';
import { Video, Calendar as CalendarIcon, Users, Clock, PlusCircle, Link2, Check, Zap, MapPin } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const initialUpcomingMeets = [
  { id: 1, title: 'Engineering Weekly Sync', team: 'Engineering', time: 'Today, 2:00 PM', duration: '45m', link: 'meet.google.com/abc-defg-hij' },
  { id: 2, title: 'Product Roadmap Review', team: 'Product', time: 'Tomorrow, 11:00 AM', duration: '60m', link: 'meet.google.com/xyz-uvxw-rst' },
  { id: 3, title: 'Marketing Q3 Planning', team: 'Marketing', time: 'Fri, 10:00 AM', duration: '1h 30m', link: 'meet.google.com/qwe-asdf-zxc' }
];

const teamRooms = [
  { id: 'eng', name: 'Engineering', members: 12, color: 'var(--color-cyan)' },
  { id: 'prod', name: 'Product', members: 5, color: 'var(--color-purple)' },
  { id: 'hr', name: 'HR / Recruiting', members: 3, color: 'var(--color-success)' },
  { id: 'mktg', name: 'Marketing', members: 8, color: '#f59e0b' }
];

export default function WorkspaceMeetView() {
  const [copiedId, setCopiedId] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [meetings, setMeetings] = useState(initialUpcomingMeets);
  const [activeTeamFilter, setActiveTeamFilter] = useState(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTeam, setNewTeam] = useState('Engineering');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const handleCopy = (link, id) => {
    navigator.clipboard?.writeText(`https://${link}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInstantMeet = async () => {
    try {
      // Hit our backend to generate an instant meet link
      const res = await fetch(`${API_BASE_URL}/api/meet/instant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // if you had a token, it would go here
      });
      const data = await res.json();
      
      if (data.hangoutLink) {
        window.open(data.hangoutLink, '_blank');
      } else {
        alert("Could not generate meeting link.");
      }
    } catch (err) {
      console.error(err);
      // Fallback for demo
      window.open('https://meet.google.com/new', '_blank');
    }
  };

  const handleScheduleMeet = async (e) => {
    e.preventDefault();
    if (!newTitle || !newDate || !newTime) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/meet/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          teamId: newTeam,
          startTime: `${newDate}T${newTime}:00Z`,
          endTime: `${newDate}T${newTime}:00Z` // simplified
        })
      });
      const data = await res.json();

      const newMeeting = {
        id: Date.now(),
        title: newTitle,
        team: newTeam,
        time: `${newDate}, ${newTime}`,
        duration: '60m',
        link: data.hangoutLink ? data.hangoutLink.replace('https://', '') : 'meet.google.com/demo-link'
      };

      setMeetings([newMeeting, ...meetings]);
      setIsScheduling(false);
      setNewTitle('');
    } catch (err) {
      console.error(err);
      alert("Failed to schedule meeting.");
    }
  };

  const filteredMeetings = activeTeamFilter 
    ? meetings.filter(m => m.team === activeTeamFilter) 
    : meetings;

  return (
    <div className="meet-container" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      
      {/* Header section */}
      <div className="section-header" style={{ marginBottom: '32px' }}>
        <div>
          <h2 className="section-title">
            <Video size={24} style={{ color: 'var(--color-cyan)', marginRight: '10px' }} />
            Workspace Meets
          </h2>
          <p className="section-subtitle">Instantly connect with your team via Google Meet.</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
        <button
          onClick={handleInstantMeet}
          className="glass-panel"
          style={{
            flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--color-cyan-glow)', background: 'linear-gradient(145deg, rgba(20,20,20,0.4) 0%, rgba(0, 255, 255, 0.03) 100%)'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ backgroundColor: 'var(--color-cyan-glow)', padding: '16px', borderRadius: '50%' }}>
            <Zap size={28} style={{ color: 'var(--color-cyan)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>Instant Meeting</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Start a Google Meet right now</div>
          </div>
        </button>

        <button
          onClick={() => setIsScheduling(true)}
          className="glass-panel"
          style={{
            flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.05)'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '50%' }}>
            <CalendarIcon size={28} style={{ color: 'var(--text-primary)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>Schedule Meeting</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Create a calendar invite with a Meet link</div>
          </div>
        </button>
      </div>

      {/* Team Rooms */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Team Rooms</h3>
          {activeTeamFilter && (
            <button onClick={() => setActiveTeamFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', fontSize: '13px', cursor: 'pointer' }}>
              Clear Filter
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {teamRooms.map(room => (
            <div 
              key={room.id}
              onClick={() => setActiveTeamFilter(activeTeamFilter === room.name ? null : room.name)}
              className="glass-panel"
              style={{
                padding: '20px', 
                cursor: 'pointer',
                border: activeTeamFilter === room.name ? `1px solid ${room.color}` : '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: room.color }}></div>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{room.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Users size={14} />
                <span>{room.members} members</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming meetings list */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>
          Upcoming {activeTeamFilter ? `${activeTeamFilter} ` : ''}Meetings
        </h3>
        {filteredMeetings.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CalendarIcon size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p>No upcoming meetings found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredMeetings.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '10px', backgroundColor: 'rgba(20,20,20,0.02)' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{m.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {m.team}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {m.duration}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{m.time}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleCopy(m.link, m.id)}
                      style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}
                    >
                      {copiedId === m.id ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Link2 size={14} />}
                      {copiedId === m.id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => window.open(`https://${m.link}`, '_blank')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', backgroundColor: 'var(--color-cyan)', borderRadius: '6px', border: 'none', color: '#000', cursor: 'pointer' }}
                    >
                      <Video size={14} />
                      Join
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduling Modal */}
      {isScheduling && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)' }}>Schedule a Meeting</h3>
            <form onSubmit={handleScheduleMeet}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>Meeting Title</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Q3 Design Review"
                  style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(20,20,20,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>Team / Room</label>
                <select 
                  value={newTeam}
                  onChange={e => setNewTeam(e.target.value)}
                  style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(20,20,20,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                >
                  {teamRooms.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>Date</label>
                  <input 
                    type="date" 
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(20,20,20,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', colorScheme: 'dark' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>Time</label>
                  <input 
                    type="time" 
                    required
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(20,20,20,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', colorScheme: 'dark' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setIsScheduling(false)}
                  style={{ padding: '10px 16px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ padding: '10px 20px', backgroundColor: 'var(--color-cyan)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: '600', cursor: 'pointer' }}
                >
                  Create & Get Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
