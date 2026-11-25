// GTI "Work": how many conversations are waiting in the queue (open, nobody
// took them yet), for the red pill on "Atendimentos" as in the prototype.
import { onMounted, onUnmounted, ref } from 'vue';
import ConversationApi from 'dashboard/api/inbox/conversation';
import wootConstants from 'dashboard/constants/globals';

const REFRESH_MS = 30000;

export function useGtiWaitingCount() {
  const count = ref(0);
  let timer = null;

  const refresh = async () => {
    try {
      const { data } = await ConversationApi.meta({
        status: wootConstants.STATUS_TYPE.OPEN,
      });
      count.value = data.meta.unassigned_count || 0;
    } catch {
      // A missed refresh keeps the last count; the next tick tries again.
    }
  };

  onMounted(() => {
    refresh();
    timer = setInterval(refresh, REFRESH_MS);
  });

  onUnmounted(() => clearInterval(timer));

  return { count, refresh };
}
