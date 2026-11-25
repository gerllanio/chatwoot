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
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import wootConstants from 'dashboard/constants/globals';
import { useGtiNotice } from 'dashboard/composables/useGtiNotice';
import {
  gtiAvatarColor,
  gtiChannelBadge,
  gtiChannelName,
  gtiInitials,
  gtiWaitText,
} from 'dashboard/helper/gtiTicketCard';

const props = defineProps({
  chat: { type: Object, required: true },
  contact: { type: Object, default: () => ({}) },
  inbox: { type: Object, default: () => ({}) },
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
const peekSubtitle = computed(() =>
  [
    props.chat.meta?.team?.name,
    gtiChannelName(props.inbox.channel_type),
    t('GTI_TICKETS.PEEK.WAITING', {
      time: gtiWaitText(props.chat.waiting_since || props.chat.created_at),
    }),
  ]
    .filter(Boolean)
    .join(' · ')
);
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

const finishFromPeek = async () => {
  peekDialogRef.value.close();
  await finishConversation();
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
    return 'self-center text-xs text-n-slate-11 bg-n-slate-2 border border-dashed border-n-weak rounded-xl';
  }
  if (message.private) {
    return 'self-center bg-n-gti-note dark:bg-n-gti-note-dark border border-n-gti-note-line text-n-slate-12';
  }
  if (message.message_type === MESSAGE_TYPE.OUTGOING) {
    return 'self-end bg-n-gti-out dark:bg-n-gti-out-dark rounded-se-none text-n-slate-12 shadow-sm';
  }
  return 'self-start bg-n-gti-in dark:bg-n-gti-in-dark rounded-ss-none text-n-slate-12 shadow-sm';
};
</script>

<template>
  <span class="inline-flex gap-1.5" @click.stop>
    <button
      v-tooltip.top="t('GTI.TICKETS.FINISH')"
      type="button"
      class="inline-flex items-center justify-center p-0 border rounded-full size-[1.875rem] border-n-weak bg-n-solid-1 text-n-slate-11 hover:bg-n-ruby-3 hover:text-n-ruby-11 hover:border-n-ruby-6 disabled:opacity-50"
      :aria-label="t('GTI.TICKETS.FINISH')"
      :disabled="isBusy"
      @click="finishConversation"
    >
      <Icon icon="i-lucide-x" class="size-4" />
    </button>
    <button
      v-tooltip.top="t('GTI.TICKETS.PEEK')"
      type="button"
      class="inline-flex items-center justify-center p-0 border rounded-full size-[1.875rem] border-n-weak bg-n-solid-1 text-n-slate-11 hover:bg-n-gti-blue/10 hover:text-n-gti-blue hover:border-n-gti-blue/40"
      :aria-label="t('GTI.TICKETS.PEEK')"
      @click="peekConversation"
    >
      <Icon icon="i-lucide-eye" class="size-4" />
    </button>
    <button
      v-if="canAccept"
      v-tooltip.top="t('GTI.TICKETS.ACCEPT')"
      type="button"
      class="inline-flex items-center justify-center p-0 text-white border rounded-full size-[1.875rem] border-n-gti-green bg-n-gti-green hover:brightness-90 disabled:opacity-50"
      :aria-label="t('GTI.TICKETS.ACCEPT')"
      :disabled="isBusy"
      @click="acceptConversation"
    >
      <Icon icon="i-lucide-check" class="size-4" />
    </button>
    <Dialog ref="peekDialogRef" width="xl" overflow-y-auto>
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2.5">
          <img
            v-if="contact.thumbnail"
            :src="contact.thumbnail"
            :alt="contactName"
            class="object-cover rounded-full size-[2.125rem]"
          />
          <span
            v-else
            class="flex items-center justify-center text-xs font-semibold text-white rounded-full size-[2.125rem]"
            :class="gtiAvatarColor(contact.id)"
          >
            {{ gtiInitials(contactName) }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="m-0 text-base font-semibold truncate text-n-slate-12">
              {{ contactName }}
            </p>
            <p class="m-0 text-xs truncate text-n-slate-11">
              {{ t('GTI_TICKETS.PEEK.TITLE') }} · {{ peekSubtitle }}
            </p>
          </div>
          <span
            class="flex items-center justify-center rounded-full size-5"
            :class="gtiChannelBadge(inbox.channel_type).bg"
          >
            <span
              class="text-white size-3"
              :class="gtiChannelBadge(inbox.channel_type).icon"
            />
          </span>
        </div>
        <p v-if="isPeekLoading" class="m-0 text-sm text-n-slate-11">
          {{ t('GTI.TICKETS.LOADING') }}
        </p>
        <div
          v-else
          class="flex flex-col gap-1 p-3 rounded-lg max-h-[52vh] overflow-y-auto bg-n-gti-chat dark:bg-n-gti-chat-dark"
        >
          <div
            v-for="message in peekMessages"
            :key="message.id"
            class="max-w-[85%] px-2.5 pt-1.5 pb-1 rounded-lg text-sm whitespace-pre-line break-words"
            :class="bubbleClass(message)"
          >
            <span
              v-if="message.message_type === MESSAGE_TYPE.OUTGOING"
              class="block text-xs font-bold text-n-gti-green"
            >
              {{ message.sender?.name }}
            </span>
            {{ messageText(message) }}
            <span class="block text-[0.65625rem] text-end text-n-slate-10">
              {{ messageTimestamp(message.created_at, 'dd/MM HH:mm') }}
            </span>
          </div>
        </div>
        <small class="text-xs text-n-slate-11">
          {{ t('GTI.TICKETS.PEEK_DESCRIPTION') }}
        </small>
      </div>
      <template #footer>
        <div class="flex justify-end w-full gap-2">
          <Button
            :label="t('GTI_TICKETS.PEEK.FINISH')"
            icon="i-lucide-x"
            color="ruby"
            variant="faded"
            size="sm"
            @click="finishFromPeek"
          />
          <Button
            :label="t('GTI.TICKETS.CLOSE')"
            color="slate"
            variant="faded"
            size="sm"
            @click="peekDialogRef.close()"
          />
          <Button
            v-if="canAccept"
            :label="t('GTI.TICKETS.ACCEPT')"
            icon="i-lucide-check"
            color="blue"
            size="sm"
            @click="acceptFromPeek"
          />
        </div>
      </template>
    </Dialog>
  </span>
</template>
