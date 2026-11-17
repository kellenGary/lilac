const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function formatLong(key: string): string {
  return fromKey(key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Just the weekday, e.g. "Monday". */
export function formatWeekday(key: string): string {
  return fromKey(key).toLocaleDateString('en-US', { weekday: 'long' });
}

/** Month and day, e.g. "November 16". */
export function formatMonthDay(key: string): string {
  return fromKey(key).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export function formatShort(key: string): string {
  return fromKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Monday of the week containing `key`. */
export function weekStartKey(key: string): string {
  const d = fromKey(key);
  return addDays(key, -((d.getDay() + 6) % 7));
}

/** ISO-8601 week number. */
export function weekNumber(key: string): number {
  const d = fromKey(key);
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const diffDays = (thursday.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diffDays - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

export function weekRangeLabel(startKey: string): string {
  return `${formatShort(startKey)} to ${formatShort(addDays(startKey, 6))}`;
}
