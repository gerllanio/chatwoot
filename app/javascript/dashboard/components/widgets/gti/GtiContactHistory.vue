<script setup>
// Shows the contact's previous conversations inline, above the current one,
// greyed out so the agent reads the history without mistaking it for the
// conversation being answered. Loaded only when the agent asks for it.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ContactAPI from 'dashboard/api/contacts';
import MessageApi from 'dashboard/api/inbox/message';
import { messageTimestamp } from 'shared/helpers/timeHelper';

const props = defineProps({
  conversation: { type: Object, required: true },
});

const MAX_PREVIOUS_CONVERSATIONS = 3;
const MESSAGE_TYPE = { INCOMING: 0, OUTGOING: 1, ACTIVITY: 2 };

const { t } = useI18n();

const isOpen = ref(false);
const isLoading = ref(false);
const history = ref([]);

const contactId = computed(() => props.conversation.meta?.sender?.id);

const loadHistory = async () => {
  isLoading.value = true;
  try {
    const { data } = await ContactAPI.getConversations(contactId.value);
    const previous = (data.payload || [])
      .filter(
        item =>
          item.id !== props.conversation.id &&
          item.created_at < props.conversation.created_at
      )
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, MAX_PREVIOUS_CONVERSATIONS);

    const withMessages = await Promise.all(
      previous.map(async item => {
        const response = await MessageApi.getPreviousMessages({
          conversationId: item.id,
        });
        return { ...item, messages: response.data.payload || [] };
      })
    );
    history.value = withMessages.reverse();
  } finally {
    isLoading.value = false;
  }
};

const toggle = async () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value && !history.value.length) {
    await loadHistory();
  }
};

watch(
  () => props.conversation.id,
  () => {
    isOpen.value = false;
    history.value = [];
  }
);

const messageText = message => {
  if (message.content) {
    return message.content;
  }
  return message.attachments?.length ? t('GTI.HISTORY.ATTACHMENT') : '';
};

const bubbleClass = message => {
  if (message.message_type === MESSAGE_TYPE.ACTIVITY) {
    return 'self-center text-xs bg-n-slate-3';
  }
  if (message.message_type === MESSAGE_TYPE.OUTGOING) {
    return 'self-end bg-n-blue-3';
  }
  return 'self-start bg-n-solid-1 border border-n-weak';
};
</script>

<template>
  <li class="flex flex-col gap-2 px-4 py-2 list-none">
    <button
      type="button"
      class="self-center px-3 py-1 text-xs border border-dashed rounded-full bg-n-solid-1 border-n-weak text-n-slate-11 hover:text-n-brand hover:border-n-brand"
      @click="toggle"
    >
      <span class="i-lucide-history size-3.5 align-middle me-1" />
      {{ isOpen ? t('GTI.HISTORY.HIDE') : t('GTI.HISTORY.SHOW') }}
    </button>
    <p
      v-if="isOpen && isLoading"
      class="m-0 text-xs text-center text-n-slate-10"
    >
      {{ t('GTI.HISTORY.LOADING') }}
    </p>
    <p
      v-else-if="isOpen && !history.length"
      class="m-0 text-xs text-center text-n-slate-10"
    >
      {{ t('GTI.HISTORY.EMPTY') }}
    </p>
    <template v-if="isOpen">
      <div v-for="item in history" :key="item.id" class="flex flex-col gap-1">
        <div class="flex items-center gap-3 text-xs text-n-slate-10">
          <span class="flex-1 border-t border-dashed border-n-weak" />
          {{
            t('GTI.HISTORY.SEPARATOR', {
              id: item.id,
              date: messageTimestamp(item.created_at, 'dd/MM/yyyy'),
            })
          }}
          <span class="flex-1 border-t border-dashed border-n-weak" />
        </div>
        <div
          class="flex flex-col gap-1 opacity-50 grayscale pointer-events-none select-text"
        >
          <div
            v-for="message in item.messages"
            :key="message.id"
            class="max-w-[75%] px-3 py-1.5 rounded-lg text-sm text-n-slate-12 whitespace-pre-line break-words"
            :class="bubbleClass(message)"
          >
            {{ messageText(message) }}
            <span class="block text-xxs text-end text-n-slate-10">
              {{ messageTimestamp(message.created_at, 'dd/MM HH:mm') }}
            </span>
          </div>
        </div>
      </div>
      <div
        v-if="history.length"
        class="flex items-center gap-3 text-xs font-semibold text-n-brand"
      >
        <span class="flex-1 border-t-2 border-n-brand" />
        {{ t('GTI.HISTORY.CURRENT', { id: conversation.id }) }}
        <span class="flex-1 border-t-2 border-n-brand" />
      </div>
    </template>
  </li>
</template>
