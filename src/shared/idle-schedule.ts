/** Waktu tempatan PC, dalam format 24 jam HH:mm. */
export function isValidIdleTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isIdleQuietTime(now: Date, sleepTime: string, wakeTime: string): boolean {
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return sleepTime > wakeTime
    ? time >= sleepTime || time < wakeTime
    : time >= sleepTime && time < wakeTime;
}

/** Termasuk semakan selepas PC bangun atau timer terlepas lebih daripada sehari. */
export function crossedIdleWakeTime(previous: Date, now: Date, wakeTime: string): boolean {
  if (now <= previous) return false;
  const [hour, minute] = wakeTime.split(':').map(Number);
  const latestWake = new Date(now);
  latestWake.setHours(hour, minute, 0, 0);
  if (latestWake > now) latestWake.setDate(latestWake.getDate() - 1);
  return latestWake > previous;
}
