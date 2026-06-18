import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import './CalendarDateNavigator.css';

interface CalendarDateNavigatorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onClose?: () => void;
}

export const CalendarDateNavigator = ({
  currentDate,
  onDateChange,
  onClose
}: CalendarDateNavigatorProps) => {
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(selectedYear, selectedMonth, day);
    setSelectedDay(day);
    onDateChange(newDate);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setShowYearPicker(false);
  };

  const renderYearPicker = () => {
    const startYear = Math.floor(selectedYear / 10) * 10;
    const years = [];
    for (let i = 0; i < 12; i++) {
      years.push(startYear + i);
    }

    return (
      <div className="year-picker">
        <div className="year-picker-header">
          <Button
            variant="secondary"
            className="h-8 px-3"
            onClick={() => setSelectedYear(Math.max(1900, selectedYear - 10))}
          >
            ←
          </Button>
          <span>{startYear} - {startYear + 11}</span>
          <Button
            variant="secondary"
            className="h-8 px-3"
            onClick={() => setSelectedYear(Math.min(2100, selectedYear + 10))}
          >
            →
          </Button>
        </div>
        <div className="year-grid">
          {years.map((year) => (
            <button
              key={year}
              className={`year-button ${year === selectedYear ? 'active' : ''}`}
              onClick={() => handleYearSelect(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderCalendar = () => {
    const daysCount = daysInMonth(selectedYear, selectedMonth);
    const firstDay = firstDayOfMonth(selectedYear, selectedMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysCount; day++) {
      days.push(day);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="calendar">
        <div className="calendar-header">
          <Button variant="secondary" className="h-8 px-3" onClick={handlePrevMonth}>
            ←
          </Button>
          <div className="month-year-selector">
            <button
              className="month-btn"
              onClick={() => setShowYearPicker(false)}
            >
              {monthNames[selectedMonth]}
            </button>
            <button
              className="year-btn"
              onClick={() => setShowYearPicker(true)}
            >
              {selectedYear}
            </button>
          </div>
          <Button variant="secondary" className="h-8 px-3" onClick={handleNextMonth}>
            →
          </Button>
        </div>

        {showYearPicker ? (
          renderYearPicker()
        ) : (
          <>
            <div className="day-names">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="day-name">
                  {day}
                </div>
              ))}
            </div>
            <div className="calendar-grid">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="calendar-week">
                  {week.map((day, dayIndex) => (
                    <button
                      key={`${weekIndex}-${dayIndex}`}
                      className={`calendar-day ${day === null ? 'empty' : ''} ${
                        day === selectedDay ? 'selected' : ''
                      }`}
                      onClick={() => day && handleSelectDate(day)}
                      disabled={day === null}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="calendar-date-navigator">
      <div className="navigator-header">
        <h3>Select Date</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      {renderCalendar()}
    </div>
  );
};
