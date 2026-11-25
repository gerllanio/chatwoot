<script setup>
// Ticketz-style buttons on top of a conversation: Accept, Return to the queue,
// Resolve, Reopen and Transfer (pick another queue and, optionally, an agent).
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { useAlert, useAssignmentError } from 'dashboard/composables';
import { useMapGetter } from 'dashboard/composables/store';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import GtiTaskModal from 'dashboard/components/widgets/gti/GtiTaskModal.vue';
import ComboBox from 'dashboard/components-next/combobox/ComboBox.vue';
import wootConstants from 'dashboard/constants/globals';
import { GTI_CHAT_ACTIONS, gtiChatActions } from 'dashboard/helper/gtiChat';
import { useGtiNotice } from 'dashboard/composables/useGtiNotice';

const props = defineProps({
  chat: { type: Object, required: true },
});

const store = useStore();
const { t } = useI18n();

// Prototype buttons: .btn (white, line border), .btn.ok (--ok green) and .ib2 (34px icon).
const GTI_BTN =
  'inline-flex items-center gap-1.5 !px-3 !py-1.5 text-sm font-medium !border !border-solid !rounded-md disabled:opacity-50 bg-white border-n-gti-line text-n-slate-12 hover:bg-n-gti-panel2';
const GTI_BTN_OK =
  'inline-flex items-center gap-1.5 !px-3 !py-1.5 text-sm font-medium !border !border-solid !rounded-md disabled:opacity-50 bg-n-gti-ok border-n-gti-ok text-white hover:brightness-95';
const GTI_ICON_BTN =
  'inline-flex items-center justify-center !p-0 !border !border-solid !rounded-md size-[2.125rem] bg-white border-n-gti-line text-n-gti-muted hover:text-n-gti-green disabled:opacity-50';
const currentUser = useMapGetter('getCurrentUser');
const teams = useMapGetter('teams/getTeams');

const isBusy = ref(false);
const transferDialogRef = ref(null);
const taskModalRef = ref(null);
const transferTeamId = ref('');
const transferAgentId = ref('');
const transferNote = ref('');

const actions = computed(() => gtiChatActions(props.chat));
const has = action => actions.value.includes(action);

const teamOptions = computed(() =>
  teams.value.map(team => ({ value: team.id, label: team.name }))
);

const agentOptions = computed(() =>
  store.getters['inboxAssignableAgents/getAssignableAgents'](
    props.chat.inbox_id
  )
    .filter(agent => !agent.assignee_type || agent.assignee_type === 'User')
    .map(agent => ({ value: agent.id, label: agent.name }))
);

const run = async (work, failureMessage) => {
  isBusy.value = true;
  try {
    await work();
  } catch (error) {
    useAssignmentError(error, failureMessage);
  } finally {
    isBusy.value = false;
  }
};

const assignTo = assignee =>
  store.dispatch('assignAgent', {
    conversationId: props.chat.id,
    assignee,
    assigneeType: assignee ? 'User' : null,
  });

const sendGtiNotice = useGtiNotice();
const sendNotice = kind => sendGtiNotice(props.chat.id, kind);

const setStatus = status =>
  store.dispatch('toggleStatus', { conversationId: props.chat.id, status });

const accept = () =>
  run(async () => {
    const { avatar_url: avatarUrl, ...user } = currentUser.value || {};
    await assignTo({ ...user, thumbnail: avatarUrl });
    await sendNotice('accepted');
  }, t('GTI_CHAT.ACCEPT_FAILED'));

const returnToQueue = () =>
  run(async () => {
    await assignTo(null);
    useAlert(t('GTI_CHAT.RETURNED'));
  }, t('GTI_CHAT.ACTION_FAILED'));

const resolve = () =>
  run(async () => {
    await setStatus(wootConstants.STATUS_TYPE.RESOLVED);
    useAlert(t('GTI_CHAT.RESOLVED'));
  }, t('GTI_CHAT.ACTION_FAILED'));

const reopen = () =>
  run(
    () => setStatus(wootConstants.STATUS_TYPE.OPEN),
    t('GTI_CHAT.ACTION_FAILED')
  );

const openTransfer = () => {
  transferTeamId.value = props.chat.meta?.team?.id || '';
  transferAgentId.value = '';
  transferNote.value = '';
  transferDialogRef.value.open();
};

