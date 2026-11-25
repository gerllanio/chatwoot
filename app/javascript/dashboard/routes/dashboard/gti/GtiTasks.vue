<script setup>
// GTI "Work" Tarefas: the prototype's task list. Checkbox to finish, title
// opens the edit dialog, meta line with assignee, due date and linked ticket,
// and a colored priority chip.
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import GtiTasksAPI from 'dashboard/api/gtiTasks';
import Button from 'dashboard/components-next/button/Button.vue';
import Switch from 'dashboard/components-next/switch/Switch.vue';
import GtiTaskModal from 'dashboard/components/widgets/gti/GtiTaskModal.vue';
import { emitter } from 'shared/helpers/mitt';
import { GTI_TASKS_CHANGED } from 'dashboard/composables/useGtiOpenTasksCount';
import {
  describeTaskDue,
  isTaskOverdue,
  GTI_TASK_PRIORITY_CLASSES,
} from 'dashboard/helper/gtiTasks';

const STATUSES = ['pending', 'completed'];

const { t } = useI18n();
const store = useStore();

const tasks = ref([]);
const isLoading = ref(false);
const status = ref('pending');
const onlyMine = ref(false);
const modalRef = ref(null);

const loadTasks = async () => {
  isLoading.value = true;
  try {
    const { data } = await GtiTasksAPI.list({
      status: status.value,
      assignee: onlyMine.value ? 'me' : undefined,
    });
    tasks.value = data.payload;
  } finally {
    isLoading.value = false;
  }
};

const toggleDone = async task => {
  const done = !task.completed_at;
  await GtiTasksAPI.update(task.id, { gti_task: { completed: done } });
  useAlert(done ? t('GTI.TASKS.DONE') : t('GTI.TASKS.REOPENED'));
  emitter.emit(GTI_TASKS_CHANGED);
  await loadTasks();
};

const dueLabel = task => {
  const { day, time, date } = describeTaskDue(task.due_at);
  if (day === 'YESTERDAY') return t('GTI.TASKS.DUE.YESTERDAY');
  if (day) return t(`GTI.TASKS.DUE.${day}`, { time });
  return `${date} ${time}`;
};

watch([status, onlyMine], loadTasks);

onMounted(() => {
  store.dispatch('agents/get');
  loadTasks();
});
</script>

<template>
  <div class="flex flex-col w-full h-full gap-4 p-6 overflow-y-auto">
    <header>
      <h1 class="m-0 text-xl font-semibold text-n-slate-12">
        {{ t('GTI.TASKS.TITLE') }}
      </h1>
      <p class="m-0 mt-1 text-sm text-n-slate-11">
        {{ t('GTI.TASKS.SUBTITLE') }}
      </p>
    </header>

    <div class="flex flex-wrap items-center gap-3">
      <Button
        :label="t('GTI.TASKS.NEW')"
        icon="i-lucide-plus"
        size="sm"
        @click="modalRef.open()"
      />
      <div class="flex overflow-hidden border rounded-lg border-n-weak">
        <button
          v-for="option in STATUSES"
          :key="option"
          type="button"
          class="px-3 py-1 text-sm border-0"
          :class="
            status === option
              ? 'bg-n-brand text-white'
              : 'bg-n-solid-1 text-n-slate-11'
          "
          @click="status = option"
        >
          {{ t(`GTI.TASKS.STATUS.${option.toUpperCase()}`) }}
        </button>
      </div>
      <label class="flex items-center gap-2 text-sm text-n-slate-11">
        <Switch v-model="onlyMine" />
        {{ t('GTI.TASKS.ONLY_MINE') }}
      </label>
    </div>

    <div
      class="overflow-hidden border shadow-sm rounded-xl border-n-weak bg-n-solid-1"
    >
      <p v-if="isLoading" class="px-4 py-6 m-0 text-sm text-n-slate-10">
        {{ t('GTI.TASKS.LOADING') }}
      </p>
      <p
        v-else-if="!tasks.length"
        class="px-4 py-6 m-0 text-sm text-n-slate-10"
      >
        {{ t('GTI.TASKS.EMPTY') }}
      </p>
      <template v-else>
        <div
          v-for="task in tasks"
          :key="task.id"
          class="flex items-start gap-2.5 px-3.5 py-3 border-b border-n-weak last:border-b-0"
        >
          <input
            type="checkbox"
            class="mt-0.5 size-4 accent-n-brand"
            :checked="!!task.completed_at"
            :aria-label="task.title"
            @change="toggleDone(task)"
          />
          <div class="flex-1 min-w-0">
            <button
              type="button"
              class="block p-0 font-semibold text-start bg-transparent border-0"
              :class="
                task.completed_at
                  ? 'line-through text-n-slate-10'
                  : 'text-n-slate-12'
              "
              @click="modalRef.open(task)"
            >
              {{ task.title }}
            </button>
            <small class="text-xs text-n-slate-10">
              <span v-if="task.assignee">
                {{ t('GTI.TASKS.META_ASSIGNEE', { name: task.assignee.name }) }}
              </span>
              <template v-if="task.due_at">
                <span v-if="task.assignee">{{ t('GTI.TASKS.SEPARATOR') }}</span>
                <span
                  :class="{
                    'text-n-ruby-11 font-semibold': isTaskOverdue(task),
                  }"
                >
                  {{ t('GTI.TASKS.META_DUE', { due: dueLabel(task) }) }}
                </span>
              </template>
              <template v-if="task.conversation_display_id">
                <span>{{ t('GTI.TASKS.SEPARATOR') }}</span>
                <router-link
                  class="text-n-gti-blue"
                  :to="{
                    name: 'inbox_conversation',
                    params: { conversation_id: task.conversation_display_id },
                  }"
                >
                  {{
                    t('GTI.TASKS.CONVERSATION', {
                      id: task.conversation_display_id,
                    })
                  }}
                </router-link>
              </template>
            </small>
          </div>
          <span
            class="px-1.5 py-px text-[0.656rem] font-bold leading-4 text-white rounded"
            :class="GTI_TASK_PRIORITY_CLASSES[task.priority]"
          >
            {{ t(`GTI.TASKS.PRIORITY.${task.priority.toUpperCase()}`) }}
          </span>
        </div>
      </template>
    </div>

    <GtiTaskModal ref="modalRef" @saved="loadTasks" />
  </div>
</template>
