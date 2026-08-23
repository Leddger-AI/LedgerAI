import { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
const firstDayOfMonth = (month, year) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 7 : day; // Monday = 1 ... Sunday = 7
};
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Small month calendar that marks days with a colored dot per `markers`
 * (a Map<dayNumber, 'green' | 'red'> for the currently-viewed month only).
 * Read-only display + month navigation — no date selection is wired to
 * anything outside the widget yet.
 */
export default function MeetingCalendarWidget({ title = 'Meeting Calendar', markersByMonth, today = new Date() }) {
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const totalDays = daysInMonth(month, year);
  const startOffset = firstDayOfMonth(month, year);
  const monthKey = `${year}-${month}`;
  const markers = (markersByMonth && markersByMonth[monthKey]) || {};

  const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const cells = [];
  for (let i = 0; i < startOffset - 1; i++) {
    cells.push(<div key={`pad-${i}`} className="mcw-day mcw-day-pad" />);
  }
  for (let day = 1; day <= totalDays; day++) {
    const cellDate = new Date(year, month, day);
    const isSelected = sameDay(cellDate, selectedDay);
    const dotColor = markers[day];
    cells.push(
      <button
        type="button"
        key={day}
        className={`mcw-day ${isSelected ? 'mcw-day-selected' : ''}`}
        onClick={() => setSelectedDay(cellDate)}
      >
        <span>{day}</span>
        {dotColor && !isSelected && <span className={`mcw-dot mcw-dot-${dotColor}`} />}
      </button>
    );
  }

  return (
    <div className="glass-panel mcw-widget">
      <div className="mcw-header">
        <h3 className="mcw-title">{title}</h3>
        <MoreHorizontal size={18} style={{ color: 'var(--text-muted)' }} />
      </div>

      <div className="mcw-month-nav">
        <button type="button" className="mcw-nav-btn" onClick={goPrevMonth} aria-label="Previous month">
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <span className="mcw-month-label">{MONTH_NAMES[month]} {year}</span>
        <button type="button" className="mcw-nav-btn" onClick={goNextMonth} aria-label="Next month">
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="mcw-weekdays">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
      </div>

      <div className="mcw-grid">
        {cells}
      </div>
    </div>
  );
}
