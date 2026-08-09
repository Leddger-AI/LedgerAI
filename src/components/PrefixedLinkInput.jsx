export default function PrefixedLinkInput({ prefix, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', width: '100%', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.02)' }}>
      <span style={{ padding: '10px 8px 10px 12px', fontSize: '12px', color: 'rgba(0,0,0,0.45)', whiteSpace: 'nowrap', backgroundColor: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center' }}>
        {prefix}
      </span>
      <input
        type="text"
        disabled={!onChange}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, padding: '10px 12px 10px 4px', border: 'none', backgroundColor: 'transparent', fontSize: '12px', outline: 'none', color: '#1a1d1d' }}
      />
    </div>
  );
}
