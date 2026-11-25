<script setup>
// "Nova tarefa" / "Editar tarefa" dialog, shared by the Tarefas page and the
// conversation header. open(task) edits, open(null, { conversationDisplayId })
// creates one already linked to that conversation.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useMapGetter } from 'dashboard/composables/store';
import GtiTasksAPI from 'dashboard/api/gtiTasks';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import { emitter } from 'shared/helpers/mitt';
import { GTI_TASKS_CHANGED } from 'dashboard/composables/useGtiOpenTasksCount';
import { toDatetimeLocal } from 'dashboard/helper/gtiTasks';

const emit = defineEmits(['saved']);

const PRIORITIES = ['high', 'medium', 'low'];

const { t } = useI18n();
const store = useStore();
const agents = useMapGetter('agents/getAgents');
const currentUser = useMapGetter('getCurrentUser');

const dialogRef = ref(null);
const taskId = ref(null);
const isBusy = ref(false);
const confirmingDelete = ref(false);
const form = ref({});

const isEditing = computed(() => Boolean(taskId.value));
const canSave = computed(() => Boolean(form.value.title?.trim()));

const open = (task = null, { conversationDisplayId = '' } = {}) => {
  if (!agents.value.length) store.dispatch('agents/get');
  taskId.value = task?.id || null;
  confirmingDelete.value = false;
  form.value = {
    title: task?.title || '',
    assigneeId: task?.assignee?.id || currentUser.value?.id || '',
    priority: task?.priority || 'medium',
    dueAt: toDatetimeLocal(task?.due_at),
    conversationDisplayId: String(
      task?.conversation_display_id || conversationDisplayId || ''
    ),
  };
  dialogRef.value.open();
};

const finish = message => {
  useAlert(message);
  emitter.emit(GTI_TASKS_CHANGED);
  emit('saved');
  dialogRef.value.close();
};

const save = async () => {
  if (!canSave.value || isBusy.value) return;
  const payload = {
    gti_task: {
      title: form.value.title.trim(),
      assignee_id: form.value.assigneeId || null,
      priority: form.value.priority,
      due_at: form.value.dueAt
        ? new Date(form.value.dueAt).toISOString()
        : null,
      conversation_display_id: form.value.conversationDisplayId.trim() || null,
    },
  };
  isBusy.value = true;
  try {
    if (isEditing.value) {
      await GtiTasksAPI.update(taskId.value, payload);
      finish(t('GTI.TASKS.UPDATED'));
    } else {
      await GtiTasksAPI.create(payload);
      finish(t('GTI.TASKS.CREATED'));
    }
  } catch {
    useAlert(t('GTI.TASKS.SAVE_ERROR'));
  } finally {
    isBusy.value = false;
  }
};

const remove = async () => {
  isBusy.value = true;
  try {
    await GtiTasksAPI.delete(taskId.value);
    finish(t('GTI.TASKS.DELETED'));
  } catch {
    useAlert(t('GTI.TASKS.SAVE_ERROR'));
  } finally {
    isBusy.value = false;
  }
};

defineExpose({ open });
</script>

<template>
  <Dialog
    ref="dialogRef"
    :title="isEditing ? t('GTI.TASKS.EDIT_TITLE') : t('GTI.TASKS.NEW')"
    @confirm="save"
  >
    <div class="flex flex-col gap-4">
      <Input
        v-model="form.title"
        :label="t('GTI.TASKS.FORM.TITLE')"
        :placeholder="t('GTI.TASKS.FORM.TITLE_PLACEHOLDER')"
      />
      <label class="flex flex-col gap-1 text-sm text-n-slate-12">
        {{ t('GTI.TASKS.FORM.ASSIGNEE') }}
        <select
          v-model="form.assigneeId"
          class="!mb-0 px-2 py-2 text-sm border rounded-lg border-n-weak bg-n-solid-1"
        >
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.available_name || agent.name }}
          </option>
        </select>
      </label>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-1 text-sm text-n-slate-12">
          {{ t('GTI.TASKS.FORM.PRIORITY') }}
          <select
            v-model="form.priority"
            class="!mb-0 px-2 py-2 text-sm border rounded-lg border-n-weak bg-n-solid-1"
          >
            <option v-for="value in PRIORITIES" :key="value" :value="value">
              {{ t(`GTI.TASKS.PRIORITY.${value.toUpperCase()}`) }}
            </option>
          </select>
        </label>
        <Input
          v-model="form.dueAt"
          type="datetime-local"
          :label="t('GTI.TASKS.FORM.DUE')"
        />
      </div>
      <Input
        v-model="form.conversationDisplayId"
        inputmode="numeric"
        :label="t('GTI.TASKS.FORM.TICKET')"
        :placeholder="t('GTI.TASKS.FORM.TICKET_PLACEHOLDER')"
      />
    </div>

    <template #footer>
      <div
        v-if="confirmingDelete"
        class="flex flex-wrap items-center justify-between w-full gap-3"
      >
        <span class="text-sm text-n-ruby-11">
          {{ t('GTI.TASKS.CONFIRM_DELETE') }}
        </span>
        <div class="flex gap-2">
          <Button
            type="button"
            variant="faded"
            color="slate"
            size="sm"
            :label="t('GTI.TASKS.CANCEL')"
            @click="confirmingDelete = false"
          />
          <Button
            type="button"
            color="ruby"
            size="sm"
            :label="t('GTI.TASKS.DELETE')"
            :is-loading="isBusy"
            @click="remove"
          />
        </div>
      </div>
      <div v-else class="flex items-center justify-between w-full gap-3">
        <Button
          v-if="isEditing"
          type="button"
          variant="ghost"
          color="ruby"
          size="sm"
          icon="i-lucide-trash-2"
          :label="t('GTI.TASKS.DELETE')"
          @click="confirmingDelete = true"
        />
        <span v-else />
        <div class="flex gap-2">
          <Button
            type="button"
            variant="faded"
            color="slate"
            size="sm"
            :label="t('GTI.TASKS.CANCEL')"
            @click="dialogRef.close()"
          />
          <Button
            type="submit"
            size="sm"
            :label="
              isEditing ? t('GTI.TASKS.SAVE') : t('GTI.TASKS.FORM.CREATE')
            "
            :is-loading="isBusy"
            :disabled="!canSave"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>
