import { dateTimeFormat } from 'shared/helpers/localizedDate';

// GTI "Work" e-mail screen: small pure helpers (folder order and icons, reply and
// forward drafts, list dates) kept out of the components so they can be tested.

const SPECIAL_ORDER = ['inbox', 'drafts', 'sent', 'archive', 'junk', 'trash'];

export const FOLDER_ICONS = {
  inbox: 'i-lucide-inbox',
  sent: 'i-lucide-send',
  drafts: 'i-lucide-file-pen',
  trash: 'i-lucide-trash-2',
  junk: 'i-lucide-shield-alert',
  archive: 'i-lucide-archive',
};

export const folderKind = folder => {
  if (folder.path?.toUpperCase() === 'INBOX') return 'inbox';
  return folder.special_use || null;
};

export const folderIcon = folder =>
  FOLDER_ICONS[folderKind(folder)] || 'i-lucide-folder';

export const sortFolders = folders =>
  [...folders].sort((a, b) => {
    const rankA = SPECIAL_ORDER.indexOf(folderKind(a));
    const rankB = SPECIAL_ORDER.indexOf(folderKind(b));
    const weightA = rankA === -1 ? SPECIAL_ORDER.length : rankA;
    const weightB = rankB === -1 ? SPECIAL_ORDER.length : rankB;
    if (weightA !== weightB) return weightA - weightB;
    return a.name.localeCompare(b.name);
  });

const prefixed = (prefix, subject = '') =>
  subject.toLowerCase().startsWith(prefix.toLowerCase())
    ? subject
    : `${prefix} ${subject}`.trim();

const quote = message => {
  const body = message.text || '';
  return body
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');
};

export const replyDraft = (message, header) => ({
  to: message.from_email,
  subject: prefixed('Re:', message.subject),
  body: `\n\n${header}\n${quote(message)}`,
  inReplyTo: message.message_id,
  references: message.references,
});

export const forwardDraft = (message, header) => ({
  to: '',
  subject: prefixed('Fwd:', message.subject),
  body: `\n\n${header}\n${message.text || ''}`,
});

const MS_PER_DAY = 86400000;

const timeFormat = dateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});
const dayFormat = dateTimeFormat(undefined, {
  day: '2-digit',
  month: '2-digit',
});

export const listDate = (iso, now = new Date()) => {
  if (!iso) return '';
  const date = new Date(iso);
  const sameDay = now - date < MS_PER_DAY && now.getDate() === date.getDate();
  return sameDay ? timeFormat.format(date) : dayFormat.format(date);
};

export const fullDate = iso =>
  iso
    ? dateTimeFormat(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))
    : '';

export const totalUnread = mailboxes =>
  mailboxes.reduce((sum, mailbox) => sum + (mailbox.unread || 0), 0);
