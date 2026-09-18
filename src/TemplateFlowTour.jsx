import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap, Briefcase, Users, FileText,
  Send, Monitor, Smartphone, CalendarDays, CheckCircle2,
} from 'lucide-react';
import './InteractiveTour.css';
import './EmailFlowTour.css';
import './TemplateFlowTour.css';

// Template-form way ONLY — fully AUTOMATIC, cursor only.
// Sidebar: builder pages, then Schedule with a drum time picker.
const ITEMS = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'employee', label: 'Employee', icon: Briefcase },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'active', label: 'Active', icon: Send },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
];

const SCRIPT = [
  { page: 'student', cursor: { top: '34%', left: '28%' }, beat: 'toggle', hold: 1400 },
  { page: 'student', cursor: { top: '12%', left: '74%' }, beat: 'mobile', hold: 1300 },
  { page: 'student', cursor: { top: '12%', left: '62%' }, beat: 'desktop', hold: 1300 },
  { page: 'student', cursor: { top: '90%', left: '28%' }, beat: 'save', hold: 1700 },
  { page: 'schedule', cursor: { top: '70%', left: '12%' }, beat: 'nav', hold: 1200 },
  { page: 'schedule', cursor: { top: '36%', left: '42%' }, beat: 'datefrom', hold: 1500 },
  { page: 'schedule', cursor: { top: '36%', left: '48%' }, beat: 'dateto', hold: 1500 },
  { page: 'schedule', cursor: { top: '60%', left: '42%' }, beat: 'hour', hold: 1700 },
  { page: 'schedule', cursor: { top: '60%', left: '60%' }, beat: 'minute', hold: 1700 },
  { page: 'schedule', cursor: { top: '88%', left: '50%' }, beat: 'done', hold: 2000 },
];

const CAPTIONS = {
  toggle: 'Flip on the fields mentors must fill',
  mobile: 'Mobile view — thumb-ready',
  desktop: 'Desktop view — full width',
  save: 'Save as Draft',
  nav: 'Sidebar → Schedule page',
  datefrom: 'Active from the 9th…',
  dateto: '…through the 10th',
  hour: 'Drag the hour drum to 10…',
  minute: '…minute drum to 30',
  done: 'Live Sep 9–10, 10:30. Link collects replies.',
};

const FIELDS = ['Full Name', 'Roll Number', 'College Email'];

