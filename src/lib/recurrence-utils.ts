/**
 * Advanced recurring reminders and events utility
 */

export type RecurrenceRule = 
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export type CustomRecurrenceFrequency =
  | 'every_day'
  | 'every_week'
  | 'every_month'
  | 'every_year'
  | 'every_x_days'
  | 'every_x_weeks'
  | 'every_x_months'
  | 'every_specific_date'
  | 'every_day_of_week'
  | 'every_x_day_of_month';

export interface CustomRecurrencePattern {
  frequency: CustomRecurrenceFrequency;
  interval?: number; // For 'every X days/weeks/months'
  dayOfWeek?: number; // 0-6 for specific days (Mon-Sun)
  dayOfMonth?: number; // 1-31 for specific dates
  monthOfYear?: number; // 1-12 for yearly recurrence
  daysOfWeek?: number[]; // For multiple days per week
  endDate?: string; // ISO date string
  maxOccurrences?: number;
}

/**
 * Calculate next reminder date based on recurrence rule
 */
export const calculateNextReminderDate = (
  currentDate: Date,
  recurrenceRule: RecurrenceRule,
  customPattern?: CustomRecurrencePattern
): Date | null => {
  const next = new Date(currentDate);

  switch (recurrenceRule) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      return next;

    case 'weekly':
      next.setDate(next.getDate() + 7);
      return next;

    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      return next;

    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      return next;

    case 'custom':
      if (!customPattern) return null;
      return calculateCustomRecurrence(next, customPattern);

    case 'none':
    default:
      return null;
  }
};

/**
 * Calculate next date for custom recurrence patterns
 */
const calculateCustomRecurrence = (
  currentDate: Date,
  pattern: CustomRecurrencePattern
): Date | null => {
  const next = new Date(currentDate);

  switch (pattern.frequency) {
    case 'every_day':
      next.setDate(next.getDate() + 1);
      break;

    case 'every_x_days':
      if (pattern.interval) {
        next.setDate(next.getDate() + pattern.interval);
      }
      break;

    case 'every_week':
      next.setDate(next.getDate() + 7);
      break;

    case 'every_x_weeks':
      if (pattern.interval) {
        next.setDate(next.getDate() + 7 * pattern.interval);
      }
      break;

    case 'every_month':
      next.setMonth(next.getMonth() + 1);
      break;

    case 'every_x_months':
      if (pattern.interval) {
        next.setMonth(next.getMonth() + pattern.interval);
      }
      break;

    case 'every_year':
      next.setFullYear(next.getFullYear() + 1);
      break;

    case 'every_day_of_week': {
      // Find next occurrence of specific day(s) of week
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        let daysToAdd = 1;
        while (daysToAdd <= 7) {
          next.setDate(next.getDate() + 1);
          if (pattern.daysOfWeek.includes(next.getDay())) {
            break;
          }
          daysToAdd++;
        }
      }
      break;
    }

    case 'every_x_day_of_month': {
      // Find next occurrence of specific day of month
      if (pattern.dayOfMonth) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(pattern.dayOfMonth);
      }
      break;
    }

    case 'every_specific_date': {
      // Move to next year if date has passed
      if (pattern.monthOfYear && pattern.dayOfMonth) {
        next.setMonth(pattern.monthOfYear - 1);
        next.setDate(pattern.dayOfMonth);
        if (next < currentDate) {
          next.setFullYear(next.getFullYear() + 1);
        }
      }
      break;
    }
  }

  // Check if end date or max occurrences reached
  if (pattern.endDate && next > new Date(pattern.endDate)) {
    return null;
  }

  return next;
};

/**
 * Get user-friendly description of recurrence rule
 */
export const getRecurrenceDescription = (
  recurrenceRule: RecurrenceRule,
  customPattern?: CustomRecurrencePattern
): string => {
  switch (recurrenceRule) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return 'Every week';
    case 'monthly':
      return 'Every month';
    case 'yearly':
      return 'Every year';
    case 'custom':
      if (!customPattern) return 'Never';
      return getCustomRecurrenceDescription(customPattern);
    case 'none':
    default:
      return 'Never';
  }
};

/**
 * Get user-friendly description of custom recurrence pattern
 */
const getCustomRecurrenceDescription = (pattern: CustomRecurrencePattern): string => {
  switch (pattern.frequency) {
    case 'every_day':
      return 'Every day';

    case 'every_x_days':
      return pattern.interval && pattern.interval > 1
        ? `Every ${pattern.interval} days`
        : 'Every day';

    case 'every_week':
      return 'Every week';

    case 'every_x_weeks':
      return pattern.interval && pattern.interval > 1
        ? `Every ${pattern.interval} weeks`
        : 'Every week';

    case 'every_month':
      return 'Every month';

    case 'every_x_months':
      return pattern.interval && pattern.interval > 1
        ? `Every ${pattern.interval} months`
        : 'Every month';

    case 'every_year':
      return 'Every year';

    case 'every_day_of_week': {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        const days = pattern.daysOfWeek.map((d) => dayNames[d]).join(', ');
        return `Every ${days}`;
      }
      return 'Weekly';
    }

    case 'every_x_day_of_month': {
      const dayNum = pattern.dayOfMonth || 1;
      const suffix =
        dayNum === 1 || dayNum === 21 || dayNum === 31
          ? 'st'
          : dayNum === 2 || dayNum === 22
            ? 'nd'
            : dayNum === 3 || dayNum === 23
              ? 'rd'
              : 'th';
      return `Every ${dayNum}${suffix} of the month`;
    }

    case 'every_specific_date': {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const month = pattern.monthOfYear ? monthNames[pattern.monthOfYear - 1] : '?';
      const day = pattern.dayOfMonth || '?';
      return `Every ${month} ${day}`;
    }

    default:
      return 'Custom';
  }
};

/**
 * Validate custom recurrence pattern
 */
export const validateCustomPattern = (pattern: CustomRecurrencePattern): string | null => {
  if (!pattern.frequency) {
    return 'Frequency is required';
  }

  switch (pattern.frequency) {
    case 'every_x_days':
    case 'every_x_weeks':
    case 'every_x_months':
      if (!pattern.interval || pattern.interval < 1) {
        return 'Interval must be at least 1';
      }
      break;

    case 'every_day_of_week':
      if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
        return 'Select at least one day of week';
      }
      break;

    case 'every_x_day_of_month':
      if (!pattern.dayOfMonth || pattern.dayOfMonth < 1 || pattern.dayOfMonth > 31) {
        return 'Day of month must be between 1 and 31';
      }
      break;

    case 'every_specific_date':
      if (!pattern.monthOfYear || !pattern.dayOfMonth) {
        return 'Month and day are required';
      }
      if (pattern.monthOfYear < 1 || pattern.monthOfYear > 12) {
        return 'Month must be between 1 and 12';
      }
      if (pattern.dayOfMonth < 1 || pattern.dayOfMonth > 31) {
        return 'Day must be between 1 and 31';
      }
      break;
  }

  return null;
};
