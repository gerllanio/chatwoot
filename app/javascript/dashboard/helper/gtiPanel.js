// Data shaping for the GTI "Work" Painel: turns the report and live-count
// payloads Chatwoot already serves into what the panel cards draw.

import { INBOX_TYPES } from 'dashboard/helper/inbox';

const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const PERCENT = 100;
const DAYS_PER_WEEK = 7;
const HOURS_PER_DAY = 24;
const GOOD_CSAT_RATINGS = [4, 5];

export const PANEL_PERIODS = {
  TODAY: 'today',
  LAST_7_DAYS: 'last7',
  LAST_30_DAYS: 'last30',
  THIS_MONTH: 'month',
};

const startOfDay = date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const toSeconds = date => Math.floor(date.getTime() / 1000);

// Report ranges in unix seconds, ending now; groupBy is what the volume chart
// is bucketed by (hours for today, days otherwise).
export const periodRange = (period, now = new Date()) => {
  const until = toSeconds(now);
  const today = startOfDay(now);
  if (period === PANEL_PERIODS.TODAY) {
    return { since: toSeconds(today), until, groupBy: 'hour' };
  }
  if (period === PANEL_PERIODS.THIS_MONTH) {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return { since: toSeconds(firstDay), until, groupBy: 'day' };
  }
  const days = period === PANEL_PERIODS.LAST_30_DAYS ? 30 : 7;
  return {
    since: toSeconds(today) - (days - 1) * SECONDS_PER_DAY,
    until,
    groupBy: 'day',
  };
};

// Percent change against the previous period, or null when there is nothing
// to compare with.
export const deltaPercent = (current, previous) => {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (!before) {
    return null;
  }
  return Math.round(((now - before) / before) * PERCENT);
};

export const isImprovement = (delta, higherIsBetter) =>
  delta >= 0 === higherIsBetter;

