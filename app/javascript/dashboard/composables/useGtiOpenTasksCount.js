// GTI "Work": number of open team tasks, for the "Tarefas" menu badge.
// Refreshes on a timer and whenever a task screen reports a change.
import { onMounted, onUnmounted, ref } from 'vue';
import GtiTasksAPI from 'dashboard/api/gtiTasks';
import { emitter } from 'shared/helpers/mitt';

export const GTI_TASKS_CHANGED = 'gti:tasks-changed';
const REFRESH_MS = 60000;

export function useGtiOpenTasksCount() {
  const count = ref(0);
  let timer = null;

  const refresh = async () => {
    try {
      const { data } = await GtiTasksAPI.list({ status: 'pending' });
      count.value = data.payload.length;
    } catch {
      // A missed refresh keeps the last count; the next tick tries again.
    }
  };

  onMounted(() => {
    refresh();
    timer = setInterval(refresh, REFRESH_MS);
    emitter.on(GTI_TASKS_CHANGED, refresh);
  });

  onUnmounted(() => {
    clearInterval(timer);
    emitter.off(GTI_TASKS_CHANGED, refresh);
  });

  return { count, refresh };
}
