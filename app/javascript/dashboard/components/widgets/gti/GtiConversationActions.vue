<script setup>
// Ticketz-style buttons on top of a conversation: Accept, Return to the queue,
// Resolve, Reopen and Transfer (pick another queue and, optionally, an agent).
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { useAlert, useAssignmentError } from 'dashboard/composables';
import { useMapGetter } from 'dashboard/composables/store';
import Button from 'dashboard/components-next/button/Button.vue';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import ComboBox from 'dashboard/components-next/combobox/ComboBox.vue';
import wootConstants from 'dashboard/constants/globals';
import { GTI_CHAT_ACTIONS, gtiChatActions } from 'dashboard/helper/gtiChat';

const props = defineProps({
  chat: { type: Object, required: true },
});

const store = useStore();
const { t } = useI18n();
const currentUser = useMapGetter('getCurrentUser');
const teams = useMapGetter('teams/getTeams');

const isBusy = ref(false);
const transferDialogRef = ref(null);
const transferTeamId = ref('');
const transferAgentId = ref('');

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

const setStatus = status =>
  store.dispatch('toggleStatus', { conversationId: props.chat.id, status });

const accept = () =>
  run(async () => {
    const { avatar_url: avatarUrl, ...user } = currentUser.value || {};
    await assignTo({ ...user, thumbnail: avatarUrl });
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
  transferDialogRef.value.open();
};

const transfer = () =>
  run(async () => {
    const team = teams.value.find(item => item.id === transferTeamId.value);
    if (team && team.id !== props.chat.meta?.team?.id) {
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
    transferDialogRef.value.close();
    useAlert(t('GTI_CHAT.TRANSFERRED'));
  }, t('GTI_CHAT.ACTION_FAILED'));
</script>

<template>
  <div class="flex items-center gap-1.5">
    <Button
      v-if="has(GTI_CHAT_ACTIONS.ACCEPT)"
      :label="t('GTI_CHAT.ACCEPT')"
      icon="i-lucide-check"
      size="sm"
      color="blue"
      :disabled="isBusy"
      @click="accept"
    />
    <Button
      v-if="has(GTI_CHAT_ACTIONS.RETURN)"
      v-tooltip.bottom="t('GTI_CHAT.RETURN_HINT')"
      :label="t('GTI_CHAT.RETURN')"
      icon="i-lucide-undo-2"
      size="sm"
      color="slate"
      variant="faded"
      :disabled="isBusy"
      @click="returnToQueue"
    />
    <Button
      v-if="has(GTI_CHAT_ACTIONS.RESOLVE)"
      :label="t('GTI_CHAT.RESOLVE')"
      icon="i-lucide-check-check"
      size="sm"
      color="blue"
      :disabled="isBusy"
      @click="resolve"
    />
    <Button
      v-if="has(GTI_CHAT_ACTIONS.REOPEN)"
      :label="t('GTI_CHAT.REOPEN')"
      icon="i-lucide-rotate-ccw"
      size="sm"
      color="slate"
      variant="faded"
      :disabled="isBusy"
      @click="reopen"
    />
    <Button
      v-if="has(GTI_CHAT_ACTIONS.TRANSFER)"
      v-tooltip.bottom="t('GTI_CHAT.TRANSFER')"
      icon="i-lucide-arrow-left-right"
      size="sm"
      color="slate"
      variant="faded"
      :aria-label="t('GTI_CHAT.TRANSFER')"
      :disabled="isBusy"
      @click="openTransfer"
    />
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
      </div>
    </Dialog>
  </div>
</template>
