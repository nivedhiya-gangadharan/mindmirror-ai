/**
 * Formats a 24-hour time string (e.g. "09:00", "14:30", "14:30:00")
 * into 12-hour AM/PM format (e.g. "9:00 AM", "2:30 PM").
 *
 * @param {string} time24 - 24-hour time string
 * @returns {string} Formatted 12-hour time string
 */
export const formatTime = (time24) => {
  if (!time24) return '';
  if (typeof time24 === 'string' && (time24.includes('AM') || time24.includes('PM'))) {
    return time24;
  }
  const [hourStr, minute = '00'] = String(time24).split(':');
  let hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return time24;
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${period}`;
};

/**
 * Formats a slot (string or object) for button label display.
 *
 * @param {string|object} slot - Time slot representation
 * @returns {string} Formatted 12-hour AM/PM string
 */
export const formatSlotLabel = (slot) => {
  if (!slot) return '';
  if (typeof slot === 'string') {
    if (slot.includes(' - ')) {
      const [start, end] = slot.split(' - ');
      return `${formatTime(start)} - ${formatTime(end)}`;
    }
    return formatTime(slot);
  }
  if (slot.start_time && slot.end_time) {
    return `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`;
  }
  if (slot.start_time) {
    return formatTime(slot.start_time);
  }
  if (slot.label) {
    if (slot.label.includes(' - ')) {
      const [start, end] = slot.label.split(' - ');
      return `${formatTime(start)} - ${formatTime(end)}`;
    }
    return formatTime(slot.label);
  }
  return String(slot);
};

export default formatTime;
