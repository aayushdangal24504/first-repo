import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { CustomRecurrencePattern } from '@/lib/recurrence-utils';
import {
  getRecurrenceDescription,
  validateCustomPattern
} from '@/lib/recurrence-utils';
import './RecurrenceSetup.css';

interface RecurrenceSetupProps {
  recurrenceRule: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customPattern?: CustomRecurrencePattern;
  onRecurrenceChange: (rule: string, pattern?: CustomRecurrencePattern) => void;
  onClose: () => void;
}

export const RecurrenceSetup = ({
  recurrenceRule,
  customPattern,
  onRecurrenceChange,
  onClose
}: RecurrenceSetupProps) => {
  const [selectedRule, setSelectedRule] = useState(recurrenceRule);
  const [customFrequency, setCustomFrequency] = useState<any>(
    customPattern?.frequency || 'every_day'
  );
  const [customInterval, setCustomInterval] = useState(customPattern?.interval || 1);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>(
    customPattern?.daysOfWeek || []
  );
  const [dayOfMonth, setDayOfMonth] = useState(customPattern?.dayOfMonth || 1);
  const [error, setError] = useState<string | null>(null);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleDayToggle = (day: number) => {
    setSelectedDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    setError(null);
  };

  const handleSave = () => {
    let finalPattern: CustomRecurrencePattern | undefined;

    if (selectedRule === 'custom') {
      finalPattern = {
        frequency: customFrequency,
        interval: customFrequency.includes('every_x_') ? customInterval : undefined,
        daysOfWeek: customFrequency === 'every_day_of_week' ? selectedDaysOfWeek : undefined,
        dayOfMonth: customFrequency === 'every_x_day_of_month' ? dayOfMonth : undefined
      };

      const validationError = validateCustomPattern(finalPattern);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    onRecurrenceChange(selectedRule, finalPattern);
    onClose();
  };

  return (
    <div className="recurrence-setup">
      <div className="setup-header">
        <h3>Set Recurrence</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="rule-selector">
        <div className="rule-options">
          {(['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] as const).map((rule) => (
            <label key={rule} className="rule-option">
              <input
                type="radio"
                name="rule"
                value={rule}
                checked={selectedRule === rule}
                onChange={(e) => {
                  setSelectedRule(e.target.value as typeof rule);
                  setError(null);
                }}
              />
              <span>
                {rule === 'none' && 'Never'}
                {rule === 'daily' && 'Daily'}
                {rule === 'weekly' && 'Weekly'}
                {rule === 'monthly' && 'Monthly'}
                {rule === 'yearly' && 'Yearly'}
                {rule === 'custom' && 'Custom...'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {selectedRule === 'custom' && (
        <div className="custom-options">
          <div className="form-group">
            <label>Repeat Pattern</label>
            <select
              value={customFrequency}
              onChange={(e) => {
                setCustomFrequency(e.target.value);
                setError(null);
              }}
              className="frequency-select"
            >
              <option value="every_day">Every day</option>
              <option value="every_x_days">Every X days</option>
              <option value="every_week">Every week</option>
              <option value="every_x_weeks">Every X weeks</option>
              <option value="every_month">Every month</option>
              <option value="every_x_months">Every X months</option>
              <option value="every_year">Every year</option>
              <option value="every_day_of_week">Specific days (e.g., Mondays)</option>
              <option value="every_x_day_of_month">Specific day of month (e.g., 15th)</option>
            </select>
          </div>

          {customFrequency.startsWith('every_x_') && (
            <div className="form-group">
              <label>Interval</label>
              <input
                type="number"
                min="1"
                max="365"
                value={customInterval}
                onChange={(e) => setCustomInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className="interval-input"
              />
            </div>
          )}

          {customFrequency === 'every_day_of_week' && (
            <div className="form-group">
              <label>Days of Week</label>
              <div className="day-selector">
                {dayNames.map((day, index) => (
                  <label key={index} className="day-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedDaysOfWeek.includes(index)}
                      onChange={() => handleDayToggle(index)}
                    />
                    <span>{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {customFrequency === 'every_x_day_of_month' && (
            <div className="form-group">
              <label>Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                className="day-input"
              />
            </div>
          )}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="preview">
        <strong>Preview:</strong>
        <p>{getRecurrenceDescription(selectedRule, customPattern)}</p>
      </div>

      <div className="setup-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Apply
        </Button>
      </div>
    </div>
  );
};
