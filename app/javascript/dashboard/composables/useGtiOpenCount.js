// GTI "Work": the red pill on "Atendimentos" counts every open conversation of
// the account — Atendendo + Aguardando — read from the same /conversations/meta
// count the "Ver todos" tabs show, so the two always add up.
import { onMounted, onUnmounted, ref } from 'vue';
import ConversationApi from 'dashboard/api/inbox/conversation';
import wootConstants from 'dashboard/constants/globals';

const REFRESH_MS = 15000;

export function useGtiOpenCount() {
  const count = ref(0);
  let timer = null;

  const refresh = async () => {
    try {
      const { data } = await ConversationApi.meta({
        status: wootConstants.STATUS_TYPE.OPEN,
        assigneeType: wootConstants.ASSIGNEE_TYPE.ALL,
      });
      count.value = data.meta.all_count || 0;
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
