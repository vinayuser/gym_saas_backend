export const money = (value) => (value == null ? null : Number(value));

export const fullName = (first, last) => `${first || ''} ${last || ''}`.trim();

export const iso = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const durationLabel = (checkInAt, checkOutAt) => {
  if (!checkInAt || !checkOutAt) return null;
  const mins = Math.round((new Date(checkOutAt) - new Date(checkInAt)) / 60000);
  if (mins < 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};
