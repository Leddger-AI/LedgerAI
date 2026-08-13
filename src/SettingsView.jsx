import ProfileSection from './settings/ProfileSection.jsx';
import DepartmentsSection from './settings/DepartmentsSection.jsx';
import EmailSection from './settings/EmailSection.jsx';
import AISection from './settings/AISection.jsx';
import IntegrationsSection from './settings/IntegrationsSection.jsx';
import AppearanceSection from './settings/AppearanceSection.jsx';
import SecuritySection from './settings/SecuritySection.jsx';
import './settings/settings.css';

export default function SettingsView({
  section = 'profile',
  user,
  onResetData,
  onToggleDemo,
  demoActive,
  defaultRate = 75,
  confidenceThreshold = 60,
  onUpdateSettings,
  onLogout,
}) {
  switch (section) {
    case 'profile':
      return <ProfileSection user={user} />;
    case 'departments':
      return <DepartmentsSection />;
    case 'email':
      return <EmailSection />;
    case 'ai':
      return (
        <AISection
          defaultRate={defaultRate}
          confidenceThreshold={confidenceThreshold}
          onUpdateSettings={onUpdateSettings}
        />
      );
    case 'integrations':
      return <IntegrationsSection />;
    case 'appearance':
      return (
        <AppearanceSection
          demoActive={demoActive}
          onToggleDemo={onToggleDemo}
          defaultRate={defaultRate}
          onUpdateSettings={onUpdateSettings}
        />
      );
    case 'security':
      return (
        <SecuritySection
          user={user}
          onLogout={onLogout}
          onResetData={onResetData}
        />
      );
    default:
      return <ProfileSection user={user} />;
  }
}
