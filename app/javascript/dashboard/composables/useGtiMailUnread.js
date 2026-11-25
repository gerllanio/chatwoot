// GTI "Work" e-mail: total unread messages in the INBOX of every e-mail box the user
// can open, for a badge (the sidebar's E-mail entry). The server caches each count
// for a minute, so polling here stays cheap.
import { computed, onMounted, onUnmounted, ref } from 'vue';
import GtiMailAPI from 'dashboard/api/gtiMail';
import { totalUnread } from 'dashboard/helper/gtiMail';

const REFRESH_MS = 120000;

export function useGtiMailUnread() {
  const mailboxes = ref([]);
  let timer = null;

  const refresh = async () => {
    try {
      const { data } = await GtiMailAPI.mailboxes({ withUnread: true });
      mailboxes.value = data.payload;
    } catch {
      mailboxes.value = [];
    }
  };

  onMounted(() => {
    refresh();
    timer = setInterval(refresh, REFRESH_MS);
  });

  onUnmounted(() => clearInterval(timer));

  return {
    unreadCount: computed(() => totalUnread(mailboxes.value)),
    refresh,
  };
}
