import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import GtiNoticesAPI from 'dashboard/api/gtiNotices';

// GTI "Work": sends the account's "ticket accepted" / "transfer" text to the
// customer once the agent's action itself succeeded, so a failure here only warns.
export const useGtiNotice = () => {
  const { t } = useI18n();
  return async (conversationId, kind) => {
    try {
      await GtiNoticesAPI.send(conversationId, kind);
    } catch (error) {
      useAlert(t('GTI_SETTINGS.NOTICE_FAILED'));
    }
  };
};
