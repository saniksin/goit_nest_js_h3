import { dayRange } from './time-zone';

describe('dayRange', () => {
  it('рахує межі доби в часовому поясі кінотеатру', () => {
    expect(dayRange('2030-05-01', 'Europe/Kyiv')).toEqual({
      from: new Date('2030-04-30T21:00:00Z'),
      to: new Date('2030-05-01T21:00:00Z'),
    });
    expect(dayRange('2030-01-15', 'Europe/Kyiv')).toEqual({
      from: new Date('2030-01-14T22:00:00Z'),
      to: new Date('2030-01-15T22:00:00Z'),
    });
  });

  it('враховує добу на 23 і 25 годин при переході на літній і зимовий час', () => {
    const spring = dayRange('2026-03-08', 'America/New_York');
    expect(spring).toEqual({
      from: new Date('2026-03-08T05:00:00Z'),
      to: new Date('2026-03-09T04:00:00Z'),
    });
    const autumn = dayRange('2026-11-01', 'America/New_York');
    expect(autumn.to.getTime() - autumn.from.getTime()).toBe(25 * 3_600_000);
  });

  it('переходить через кінець місяця й року', () => {
    expect(dayRange('2030-12-31', 'UTC')).toEqual({
      from: new Date('2030-12-31T00:00:00Z'),
      to: new Date('2031-01-01T00:00:00Z'),
    });
  });
});
