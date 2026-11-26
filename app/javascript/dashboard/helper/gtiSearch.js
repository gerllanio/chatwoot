// GTI "Work" Ctrl+K search: the fixed order of the result sections and the
// pure matching / grouping rules behind them. Contacts come first because
// they answer fastest; the other sections fill in as their data arrives.
export const GTI_SEARCH_SECTIONS = [
  'contacts',
  'whatsapp',
  'instagram',
  'tasks',
  'canned',
  'labels',
];

// Sections answered by the server need a couple of characters to be useful.
export const GTI_SEARCH_MIN_REMOTE = 2;

const normalize = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Accent- and case-insensitive "contains" over any of the given fields.
export const gtiSearchMatches = (term, ...fields) => {
  const wanted = normalize(term).trim();
  if (!wanted) return false;
  return fields.some(field => normalize(field).includes(wanted));
};

// "whatsapp", "instagram" or null for a conversation's inbox. Instagram comes
// either as its own channel or as a Facebook page linked to an Instagram account.
export const gtiConversationChannel = inbox => {
  const type = inbox?.channel_type;
  if (type === 'Channel::Whatsapp') return 'whatsapp';
  if (type === 'Channel::Instagram') return 'instagram';
  if (type === 'Channel::FacebookPage' && inbox?.instagram_id) {
    return 'instagram';
  }
  return null;
};

// Splits search results into the WhatsApp and Instagram sections. The search
// payload's inbox lacks instagram_id, so the store's inbox (when known) wins.
export const gtiSplitConversations = (conversations, inboxesById = {}) => {
  const groups = { whatsapp: [], instagram: [] };
  (conversations || []).forEach(conversation => {
    const inbox = inboxesById[conversation.inbox?.id] || conversation.inbox;
    const channel = gtiConversationChannel(inbox);
    if (channel) groups[channel].push(conversation);
  });
  return groups;
};

// The rows in screen order, for the arrow keys: [{ section, item }].
export const gtiSearchRows = results =>
  GTI_SEARCH_SECTIONS.flatMap(section =>
    (results[section] || []).map(item => ({ section, item }))
  );
