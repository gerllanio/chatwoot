// GTI "Work" settings page: converts between Ticketz-style weekly rules
// ("Mon–Fri 08:00–18:00", "Sat 09:00–14:00") and the seven working-hour rows
// every Chatwoot inbox stores (one per day, day_of_week 0 = Sunday).

export const GTI_WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];
export const GTI_NOTICE_VARIABLES = [
  '{{firstname}}',
  '{{name}}',
  '{{user}}',
  '{{queue}}',
];

const pad = value => String(value ?? 0).padStart(2, '0');

const toTime = (hour, minutes) => `${pad(hour)}:${pad(minutes)}`;

const fromTime = time => {
  const [hour, minutes] = (time || '00:00').split(':').map(Number);
  return { hour, minutes };
};

const dayInterval = row => {
  if (row.open_all_day) {
    return { from: '00:00', to: '23:59' };
  }
  return {
    from: toTime(row.open_hour, row.open_minutes),
    to: toTime(row.close_hour, row.close_minutes),
  };
};

// Days that share the same opening hours become one rule, in Monday-first order.
export const rulesFromWorkingHours = (workingHours = []) => {
  const rules = [];
  GTI_WEEK_DAYS.forEach(day => {
    const row = workingHours.find(item => item.day_of_week === day);
    if (!row || row.closed_all_day) {
      return;
    }
    const { from, to } = dayInterval(row);
    const rule = rules.find(item => item.from === from && item.to === to);
    if (rule) {
      rule.days.push(day);
    } else {
      rules.push({ days: [day], from, to });
    }
  });
  return rules;
};

// Every day of the week gets a row; a day no rule mentions is closed. When two
// rules claim the same day, the later one wins, as in the Ticketz screen.
export const workingHoursFromRules = (rules = []) =>
  [0, 1, 2, 3, 4, 5, 6].map(day => {
    const rule = [...rules].reverse().find(item => item.days.includes(day));
    if (!rule) {
      return {
        day_of_week: day,
        closed_all_day: true,
        open_all_day: false,
      };
    }
    const open = fromTime(rule.from);
    const close = fromTime(rule.to);
    return {
      day_of_week: day,
      closed_all_day: false,
      open_all_day: false,
      open_hour: open.hour,
      open_minutes: open.minutes,
      close_hour: close.hour,
      close_minutes: close.minutes,
    };
  });

// A rule is usable when it names at least one day and closes after it opens.
export const isValidRule = rule =>
  rule.days.length > 0 && Boolean(rule.from) && rule.to > rule.from;

export const isWhatsappInbox = inbox =>
  inbox.channel_type === 'Channel::Whatsapp';