export default function TemplateFlowTour() {
  const wrapRef = useRef(null);
  const timersRef = useRef([]);
  const [inView, setInView] = useState(false);
  const [beat, setBeat] = useState(0);
  const [runId, setRunId] = useState(0);
  const [clicking, setClicking] = useState(false);
  // Staggered start: this tour begins ~3s after entering view so the two
  // landing cursors never march in sync.
  const [ready, setReady] = useState(false);
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
    // First entrance: hold on a quiet first frame before the cursor acts
    if (!ready) {
      const r = setTimeout(() => setReady(true), 3000);
      timersRef.current.push(r);
      return clearTimers;
    }
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
  }, [inView, runId, reduced, ready, clearTimers]);

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
  const mobile = step.beat === 'mobile';

  const jitter = (base, salt) => {
    const h = (((runId + 2) * 41 + beat * 29 + salt * 67) % 100) / 100;
    return `calc(${base} + ${(h - 0.5).toFixed(2) * 4}%)`;
  };

  return (
    <div ref={wrapRef} className="tft-wrap split-right">
      <aside className="eft-copy">
        <h2 className="tour-section-title">6. Template Forms, <span className="cz-fw-highlight">Scheduled</span></h2>
        <p className="tour-section-desc">Flip on the fields mentors must fill, check desktop and mobile views, then drum-pick the exact minute it goes live. One link collects every reply.</p>
        <p className="eft-caption live">{CAPTIONS[step.beat]}</p>
      </aside>

      <div className="tft-app">
        <div className="eft-side">
          {ITEMS.map((it) => (
            <div key={it.id} className={`eft-item ${step.page === it.id || (step.page === 'student' && it.id === 'student') || (step.page === 'schedule' && it.id === 'schedule') ? 'active' : ''}`}>
              <it.icon size={15} />
              {it.label}
            </div>
          ))}
        </div>

        <div className="tft-main" key={`${step.page}-${runId}`}>
          {step.page === 'student' && (
            <>
              <div className="tft-topbar">
                <b>Student Template</b>
                <div className="tft-viewtoggle">
                  <span className={!mobile ? 'on' : ''}><Monitor size={13} /> Desktop</span>
                  <span className={mobile ? 'on' : ''}><Smartphone size={13} /> Mobile</span>
                </div>
              </div>
              <div className="tft-split">
                <div className="tft-fields">
                  {FIELDS.map((f, i) => (
                    <div className={`eft-field ${has('toggle') && i < 3 ? 'on' : ''}`} key={f}>
                      <span>{f}</span>
                      <span className={`eft-knob ${has('toggle') && i < 3 ? 'on' : ''}`} />
                    </div>
                  ))}
                  <div className={`tft-save ${has('save') ? 'done' : ''}`}>
                    {has('save') ? 'Saved ✓ Draft' : 'Save as Draft'}
                  </div>
                </div>
                <div className={`tft-phone ${mobile ? 'narrow' : ''}`}>
                  <b>Student Evaluation Form</b>
                  <span>Full Name ______</span>
                  <span>Roll Number ______</span>
                  {has('toggle') && <span className="eft-pop">College Email ______</span>}
                </div>
              </div>
            </>
          )}

          {step.page === 'schedule' && (
            <>
              <div className="tft-schedgrid">
                <div className="tft-month">
                  <b>Your schedule</b>
                  <span>A few upcoming events</span>
                  <div className="tft-monthnav"><span>‹</span><span>SEPTEMBER 2020</span><span>›</span></div>
                  <div className="tft-week">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
                  </div>
                  <div className="tft-days">
                    {[['31', ''], ['2', ''], ['2', ''], ['3', ''], ['4', ''], ['5', ''], ['6', ''],
                      ['7', ''], ['8', ''], ['9', has('datefrom') || has('dateto') || has('hour') || has('minute') || has('done') ? 'sel-blue' : ''], ['10', has('dateto') || has('hour') || has('minute') || has('done') ? 'sel-red' : ''], ['11', ''], ['12', ''], ['13', ''],
                      ['14', 'sel-yellow'], ['15', ''], ['16', ''], ['17', ''], ['18', ''], ['19', ''], ['20', ''],
                      ['21', ''], ['22', ''], ['23', ''], ['24', ''], ['25', 'sel-blue'], ['26', ''], ['27', ''],
                      ['28', ''], ['29', 'sel-hl'], ['30', ''], ['1', ''], ['2', ''], ['3', ''], ['4', ''],
                    ].map(([d, c], i) => <span key={i} className={`tft-day ${c}`}>{d}</span>)}
                  </div>
                  <div className="tft-monthfoot">
                    {has('dateto') ? 'Blue 9 start → Red 10 end · 2 days' : has('datefrom') ? 'Blue 9 = start…' : 'Pick the active window'}
                  </div>
                </div>
                <div className="tft-drums">
                  <div className="tft-drum">
                    <div className="tft-strip" style={{ transform: has('hour') || has('minute') || has('done') ? 'translateY(-34px)' : 'translateY(0)' }}>
                      {['08', '09', '10', '11', '12'].map(v => (
                        <span key={v} className={(has('hour') || has('minute') || has('done')) ? (v === '10' ? 'sel' : '') : (v === '09' ? 'sel' : '')}>{v}</span>
                      ))}
                    </div>
                    <label>Hour</label>
                  </div>
                  <div className="tft-colon">:</div>
                  <div className="tft-drum">
                    <div className="tft-strip" style={{ transform: has('minute') || has('done') ? 'translateY(-34px)' : 'translateY(0)' }}>
                      {['28', '29', '30', '31', '32'].map(v => (
                        <span key={v} className={(has('minute') || has('done')) ? (v === '30' ? 'sel' : '') : (v === '29' ? 'sel' : '')}>{v}</span>
                      ))}
                    </div>
                    <label>Minute</label>
                  </div>
                </div>
              </div>
              <div className={`tft-activate ${has('done') ? 'done' : ''}`}>
                {has('done')
                  ? <><CheckCircle2 size={15} /> Live Sep 9–10, 10:30 · leddger.ai/form/abc123</>
                  : 'Activate'}
              </div>
            </>
          )}
        </div>

        {inView && ready && !reduced && (
          <div className={`simulated-cursor ${clicking ? 'clicked' : ''}`} style={{ top: jitter(step.cursor.top, 1), left: jitter(step.cursor.left, 2), right: 'auto' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#1A1D1D" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L5.85 2.86a.5.5 0 0 0-.85.35Z"/>
            </svg>
            {clicking && <div className="click-ripple" />}
          </div>
        )}
      </div>
    </div>
  );
}
