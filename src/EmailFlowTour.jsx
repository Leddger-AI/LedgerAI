import { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, FileSpreadsheet, Send, CheckCircle2, Zap } from 'lucide-react';
import './InteractiveTour.css';
import './EmailFlowTour.css';

// Email way ONLY — fully AUTOMATIC. Nothing here is clickable by the user;
// only the animated cursor acts. Sidebar pages: Body, Automation, Excel.
const ITEMS = [
  { id: 'body', label: 'Body', icon: Mail },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'excel', label: 'Excel', icon: FileSpreadsheet },
];

const SCRIPT = [
  { page: 'body', cursor: { top: '34%', left: '52%' }, beat: 'type', hold: 1700 },
  { page: 'body', cursor: { top: '46%', left: '46%' }, beat: 'pill', hold: 1900 },
  { page: 'automation', cursor: { top: '30%', left: '16%' }, beat: 'nav', hold: 1300 },
  { page: 'automation', cursor: { top: '58%', left: '55%' }, beat: 'pick', hold: 1700 },
  { page: 'automation', cursor: { top: '80%', left: '55%' }, beat: 'sent', hold: 2300 },
  { page: 'excel', cursor: { top: '48%', left: '16%' }, beat: 'nav', hold: 1400 },
  { page: 'excel', cursor: { top: '52%', left: '55%' }, beat: 'fill', hold: 2100 },
  { page: 'excel', cursor: { top: '82%', left: '55%' }, beat: 'count', hold: 2200 },
];

const CAPTIONS = {
  type: 'Write the body once',
  pill: 'Type d1.. — Excel columns pop in as pills',
  nav: 'Switch pages from the sidebar',
  pick: 'Pick the saved template',
  sent: 'Preview a real row — Send',
  fill: 'Roster fills row by row',
  count: '240 valid · 3 quarantined — ready',
};

const ROWS = [
  { name: 'Aarav', roll: 'CS2024-001' },
  { name: 'Diya', roll: 'CS2024-002' },
  { name: 'Kabir', roll: 'CS2024-003' },
];

export default function EmailFlowTour() {
  const wrapRef = useRef(null);
  const timersRef = useRef([]);
  const [inView, setInView] = useState(false);
  const [beat, setBeat] = useState(0);
  const [runId, setRunId] = useState(0);
  const [clicking, setClicking] = useState(false);
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setBeat(0);
          setRunId((r) => r + 1);
        } else {
          setInView(false);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    clearTimers();
    if (!inView || reduced) return undefined;
    let at = 0;
    SCRIPT.forEach((s, i) => {
      if (i === 0) return;
      at += SCRIPT[i - 1].hold;
      const t = setTimeout(() => setBeat(i), at);
      timersRef.current.push(t);
    });
    at += SCRIPT[SCRIPT.length - 1].hold + 2000;
    const loop = setTimeout(() => {
      setBeat(0);
      setRunId((r) => r + 1);
    }, at);
    timersRef.current.push(loop);
    return clearTimers;
  }, [inView, runId, reduced, clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  // Click pulse on every beat — same cursor language as Campaign Creation
  useEffect(() => {
    if (!inView || reduced) return undefined;
    const on = setTimeout(() => setClicking(true), 30);
    const off = setTimeout(() => setClicking(false), 630);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [beat, runId, inView, reduced]);

  const step = SCRIPT[beat];
  const seen = SCRIPT.slice(0, beat + 1);
  const has = (b) => seen.some((s) => s.beat === b);

  // Organic jitter: same hotspot never hit pixel-identically twice in a row,
  // and the two tours drift out of sync with each other.
  const jitter = (base, salt) => {
    const h = (((runId + 1) * 37 + beat * 53 + salt * 91) % 100) / 100;
    return `calc(${base} + ${(h - 0.5).toFixed(2) * 4}%)`;
  };

  return (
    <div ref={wrapRef} className="eft-wrap split-left">
      <div className="eft-stagebox">
      <div className="eft-app">
        <div className="eft-side">
          {ITEMS.map((it) => (
            <div key={it.id} className={`eft-item ${step.page === it.id ? 'active' : ''}`}>
              <it.icon size={15} />
              {it.label}
            </div>
          ))}
        </div>

        <div className="eft-main" key={`${step.page}-${runId}`}>
          {step.page === 'body' && (
            <>
              <div className="eft-subject">Idea for <span className="eft-pill">{"{{company_name}}"}</span></div>
              <div className="eft-body">
                Hello {has('pill') ? <span className="eft-pill eft-pop">{"{{D1_names}}"}</span> : <span className="eft-caret" />}
                <p>Quick context for your team — reply “later” and I’ll circle back.</p>
              </div>
              <div className="eft-sendbtn static"><Send size={15} /> Save Draft</div>
            </>
          )}

          {step.page === 'automation' && (
            <>
              <div className="eft-drafts">
                <div className={`eft-draftcard ${has('pick') ? 'picked' : ''}`}>
                  <b>Q4 outreach</b>
                  <span>7 variables · roster.xlsx</span>
                </div>
                <div className="eft-draftcard dim"><b>Welcome series</b><span>3 variables</span></div>
              </div>
              <div className="eft-preview">
                <Mail size={15} />
                {has('sent')
                  ? <span>Hello <b>Aarav</b> — preview of row 1 of 240…</span>
                  : <span>Hello {"{{D1_names}}"} — pick a row to preview…</span>}
              </div>
              <div className={`eft-sendbtn ${has('sent') ? 'done' : ''}`}>
                <Send size={15} /> {has('sent') ? '240 sent ✓' : 'Send'}
              </div>
              {has('sent') && <div className="eft-bar"><div className="eft-fill" /></div>}
            </>
          )}

          {step.page === 'excel' && (
            <>
              <div className="eft-grid">
                <div className="eft-row eft-head-row"><span>D1_names</span><span>D1_rollno</span><span>email</span></div>
                {(has('fill') || has('count') ? ROWS : []).map((r, i) => (
                  <div className="eft-row eft-row-in" key={i} style={{ animationDelay: `${i * 0.25}s` }}>
                    <span>{r.name}</span><span>{r.roll}</span><span>{r.name.toLowerCase()}@…edu.in</span>
                  </div>
                ))}
              </div>
              {has('count') && (
                <div className="eft-count"><CheckCircle2 size={14} /> 240 valid · 3 quarantined — ready to send</div>
              )}
            </>
          )}
        </div>

        {inView && !reduced && (
          <div className={`simulated-cursor ${clicking ? 'clicked' : ''}`} style={{ top: jitter(step.cursor.top, 1), left: jitter(step.cursor.left, 2), right: 'auto' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#1A1D1D" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L5.85 2.86a.5.5 0 0 0-.85.35Z"/>
            </svg>
            {clicking && <div className="click-ripple" />}
          </div>
        )}
      </div>
      </div>

      <aside className="eft-copy">
        <h2 className="tour-section-title">5. Personalized Email <span className="cz-fw-highlight">Outreach</span></h2>
        <p className="tour-section-desc">Write once and let Excel do the rest. Columns pop in as pills while you type, rows bind themselves, and every campaign is previewed against real data before it leaves.</p>
        <p className="eft-caption live">{CAPTIONS[step.beat]}</p>
      </aside>
    </div>
  );
}
