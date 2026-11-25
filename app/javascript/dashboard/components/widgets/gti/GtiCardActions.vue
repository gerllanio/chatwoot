<script setup>
// Ticketz-style quick actions on a conversation in progress (see
// isGtiActiveConversation): finish it, peek at it without taking it, or accept it.
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { useAlert, useAssignmentError } from 'dashboard/composables';
import { useMapGetter } from 'dashboard/composables/store';
import { messageTimestamp } from 'shared/helpers/timeHelper';
import MessageApi from 'dashboard/api/inbox/message';
import Button from 'dashboard/components-next/button/Button.vue';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import wootConstants from 'dashboard/constants/globals';
import { useGtiNotice } from 'dashboard/composables/useGtiNotice';

const props = defineProps({
  chat: { type: Object, required: true },
});

const MESSAGE_TYPE = { INCOMING: 0, OUTGOING: 1, ACTIVITY: 2 };

const store = useStore();
const { t } = useI18n();
const currentUser = useMapGetter('getCurrentUser');
const sendGtiNotice = useGtiNotice();

const peekDialogRef = ref(null);
const peekMessages = ref([]);
const isPeekLoading = ref(false);
const isBusy = ref(false);

const contactName = computed(() => props.chat.meta?.sender?.name || '');
// Accept is offered unless the conversation is already mine.
const canAccept = computed(
  () => props.chat.meta?.assignee?.id !== currentUser.value?.id
);

const finishConversation = async () => {
  isBusy.value = true;
  try {
    await store.dispatch('toggleStatus', {
      conversationId: props.chat.id,
      status: wootConstants.STATUS_TYPE.RESOLVED,
    });
    useAlert(t('GTI.TICKETS.FINISHED', { name: contactName.value }));
  } catch (error) {
    useAssignmentError(error, t('GTI.TICKETS.FINISH_FAILED'));
  } finally {
    isBusy.value = false;
  }
};

const acceptConversation = async () => {
  isBusy.value = true;
  const { avatar_url: avatarUrl, ...user } = currentUser.value || {};
  try {
    await store.dispatch('assignAgent', {
      conversationId: props.chat.id,
      assignee: { ...user, thumbnail: avatarUrl },
      assigneeType: 'User',
    });
    await sendGtiNotice(props.chat.id, 'accepted');
  } catch (error) {
    useAssignmentError(error, t('GTI.TICKETS.ACCEPT_FAILED'));
  } finally {
    isBusy.value = false;
  }
};

const peekConversation = async () => {
  peekDialogRef.value.open();
  isPeekLoading.value = true;
  try {
    const { data } = await MessageApi.getPreviousMessages({
      conversationId: props.chat.id,
    });
    peekMessages.value = data.payload || [];
  } finally {
    isPeekLoading.value = false;
  }
};

const acceptFromPeek = async () => {
  peekDialogRef.value.close();
  await acceptConversation();
};

const messageText = message => {
  if (message.content) {
    return message.content;
  }
  if (message.attachments?.length) {
    return t('GTI.TICKETS.ATTACHMENT');
  }
  return '';
};

const bubbleClass = message => {
  if (message.message_type === MESSAGE_TYPE.ACTIVITY) {
    return 'self-center text-xs text-n-slate-11 bg-n-slate-3';
  }
  if (message.private) {
    return 'self-center bg-n-amber-3 text-n-slate-12';
  }
  if (message.message_type === MESSAGE_TYPE.OUTGOING) {
    return 'self-end bg-n-blue-3 text-n-slate-12';
  }
  return 'self-start bg-n-solid-1 text-n-slate-12 border border-n-weak';
};
</script>

<template>
  <div class="flex justify-end gap-1.5">
    <Button
      v-tooltip.top="t('GTI.TICKETS.FINISH')"
      icon="i-lucide-x"
      size="xs"
      color="ruby"
      variant="faded"
      :aria-label="t('GTI.TICKETS.FINISH')"
      :disabled="isBusy"
      @click.stop="finishConversation"
    />
    <Button
      v-tooltip.top="t('GTI.TICKETS.PEEK')"
      icon="i-lucide-eye"
      size="xs"
      color="slate"
      variant="faded"
      :aria-label="t('GTI.TICKETS.PEEK')"
      @click.stop="peekConversation"
    />
    <Button
      v-if="canAccept"
      v-tooltip.top="t('GTI.TICKETS.ACCEPT')"
      icon="i-lucide-check"
      size="xs"
      color="blue"
      :aria-label="t('GTI.TICKETS.ACCEPT')"
      :disabled="isBusy"
      @click="acceptConversation"
    />
    <Dialog
      ref="peekDialogRef"
      :title="t('GTI.TICKETS.PEEK_TITLE', { name: contactName })"
      :description="t('GTI.TICKETS.PEEK_DESCRIPTION')"
      :confirm-button-label="t('GTI.TICKETS.ACCEPT')"
      :cancel-button-label="t('GTI.TICKETS.CLOSE')"
      width="xl"
      overflow-y-auto
      @confirm="acceptFromPeek"
    >
      <p v-if="isPeekLoading" class="m-0 text-sm text-n-slate-11">
        {{ t('GTI.TICKETS.LOADING') }}
      </p>
      <div
        v-else
        class="flex flex-col gap-1.5 p-3 rounded-lg max-h-[50vh] overflow-y-auto bg-n-slate-2"
      >
        <div
          v-for="message in peekMessages"
          :key="message.id"
          class="max-w-[85%] px-3 py-1.5 rounded-lg text-sm whitespace-pre-line break-words"
          :class="bubbleClass(message)"
        >
          <span
            v-if="message.message_type === MESSAGE_TYPE.OUTGOING"
            class="block text-xs font-semibold text-n-blue-11"
          >
            {{ message.sender?.name }}
          </span>
          {{ messageText(message) }}
          <span class="block text-xxs text-end text-n-slate-10">
            {{ messageTimestamp(message.created_at, 'dd/MM HH:mm') }}
          </span>
        </div>
      </div>
    </Dialog>
  </div>
</template>
