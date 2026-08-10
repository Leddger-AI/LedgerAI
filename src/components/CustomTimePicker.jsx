import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function CustomTimePicker({ value, onChange }) {
  // Parse existing time string (HH:MM format) or default to 07:00
  const parseTime = (timeStr) => {
    if (!timeStr) return { hours: 7, minutes: 0 };
    const [h, m] = timeStr.split(':');
    return { hours: parseInt(h, 10), minutes: parseInt(m, 10) };
  };

  const { hours, minutes } = parseTime(value);

  const formatTime = (h, m) => {
    const formattedH = h.toString().padStart(2, '0');
    const formattedM = m.toString().padStart(2, '0');
    return `${formattedH}:${formattedM}`;
  };

  const formatDisplayTime = (h, m) => {
    const ampm = h >= 12 ? 'pm' : 'am';
    const displayH = h % 12 || 12;
    const displayM = m.toString().padStart(2, '0');
    return (
      <>
        {displayH}:{displayM}
        <span className="time-ampm">{ampm}</span>
      </>
    );
  };

  const handleDecrement = () => {
    let newM = minutes - 30;
    let newH = hours;
    
    if (newM < 0) {
      newM += 60;
      newH -= 1;
    }
    if (newH < 0) newH = 23;
    
    onChange(formatTime(newH, newM));
  };

  const handleIncrement = () => {
    let newM = minutes + 30;
    let newH = hours;
    
    if (newM >= 60) {
      newM -= 60;
      newH += 1;
    }
    if (newH >= 24) newH = 0;
    
    onChange(formatTime(newH, newM));
  };

  return (
    <div className="custom-time-picker-widget">
      <button 
        type="button" 
        className="time-btn time-btn-minus"
        onClick={handleDecrement}
      >
        <Minus size={20} />
      </button>
      
      <div className="time-display">
        {formatDisplayTime(hours, minutes)}
      </div>
      
      <button 
        type="button" 
        className="time-btn time-btn-plus"
        onClick={handleIncrement}
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
