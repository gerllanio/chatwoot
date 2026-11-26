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

// The connection's queue menu, built like Gti::QueueMenuService#menu_text:
// the greeting, a blank line, then one "1️⃣ - Comercial" line per queue.
export const GTI_MENU_KEYCAPS = [
  '1️⃣',
  '2️⃣',
  '3️⃣',
  '4️⃣',
  '5️⃣',
  '6️⃣',
  '7️⃣',
  '8️⃣',
  '9️⃣',
  '🔟',
];

const upcaseFirst = text => text.charAt(0).toUpperCase() + text.slice(1);

export const gtiQueueMenuText = (greeting, teams, { name, time }) => {
  const filledGreeting = (greeting || '')
    .replaceAll('{{firstname}}', name.split(' ')[0])
    .replaceAll('{{name}}', name)
    .replaceAll('{{hora}}', time);
  const options = teams
    .map(
      (team, index) =>
        `${GTI_MENU_KEYCAPS[index] || index + 1} - ${upcaseFirst(team.name)}`
    )
    .join('\n');
  return [filledGreeting.trim() ? filledGreeting : '', options]
    .filter(Boolean)
    .join('\n\n');
};

// The queue checklist of a connection: the chosen queues first, in menu order,
// then the others alphabetically.
export const gtiMenuTeamOrder = (teams, teamIds) => {
  const byId = Object.fromEntries(teams.map(team => [team.id, team]));
  const chosen = teamIds.map(id => byId[id]).filter(Boolean);
  const others = teams
    .filter(team => !teamIds.includes(team.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...chosen, ...others];
};

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
