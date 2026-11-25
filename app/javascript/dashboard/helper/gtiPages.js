// GTI "Work" list pages (Usuários, Filas, Conexões, Respostas rápidas, Tags,
// Contatos, Integrações): the shared table look of the prototype and the small
// bits of data shaping those pages need.
import { gtiConnectionState } from 'dashboard/helper/gtiConnection';

export const GTI_TABLE_CARD =
  'overflow-x-auto border rounded-[0.625rem] border-n-weak bg-n-solid-1 shadow-sm';
export const GTI_TH =
  'px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-n-slate-11 border-b border-n-weak whitespace-nowrap';
export const GTI_TD =
  'px-3 py-2.5 text-[0.8125rem] text-n-slate-12 border-b border-n-weak align-middle';

// Queue colors when a team has none of its own, in the prototype's order.
export const GTI_QUEUE_PALETTE = [
  '#1F6FD1',
  '#0E9F6E',
  '#D47800',
  '#9333EA',
  '#C2185B',
  '#00838F',
  '#6D4C41',
  '#3949AB',
];

export const gtiTeamColor = (team, setting, index = 0) =>
  setting?.color ||
  team?.icon_color ||
  GTI_QUEUE_PALETTE[index % GTI_QUEUE_PALETTE.length];

export const gtiTruncate = (text, max = 60) => {
  const value = (text || '').replace(/\s+/g, ' ').trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

// The channel a contact talks on: the inbox of its first contact inbox.
export const gtiContactInbox = contact =>
  contact?.contact_inboxes?.[0]?.inbox || null;

export const gtiContactCompany = contact =>
  contact?.additional_attributes?.company_name || '';

// The welcome menu a queue bot sends: one numbered line per queue.
export const gtiWelcomeMenu = teams =>
  teams.map((team, index) => ({ option: index + 1, name: team.name }));

const AVAILABILITY_DOT = {
  online: 'bg-n-teal-9',
  busy: 'bg-n-amber-9',
};

export const gtiAvailabilityDot = status =>
  AVAILABILITY_DOT[status] || 'bg-n-slate-8';

// Connection card status line: state plus how the channel connects.
export const gtiConnectionLine = inbox => {
  const state = gtiConnectionState(inbox?.provider_connection);
  return {
    state: state || 'connected',
    isSession: Boolean(state),
  };
};

const CHANNEL_TILES = {
  'Channel::Whatsapp': 'bg-[#25D366]',
  'Channel::Instagram': 'bg-[#D6249F]',
  'Channel::FacebookPage': 'bg-[#1877F2]',
  'Channel::Email': 'bg-[#7C3AED]',
  'Channel::WebWidget': 'bg-[#0EA5E9]',
  'Channel::Telegram': 'bg-[#229ED9]',
};

export const gtiChannelTile = channelType =>
  CHANNEL_TILES[channelType] || 'bg-n-slate-9';
