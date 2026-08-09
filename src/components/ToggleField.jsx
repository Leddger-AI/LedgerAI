import ToggleSwitch from './ToggleSwitch';

export default function ToggleField({ title, description, checked, onChange, indent, disabled }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      backgroundColor: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '12px',
      marginLeft: indent ? '20px' : '0',
      opacity: disabled ? 0.5 : 1
    }}>
      <div>
        <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#fff' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{description}</div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
