export function localIsoDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

export function isDateInRange(value, start, end) {
  if (!value) return false;
  return (!start || value >= start) && (!end || value <= end);
}

export function formatIndonesianDate(value, fallback = '—') {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function daysSince(value, today = localIsoDate()) {
  if (!value) return null;
  const start = new Date(`${value}T00:00:00`);
  const end = new Date(`${today}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.floor((end - start) / 86400000));
}
