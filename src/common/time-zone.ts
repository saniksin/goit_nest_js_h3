// Перетворення локального часу кінотеатру на момент UTC без сторонніх бібліотек.
// Зсув часового поясу береться з Intl, тож переходи на літній і зимовий час ураховуються

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
  const wallClockAsUtc = utc(
    part('year'),
    part('month'),
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
  return wallClockAsUtc - (instant - (((instant % 1000) + 1000) % 1000));
}

// Date.UTC для будь-якого року: сам Date.UTC трактує роки 0–99 як 1900–1999
function utc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date.getTime();
}

// Момент UTC, коли в часовому поясі на годиннику year-month-day hour:minute:second
export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date {
  const wallClock = utc(year, month, day, hour, minute, second, millisecond);
  // Перше наближення бере зсув у момент wallClock за UTC, друге уточнює його вже біля шуканого моменту
  const guess = wallClock - offsetAt(wallClock, timeZone);
  return new Date(wallClock - offsetAt(guess, timeZone));
}

// Межі календарної доби в часовому поясі: [00:00 цієї дати; 00:00 наступної).
// Доба не завжди триває 24 години: у дні переходу на літній чи зимовий час — 23 або 25.
// date — рядок YYYY-MM-DD, уже перевірений DTO
export function dayRange(
  date: string,
  timeZone: string,
): { from: Date; to: Date } {
  const [year, month, day] = date.split('-').map(Number);
  return {
    from: zonedTimeToUtc(timeZone, year, month, day),
    to: zonedTimeToUtc(timeZone, year, month, day + 1),
  };
}

const LOCAL_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?$/;

// Дата й час ISO 8601. Рядок зі зсувом (Z або ±hh:mm) однозначний сам по собі,
// а рядок без зсуву — це час на годиннику кінотеатру, а не сервера
export function parseDateTime(value: string, timeZone: string): Date {
  const local = LOCAL_DATE_TIME.exec(value);
  if (local === null) {
    return new Date(value);
  }
  const [, year, month, day, hour, minute, second, fraction] = local;
  return zonedTimeToUtc(
    timeZone,
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? 0),
    Number((fraction ?? '0').padEnd(3, '0')),
  );
}
