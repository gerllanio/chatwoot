// GTI "Work": pieces of the prototype ticket card (and chat header) that are
// pure data — channel badge, initials avatar colour, card time, team colour.
import { INBOX_TYPES } from 'dashboard/helper/inbox';

const CHANNEL_BADGES = {
  [INBOX_TYPES.WHATSAPP]: { bg: 'bg-n-gti-wa', icon: 'i-ri-whatsapp-fill' },
  [INBOX_TYPES.INSTAGRAM]: { bg: 'bg-n-gti-ig', icon: 'i-ri-instagram-fill' },
  [INBOX_TYPES.FB]: { bg: 'bg-n-gti-fb', icon: 'i-ri-messenger-fill' },
  [INBOX_TYPES.EMAIL]: { bg: 'bg-n-gti-mail', icon: 'i-ri-mail-fill' },
  [INBOX_TYPES.WEB]: { bg: 'bg-n-gti-web', icon: 'i-ri-global-fill' },
  [INBOX_TYPES.TELEGRAM]: { bg: 'bg-n-gti-web', icon: 'i-ri-telegram-fill' },
};

const DEFAULT_BADGE = { bg: 'bg-n-slate-9', icon: 'i-ri-chat-1-fill' };

export const gtiChannelBadge = channelType =>
  CHANNEL_BADGES[channelType] || DEFAULT_BADGE;

// Human name of the channel for "Atribuído a X · Fila · Canal".
const CHANNEL_NAMES = {
  [INBOX_TYPES.WHATSAPP]: 'WhatsApp',
  [INBOX_TYPES.INSTAGRAM]: 'Instagram',
  [INBOX_TYPES.FB]: 'Facebook',
  [INBOX_TYPES.EMAIL]: 'E-mail',
  [INBOX_TYPES.WEB]: 'Site',
  [INBOX_TYPES.TELEGRAM]: 'Telegram',
  [INBOX_TYPES.API]: 'API',
};

export const gtiChannelName = channelType => CHANNEL_NAMES[channelType] || '';

const AVATAR_COLORS = [
  'bg-n-gti-av0',
  'bg-n-gti-av1',
  'bg-n-gti-av2',
  'bg-n-gti-av3',
  'bg-n-gti-av4',
  'bg-n-gti-av5',
  'bg-n-gti-av6',
  'bg-n-gti-av7',
  'bg-n-gti-av8',
  'bg-n-gti-av9',
];

export const gtiAvatarColor = id =>
  AVATAR_COLORS[Math.abs(Number(id) || 0) % AVATAR_COLORS.length];

export const gtiInitials = name =>
  (name || '')
    .split(/\s+/)
    .filter(part => /[\p{L}\p{N}]/u.test(part))
    .slice(0, 2)
    .map(part => part.match(/[\p{L}\p{N}]/u)[0])
    .join('')
    .toUpperCase() || '?';

const pad = value => String(value).padStart(2, '0');

// "20:59" for today, "24/11" for older days, like the prototype card.
export const gtiCardTime = (timestamp, now = new Date()) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  if (date.toDateString() === now.toDateString()) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
};

// "12 min" / "1h05" waited since a unix timestamp.
export const gtiWaitText = (timestamp, now = Date.now()) => {
  if (!timestamp) return '';
  const minutes = Math.max(0, Math.floor((now - timestamp * 1000) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h${pad(minutes % 60)}`;
};

// The queue colour: the GTI queue setting, then the team's own icon colour.
export const gtiTeamColor = team => team?.gti_color || team?.icon_color || '';

// The composer gives way to the prototype bar while the ticket waits in its
// queue (open, nobody took it) or after it was resolved.
export const isGtiReplyBlocked = chat => {
  if (!chat?.id) return false;
  if (chat.status === 'resolved') return true;
  return chat.status === 'open' && !chat.meta?.assignee;
};

// A phone typed in the "Novo atendimento" form as WhatsApp wants it: E.164,
// assuming Brazil (+55) when the number comes without a country code.
export const gtiNormalizePhone = (value, defaultCountry = '55') => {
  const raw = (value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.length <= 11) return `+${defaultCountry}${digits}`;
  return `+${digits}`;
};

// What the contact field holds: a phone number or a name to search for.
export const gtiLooksLikePhone = value => /^[\d\s()+-]{8,}$/.test(value || '');
