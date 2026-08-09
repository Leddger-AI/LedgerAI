export default function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      style={{
        width: '42px',
        height: '22px',
        borderRadius: '9999px',
        backgroundColor: checked ? '#D7FEFA' : 'rgba(255,255,255,0.1)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        position: 'relative',
        transition: 'all 0.25s ease',
        padding: '0',
        flexShrink: 0
      }}
    >
      <div style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: checked ? '#1A1D1D' : '#FFFFFF',
        position: 'absolute',
        top: '3px',
        left: checked ? '23px' : '3px',
        transition: 'all 0.25s cubic-bezier(0.25, 1, 0.5, 1)'
      }} />
    </button>
  );
}
