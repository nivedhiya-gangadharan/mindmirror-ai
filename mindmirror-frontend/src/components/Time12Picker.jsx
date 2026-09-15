/**
 * Custom 12-hour AM/PM Time Picker.
 * Presents hour (1-12), minute (00, 15, 30, 45), and an AM/PM toggle selector.
 * Stores and exchanges 24-hour time values ("HH:MM") with parent form state.
 */
export default function Time12Picker({ id, value = '09:00', onChange, disabled = false }) {
  // Parse 24-hour value into 12-hour components
  const parse24To12 = (val) => {
    if (!val) return { hour: '9', minute: '00', period: 'AM' };
    const [hStr, mStr = '00'] = String(val).split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) h = 9;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return {
      hour: String(hour12),
      minute: mStr.slice(0, 2),
      period,
    };
  };

  const format12To24 = (h12Str, minStr, prd) => {
    let h = parseInt(h12Str, 10);
    if (isNaN(h)) h = 12;
    if (prd === 'AM') {
      if (h === 12) h = 0;
    } else {
      if (h < 12) h += 12;
    }
    const hh = String(h).padStart(2, '0');
    const mm = String(minStr).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const { hour, minute, period } = parse24To12(value);

  const minuteOptions = ['00', '15', '30', '45'];
  if (!minuteOptions.includes(minute)) {
    minuteOptions.push(minute);
    minuteOptions.sort();
  }

  const handleHourChange = (newHour) => {
    onChange(format12To24(newHour, minute, period));
  };

  const handleMinuteChange = (newMinute) => {
    onChange(format12To24(hour, newMinute, period));
  };

  const handlePeriodChange = (newPeriod) => {
    onChange(format12To24(hour, minute, newPeriod));
  };

  return (
    <div className="time-12-picker-container" id={id}>
      <select
        aria-label="Hour"
        value={hour}
        onChange={(e) => handleHourChange(e.target.value)}
        disabled={disabled}
        className="time-12-select"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
          <option key={h} value={String(h)}>
            {h}
          </option>
        ))}
      </select>
      <span className="time-12-colon">:</span>
      <select
        aria-label="Minute"
        value={minute}
        onChange={(e) => handleMinuteChange(e.target.value)}
        disabled={disabled}
        className="time-12-select"
      >
        {minuteOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <div className="time-12-period-toggle">
        <button
          type="button"
          className={`period-btn ${period === 'AM' ? 'active' : ''}`}
          onClick={() => handlePeriodChange('AM')}
          disabled={disabled}
        >
          AM
        </button>
        <button
          type="button"
          className={`period-btn ${period === 'PM' ? 'active' : ''}`}
          onClick={() => handlePeriodChange('PM')}
          disabled={disabled}
        >
          PM
        </button>
      </div>
    </div>
  );
}
