import { useState } from 'react';
import {
  User,
  Building2,
  Mail,
  Shield,
  Plug,
  Palette,
  Lock,
} from 'lucide-react';
import './settings.css';

const SECTIONS = [
  { id: 'profile', label: 'Profile & Account', icon: User },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'email', label: 'Email Configuration', icon: Mail },
  { id: 'ai', label: 'AI & GenAI Keys', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'appearance', label: 'Appearance & Preferences', icon: Palette },
  { id: 'security', label: 'Account & Security', icon: Lock },
];

export default function SettingsLayout({ children, user }) {
  const [activeSection, setActiveSection] = useState('profile');

  const activeConfig = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];

  return (
    <div className="settings-page">
      <nav className="settings-nav">
        <ul className="settings-nav-list">
          {SECTIONS.map((section, idx) => (
            <div key={section.id}>
              {idx === 5 && <div className="settings-nav-divider" />}
              <li>
                <button
                  className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <section.icon size={16} />
                  {section.label}
                </button>
              </li>
            </div>
          ))}
        </ul>
      </nav>

      <main className="settings-content">
        <div className="settings-section-header">
          <h2>
            <activeConfig.icon size={22} style={{ color: 'var(--color-cyan)' }} />
            {activeConfig.label}
          </h2>
        </div>
        {children(activeSection, setActiveSection)}
      </main>
    </div>
  );
}
