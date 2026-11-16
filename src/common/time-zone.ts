// Межі календарної доби в заданому часовому поясі: [00:00 цієї дати; 00:00 наступної).
// Доба не завжди триває 24 години: у дні переходу на літній чи зимовий час — 23 або 25

// Зсув часового поясу (локальний час мінус UTC) у мілісекундах у момент instant
function offsetAt(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
  return wallClockAsUtc - (instant - (instant % 1000));
}

// Момент, коли в часовому поясі настає 00:00 дати year-month-day
function startOfDay(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const midnightAsUtc = Date.UTC(year, month - 1, day);
  // Перше наближення бере зсув опівночі за UTC, друге уточнює його вже біля шуканого моменту
  const guess = midnightAsUtc - offsetAt(midnightAsUtc, timeZone);
  return new Date(midnightAsUtc - offsetAt(guess, timeZone));
}

// date — рядок YYYY-MM-DD, уже перевірений DTO
export function dayRange(
  date: string,
  timeZone: string,
): { from: Date; to: Date } {
  const [year, month, day] = date.split('-').map(Number);
  return {
    from: startOfDay(year, month, day, timeZone),
    to: startOfDay(year, month, day + 1, timeZone),
  };
}
