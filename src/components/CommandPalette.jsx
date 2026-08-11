import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Video, FileText, Settings, BarChart2, BookOpen, AlertCircle } from 'lucide-react';

const COMMANDS = [
  { id: 'dashboard', label: 'Go to Dashboard', path: '/dashboard', icon: BarChart2 },
  { id: 'calendar', label: 'View Calendar', path: '/dashboard/calendar', icon: Calendar },
  { id: 'meet', label: 'Start / View Meetings', path: '/dashboard/meet', icon: Video },
  { id: 'analysis', label: 'View Analytics & Analysis', path: '/dashboard/analysis', icon: BarChart2 },
  { id: 'knowledge-base', label: 'Search Knowledge Base', path: '/dashboard/knowledge-base', icon: BookOpen },
  { id: 'reports', label: 'View Reports', path: '/dashboard/reports', icon: FileText },
  { id: 'alerts', label: 'Check Alerts', path: '/dashboard/alerts', icon: AlertCircle },
  { id: 'settings', label: 'Open Settings', path: '/dashboard/settings', icon: Settings },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is typing in an input/textarea (and not our own input)
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') &&
        document.activeElement !== inputRef.current
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredCommands = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleExecute = (command) => {
    navigate(command.path);
    setIsOpen(false);
    setQuery('');
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleExecute(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh'
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          fontFamily: 'var(--font-body)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #EFEFEF' }}>
          <Search size={20} color="#6F767E" style={{ marginRight: '16px' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '18px',
              color: '#1A1D1F',
              backgroundColor: 'transparent'
            }}
          />
          <div style={{ fontSize: '12px', color: '#6F767E', border: '1px solid #EFEFEF', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#F8F9FA' }}>
            ESC
          </div>
        </div>

        <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '12px' }}>
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isActive = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleExecute(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    backgroundColor: isActive ? '#F4F4F5' : 'transparent',
                    transition: 'background-color 0.1s ease'
                  }}
                >
                  <Icon size={18} color={isActive ? '#1A1D1F' : '#6F767E'} style={{ marginRight: '12px' }} />
                  <span style={{ fontSize: '15px', color: isActive ? '#1A1D1F' : '#6F767E', fontWeight: isActive ? '500' : '400' }}>
                    {cmd.label}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6F767E', fontSize: '14px' }}>
              No commands found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