export const formatDuration = seconds => {
  if (seconds === null || seconds === undefined) {
    return '—';
  }
  if (Number(seconds) < SECONDS_PER_MINUTE) {
    return `${Math.round(Number(seconds))}s`;
  }
  const minutes = Math.round(Number(seconds) / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = String(minutes % MINUTES_PER_HOUR).padStart(2, '0');
  return `${hours}h${rest}`;
};

// Share of 4 and 5 star answers, the way the CSAT report counts satisfaction.
export const csatScore = metrics => {
  const total = Number(metrics?.total_count) || 0;
  if (!total) {
    return null;
  }
  const ratings = metrics.ratings_count || {};
  const good = GOOD_CSAT_RATINGS.reduce(
    (sum, rating) => sum + (Number(ratings[rating]) || 0),
    0
  );
  return Math.round((good / total) * PERCENT);
};

export const agentStatusCounts = agents => ({
  online: agents.filter(agent => agent.availability_status === 'online').length,
  busy: agents.filter(agent => agent.availability_status === 'busy').length,
  offline: agents.filter(
    agent => !['online', 'busy'].includes(agent.availability_status)
  ).length,
});

// Segments for an SVG donut drawn on a circle whose circumference is 100, so
// dash lengths are plain percentages.
export const donutSegments = parts => {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (!total) {
    return [];
  }
  let offset = 0;
  return parts
    .filter(part => part.value > 0)
    .map(part => {
      const length = (part.value / total) * PERCENT;
      const segment = { ...part, length, offset };
      offset += length;
      return segment;
    });
};

const CHANNEL_KEYS = {
  [INBOX_TYPES.WHATSAPP]: 'WHATSAPP',
  [INBOX_TYPES.INSTAGRAM]: 'INSTAGRAM',
  [INBOX_TYPES.FB]: 'FACEBOOK',
  [INBOX_TYPES.EMAIL]: 'EMAIL',
  [INBOX_TYPES.WEB]: 'WEBSITE',
};

export const channelKey = channelType => CHANNEL_KEYS[channelType] || 'OTHER';

export const channelTotals = (inboxRows, inboxes) => {
  const totals = {};
  inboxRows.forEach(row => {
    const inbox = inboxes.find(item => item.id === row.id);
    if (!inbox) {
      return;
    }
    const key = channelKey(inbox.channel_type);
    totals[key] = (totals[key] || 0) + (Number(row.conversations_count) || 0);
  });
  return Object.entries(totals)
    .map(([key, value]) => ({ key, value }))
    .filter(entry => entry.value > 0)
    .sort((first, second) => second.value - first.value);
};

export const namedTotals = (rows, records) =>
  rows
    .map(row => ({
      id: row.id,
      name: records.find(record => record.id === row.id)?.name || '',
      value: Number(row.conversations_count) || 0,
    }))
    .filter(entry => entry.name && entry.value > 0)
    .sort((first, second) => second.value - first.value);

// 7 x 24 grid (Sunday first) of conversations per local weekday and hour.
export const heatmapGrid = timeseries => {
  const grid = Array.from({ length: DAYS_PER_WEEK }, () =>
    new Array(HOURS_PER_DAY).fill(0)
  );
  timeseries.forEach(point => {
    const date = new Date(point.timestamp * 1000);
    grid[date.getDay()][date.getHours()] += Number(point.value) || 0;
  });
  return grid;
};

export const sortRows = (rows, key, direction) =>
  [...rows].sort((first, second) => {
    const a = first[key];
    const b = second[key];
    if (typeof a === 'string' || typeof b === 'string') {
      return String(a || '').localeCompare(String(b || '')) * direction;
    }
    return ((a ?? -1) - (b ?? -1)) * direction;
  });

// Agents table rows: period numbers from the agent summary, open count and
// availability from the live agent metric.
export const agentRows = (summaryRows, liveRows, agents) =>
  agents.map(agent => {
    const summary = summaryRows.find(row => row.id === agent.id) || {};
    const live = liveRows.find(row => row.id === agent.id);
    return {
      id: agent.id,
      name: agent.name,
      thumbnail: agent.thumbnail,
      status: agent.availability_status || 'offline',
      total: Number(summary.conversations_count) || 0,
      open: Number(live?.metric?.open) || 0,
      resolved: Number(summary.resolved_conversations_count) || 0,
      firstResponse: summary.avg_first_response_time ?? null,
      resolution: summary.avg_resolution_time ?? null,
    };
  });

// Polyline points for a series drawn in a width x height box.
export const linePoints = (values, width, height, max) => {
  if (!values.length) {
    return '';
  }
  const top = max || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((value, index) => {
      const x = Math.round(index * step * 10) / 10;
      const y = Math.round((height - (value / top) * height) * 10) / 10;
      return `${x},${y}`;
    })
    .join(' ');
};

// Fixed categorical order for the panel's series; the class names are spelled
// out so Tailwind keeps them.
export const SERIES_COLORS = [
  { stroke: 'stroke-n-teal-9', bg: 'bg-n-teal-9' },
  { stroke: 'stroke-n-iris-9', bg: 'bg-n-iris-9' },
  { stroke: 'stroke-n-amber-9', bg: 'bg-n-amber-9' },
  { stroke: 'stroke-n-ruby-9', bg: 'bg-n-ruby-9' },
  { stroke: 'stroke-n-violet-9', bg: 'bg-n-violet-9' },
  { stroke: 'stroke-n-slate-9', bg: 'bg-n-slate-9' },
];

export const STATUS_COLORS = {
  online: { stroke: 'stroke-n-teal-9', bg: 'bg-n-teal-9' },
  busy: { stroke: 'stroke-n-amber-9', bg: 'bg-n-amber-9' },
  offline: { stroke: 'stroke-n-slate-8', bg: 'bg-n-slate-8' },
};

export const seriesColor = index =>
  SERIES_COLORS[Math.min(index, SERIES_COLORS.length - 1)];
