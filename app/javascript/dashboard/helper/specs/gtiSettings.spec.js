import {
  isValidRule,
  isWhatsappInbox,
  rulesFromWorkingHours,
  workingHoursFromRules,
} from '../gtiSettings';

const open = (day, openHour, closeHour, closeMinutes = 0) => ({
  day_of_week: day,
  closed_all_day: false,
  open_all_day: false,
  open_hour: openHour,
  open_minutes: 0,
  close_hour: closeHour,
  close_minutes: closeMinutes,
});
const closed = day => ({
  day_of_week: day,
  closed_all_day: true,
  open_all_day: false,
});

describe('rulesFromWorkingHours', () => {
  it('groups the days that share opening hours, Monday first', () => {
    const rows = [
      closed(0),
      open(1, 8, 23, 59),
      open(2, 8, 23, 59),
      open(3, 8, 23, 59),
      open(4, 8, 23, 59),
      open(5, 8, 23, 59),
      open(6, 9, 14),
    ];

    expect(rulesFromWorkingHours(rows)).toEqual([
      { days: [1, 2, 3, 4, 5], from: '08:00', to: '23:59' },
      { days: [6], from: '09:00', to: '14:00' },
    ]);
  });

  it('reads an all-day row as the whole day', () => {
    const rows = [
      { day_of_week: 0, closed_all_day: false, open_all_day: true },
    ];

    expect(rulesFromWorkingHours(rows)).toEqual([
      { days: [0], from: '00:00', to: '23:59' },
    ]);
  });
});

describe('workingHoursFromRules', () => {
  it('writes the seven days, closing the ones no rule mentions', () => {
    const rows = workingHoursFromRules([
      { days: [1, 2], from: '08:30', to: '18:00' },
    ]);

    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual(closed(0));
    expect(rows[1]).toMatchObject({
      day_of_week: 1,
      closed_all_day: false,
      open_hour: 8,
      open_minutes: 30,
      close_hour: 18,
      close_minutes: 0,
    });
    expect(rows[3]).toEqual(closed(3));
  });

  it('lets the later rule win a day both rules claim', () => {
    const rows = workingHoursFromRules([
      { days: [6], from: '08:00', to: '18:00' },
      { days: [6], from: '09:00', to: '14:00' },
    ]);

    expect(rows[6]).toMatchObject({ open_hour: 9, close_hour: 14 });
  });

  it('round-trips with rulesFromWorkingHours', () => {
    const rules = [
      { days: [1, 2, 3, 4, 5], from: '08:00', to: '18:00' },
      { days: [6], from: '09:00', to: '14:00' },
    ];

    expect(rulesFromWorkingHours(workingHoursFromRules(rules))).toEqual(rules);
  });
});

describe('isValidRule', () => {
  it('needs a day and a closing time after the opening', () => {
    expect(isValidRule({ days: [1], from: '08:00', to: '18:00' })).toBe(true);
    expect(isValidRule({ days: [], from: '08:00', to: '18:00' })).toBe(false);
    expect(isValidRule({ days: [1], from: '18:00', to: '08:00' })).toBe(false);
  });
});

describe('isWhatsappInbox', () => {
  it('matches WhatsApp channels only', () => {
    expect(isWhatsappInbox({ channel_type: 'Channel::Whatsapp' })).toBe(true);
    expect(isWhatsappInbox({ channel_type: 'Channel::Api' })).toBe(false);
  });
});
