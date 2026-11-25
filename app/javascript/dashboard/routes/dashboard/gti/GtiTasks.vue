<script setup>
// GTI "Work" team tasks: pending/completed lists, "mine" filter, quick create.
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useMapGetter } from 'dashboard/composables/store';
import { messageTimestamp } from 'shared/helpers/timeHelper';
import GtiTasksAPI from 'dashboard/api/gtiTasks';
import Button from 'dashboard/components-next/button/Button.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import Switch from 'dashboard/components-next/switch/Switch.vue';

const PRIORITY_CLASSES = {
  high: 'bg-n-ruby-3 text-n-ruby-11',
  medium: 'bg-n-amber-3 text-n-amber-11',
  low: 'bg-n-slate-3 text-n-slate-11',
};
const MS_PER_SECOND = 1000;

const { t } = useI18n();
const store = useStore();
const agents = useMapGetter('agents/getAgents');
const currentUser = useMapGetter('getCurrentUser');

const tasks = ref([]);
const isLoading = ref(false);
const status = ref('pending');
const onlyMine = ref(false);
const form = ref({ title: '', assigneeId: '', priority: 'medium', dueAt: '' });

const priorityOptions = computed(() =>
  ['high', 'medium', 'low'].map(value => ({
    value,
    label: t(`GTI.TASKS.PRIORITY.${value.toUpperCase()}`),
  }))
);

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

const createTask = async () => {
  if (!form.value.title.trim()) return;
  await GtiTasksAPI.create({
    gti_task: {
      title: form.value.title.trim(),
      assignee_id: form.value.assigneeId || currentUser.value.id,
      priority: form.value.priority,
      due_at: form.value.dueAt
        ? new Date(form.value.dueAt).toISOString()
        : null,
    },
  });
  form.value = { title: '', assigneeId: '', priority: 'medium', dueAt: '' };
  useAlert(t('GTI.TASKS.CREATED'));
  await loadTasks();
};

const toggleDone = async task => {
  await GtiTasksAPI.update(task.id, {
    gti_task: { completed: !task.completed_at },
  });
  await loadTasks();
};

const removeTask = async task => {
  await GtiTasksAPI.delete(task.id);
  useAlert(t('GTI.TASKS.DELETED'));
  await loadTasks();
};

const isOverdue = task =>
  !task.completed_at &&
  task.due_at &&
  task.due_at * MS_PER_SECOND < Date.now();

watch([status, onlyMine], loadTasks);

onMounted(() => {
  store.dispatch('agents/get');
  loadTasks();
});
</script>

<template>
  <div class="flex flex-col w-full h-full gap-5 p-6 overflow-y-auto">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="m-0 text-2xl font-semibold text-n-slate-12">
          {{ t('GTI.TASKS.TITLE') }}
        </h1>
        <p class="m-0 mt-1 text-sm text-n-slate-11">
          {{ t('GTI.TASKS.SUBTITLE') }}
        </p>
      </div>
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-n-slate-11">
          <Switch v-model="onlyMine" />
          {{ t('GTI.TASKS.ONLY_MINE') }}
        </label>
        <div class="flex overflow-hidden border rounded-lg border-n-weak">
          <button
            v-for="option in ['pending', 'completed']"
            :key="option"
            type="button"
            class="px-3 py-1.5 text-sm border-0"
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
      </div>
    </header>

    <form
      class="grid gap-3 p-4 border rounded-xl border-n-weak bg-n-solid-1 grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] items-end"
      @submit.prevent="createTask"
    >
      <Input
        v-model="form.title"
        :label="t('GTI.TASKS.FORM.TITLE')"
        :placeholder="t('GTI.TASKS.FORM.TITLE_PLACEHOLDER')"
      />
      <label class="flex flex-col gap-1 text-sm text-n-slate-12">
        {{ t('GTI.TASKS.FORM.ASSIGNEE') }}
        <select
          v-model="form.assigneeId"
          class="px-2 py-2 text-sm border rounded-lg border-n-weak bg-n-solid-1"
        >
          <option value="">{{ t('GTI.TASKS.FORM.ME') }}</option>
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.available_name || agent.name }}
          </option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm text-n-slate-12">
        {{ t('GTI.TASKS.FORM.PRIORITY') }}
        <select
          v-model="form.priority"
          class="px-2 py-2 text-sm border rounded-lg border-n-weak bg-n-solid-1"
        >
          <option
            v-for="option in priorityOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
      <Input
        v-model="form.dueAt"
        type="datetime-local"
        :label="t('GTI.TASKS.FORM.DUE')"
      />
      <Button
        type="submit"
        :label="t('GTI.TASKS.FORM.CREATE')"
        icon="i-lucide-plus"
        :disabled="!form.title.trim()"
      />
    </form>

    <p v-if="isLoading" class="m-0 text-sm text-n-slate-10">
      {{ t('GTI.TASKS.LOADING') }}
    </p>
    <p v-else-if="!tasks.length" class="m-0 text-sm text-n-slate-10">
      {{ t('GTI.TASKS.EMPTY') }}
    </p>
    <ul
      v-else
      class="flex flex-col p-0 m-0 overflow-hidden list-none border rounded-xl border-n-weak bg-n-solid-1"
    >
      <li
        v-for="task in tasks"
        :key="task.id"
        class="flex items-start gap-3 px-4 py-3 border-b border-n-weak last:border-b-0"
      >
        <input
          :id="`gti-task-${task.id}`"
          type="checkbox"
          class="mt-1 size-4 accent-n-brand"
          :checked="!!task.completed_at"
          @change="toggleDone(task)"
        />
        <label :for="`gti-task-${task.id}`" class="flex-1 min-w-0">
          <span
            class="block text-sm font-semibold"
            :class="
              task.completed_at
                ? 'line-through text-n-slate-10'
                : 'text-n-slate-12'
            "
          >
            {{ task.title }}
          </span>
          <span class="flex flex-wrap gap-x-3 text-xs text-n-slate-11">
            <span v-if="task.assignee">{{ task.assignee.name }}</span>
            <span
              v-if="task.due_at"
              :class="{ 'text-n-ruby-11 font-semibold': isOverdue(task) }"
            >
              {{ messageTimestamp(task.due_at, 'dd/MM HH:mm') }}
            </span>
            <router-link
              v-if="task.conversation_display_id"
              class="text-n-brand"
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
          </span>
        </label>
        <span
          class="px-2 py-0.5 text-xs font-semibold rounded"
          :class="PRIORITY_CLASSES[task.priority]"
        >
          {{ t(`GTI.TASKS.PRIORITY.${task.priority.toUpperCase()}`) }}
        </span>
        <Button
          v-tooltip.top="t('GTI.TASKS.DELETE')"
          icon="i-lucide-trash-2"
          size="xs"
          color="ruby"
          variant="ghost"
          :aria-label="t('GTI.TASKS.DELETE')"
          @click="removeTask(task)"
        />
      </li>
    </ul>
  </div>
</template>
