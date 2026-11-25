// GTI "Work": remembers the inbox each user last sent a new conversation
// from, so the compose form opens with it already selected.
import { useUISettings } from 'dashboard/composables/useUISettings';

const DEFAULT_INBOX_KEY = 'gti_default_inbox_id';

export const pickDefaultInbox = (inboxes, defaultInboxId) =>
  (inboxes || []).find(inbox => inbox.id === defaultInboxId) || null;

export function useGtiDefaultInbox() {
  const { uiSettings, updateUISettings } = useUISettings();

  const defaultInboxFor = inboxes =>
    pickDefaultInbox(inboxes, uiSettings.value?.[DEFAULT_INBOX_KEY]);

  const rememberInbox = inbox => {
    if (!inbox?.id || uiSettings.value?.[DEFAULT_INBOX_KEY] === inbox.id) {
      return;
    }
    updateUISettings({ [DEFAULT_INBOX_KEY]: inbox.id });
  };

  return { defaultInboxFor, rememberInbox };
}
