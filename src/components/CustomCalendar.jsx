import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CustomCalendar({ value, onChange }) {
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => {
    let day = new Date(year, month, 1).getDay();
    // Convert Sunday (0) to 7, so Monday is 1
    return day === 0 ? 7 : day;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (day) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onChange(newDate);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const renderDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year); // 1 = Monday, 7 = Sunday
    
    // Previous month days for padding
    const prevMonthDays = daysInMonth(month - 1, year);
    
    const days = [];
    
    // Add previous month padding
    for (let i = startDay - 1; i > 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="calendar-day padding-day">
          {prevMonthDays - i + 1}
        </div>
      );
    }
    
    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      const isSelected = value && 
        new Date(value).getDate() === i && 
        new Date(value).getMonth() === month && 
        new Date(value).getFullYear() === year;
        
      days.push(
        <div 
          key={i} 
          className={`calendar-day ${isSelected ? 'selected' : ''}`}
          onClick={() => handleSelectDate(i)}
        >
          {i}
        </div>
      );
    }
    
    // Add next month padding to complete the grid (42 cells total)
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <div key={`next-${i}`} className="calendar-day padding-day">
          {i}
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="custom-calendar-widget">
      <div className="calendar-header">
        <button type="button" className="calendar-nav" onClick={handlePrevMonth}>
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <div className="calendar-title">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <button type="button" className="calendar-nav" onClick={handleNextMonth}>
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>
      
      <div className="calendar-weekdays">
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
        <span>S</span>
      </div>
      
      <div className="calendar-grid">
        {renderDays()}
      </div>
    </div>
  );
}