const transfer = () =>
  run(async () => {
    const team = teams.value.find(item => item.id === transferTeamId.value);
    const teamChanged = Boolean(team) && team.id !== props.chat.meta?.team?.id;
    if (teamChanged) {
      await store.dispatch('assignTeam', {
        conversationId: props.chat.id,
        team,
      });
    }
    const agent = store.getters['inboxAssignableAgents/getAssignableAgents'](
      props.chat.inbox_id
    ).find(item => item.id === transferAgentId.value);
    if (agent) {
      await assignTo(agent);
    }
    if (teamChanged || agent) {
      await sendNotice('transfer');
    }
    // Message for the colleague, as a private note (the customer never sees it).
    const note = transferNote.value.trim();
    if (note) {
      await store.dispatch('createPendingMessageAndSend', {
        conversationId: props.chat.id,
        message: note,
        private: true,
      });
    }
    transferDialogRef.value.close();
    useAlert(t('GTI_CHAT.TRANSFERRED'));
  }, t('GTI_CHAT.ACTION_FAILED'));
</script>

<template>
  <div class="flex items-center gap-1.5">
    <button
      v-if="has(GTI_CHAT_ACTIONS.ACCEPT)"
      type="button"
      :class="GTI_BTN_OK"
      :disabled="isBusy"
      @click="accept"
    >
      <span class="i-material-symbols-check size-4" />
      {{ t('GTI_CHAT.ACCEPT') }}
    </button>
    <button
      v-if="has(GTI_CHAT_ACTIONS.RETURN)"
      v-tooltip.bottom="t('GTI_CHAT.RETURN_HINT')"
      type="button"
      :class="GTI_BTN"
      :disabled="isBusy"
      @click="returnToQueue"
    >
      <span class="i-material-symbols-undo size-4" />
      {{ t('GTI_CHAT.RETURN') }}
    </button>
    <button
      v-if="has(GTI_CHAT_ACTIONS.RESOLVE)"
      type="button"
      :class="GTI_BTN_OK"
      :disabled="isBusy"
      @click="resolve"
    >
      <span class="i-material-symbols-check size-4" />
      {{ t('GTI_CHAT.RESOLVE') }}
    </button>
    <button
      v-if="has(GTI_CHAT_ACTIONS.REOPEN)"
      type="button"
      :class="GTI_BTN"
      :disabled="isBusy"
      @click="reopen"
    >
      <span class="i-material-symbols-undo size-4" />
      {{ t('GTI_CHAT.REOPEN') }}
    </button>
    <button
      v-if="has(GTI_CHAT_ACTIONS.TRANSFER)"
      v-tooltip.bottom="t('GTI_CHAT.TRANSFER')"
      type="button"
      :class="GTI_ICON_BTN"
      :aria-label="t('GTI_CHAT.TRANSFER')"
      :disabled="isBusy"
      @click="openTransfer"
    >
      <span class="i-material-symbols-swap-horiz size-[1.125rem]" />
    </button>
    <button
      v-tooltip.bottom="t('GTI.TASKS.NEW_FOR_CONVERSATION')"
      type="button"
      :class="GTI_ICON_BTN"
      :aria-label="t('GTI.TASKS.NEW_FOR_CONVERSATION')"
      @click="taskModalRef.open(null, { conversationDisplayId: chat.id })"
    >
      <span class="i-material-symbols-assignment-turned-in size-[1.125rem]" />
    </button>
    <GtiTaskModal ref="taskModalRef" />
    <Dialog
      ref="transferDialogRef"
      :title="t('GTI_CHAT.TRANSFER_TITLE')"
      :description="t('GTI_CHAT.TRANSFER_DESCRIPTION')"
      :confirm-button-label="t('GTI_CHAT.TRANSFER')"
      :is-loading="isBusy"
      @confirm="transfer"
    >
      <div class="flex flex-col gap-3">
        <label class="flex flex-col gap-1 text-sm text-n-slate-12">
          {{ t('GTI_CHAT.QUEUE') }}
          <ComboBox
            v-model="transferTeamId"
            :options="teamOptions"
            :placeholder="t('GTI_CHAT.QUEUE_PLACEHOLDER')"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm text-n-slate-12">
          {{ t('GTI_CHAT.AGENT') }}
          <ComboBox
            v-model="transferAgentId"
            :options="agentOptions"
            :placeholder="t('GTI_CHAT.AGENT_PLACEHOLDER')"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm text-n-slate-12">
          {{ t('GTI_TICKETS.TRANSFER.NOTE') }}
          <textarea
            v-model="transferNote"
            rows="2"
            class="!mb-0 text-sm"
            :placeholder="t('GTI_TICKETS.TRANSFER.NOTE_PLACEHOLDER')"
          />
        </label>
      </div>
    </Dialog>
  </div>
</template>
