<script setup>
// Ticketz-style pop-ups for new customer messages: they stack at the bottom
// of the conversation list (away from the reply box), stay 10 seconds, can be
// closed one by one and open the conversation when clicked.
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { emitter } from 'shared/helpers/mitt';
import { GTI_MESSAGE_ALERT_EVENT } from 'dashboard/helper/gtiNotificationPrefs';

const ALERT_DURATION_MS = 10000;
const MAX_VISIBLE_ALERTS = 4;

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const alerts = ref([]);
const timers = new Map();

const dismiss = key => {
  clearTimeout(timers.get(key));
  timers.delete(key);
  alerts.value = alerts.value.filter(alert => alert.key !== key);
};

const previewOf = message => {
  if (message.content) {
    return message.content;
  }
  return message.attachments?.length ? t('GTI.ALERTS.ATTACHMENT') : '';
};

const onMessageAlert = message => {
  const key = `${message.id}-${Date.now()}`;
  alerts.value = [
    ...alerts.value,
    {
      key,
      conversationId: message.conversation_id,
      sender: message.sender?.name || t('GTI.ALERTS.CUSTOMER'),
      preview: previewOf(message),
    },
  ];
  timers.set(
    key,
    setTimeout(() => dismiss(key), ALERT_DURATION_MS)
  );
  while (alerts.value.length > MAX_VISIBLE_ALERTS) {
    dismiss(alerts.value[0].key);
  }
};

const openConversation = alert => {
  dismiss(alert.key);
  router.push({
    name: 'inbox_conversation',
    params: {
      accountId: route.params.accountId,
      conversation_id: alert.conversationId,
    },
  });
};

onMounted(() => emitter.on(GTI_MESSAGE_ALERT_EVENT, onMessageAlert));
onUnmounted(() => {
  emitter.off(GTI_MESSAGE_ALERT_EVENT, onMessageAlert);
  timers.forEach(timer => clearTimeout(timer));
});
</script>

<template>
  <div
    class="fixed z-50 flex flex-col-reverse gap-2 bottom-4 start-4 md:start-60 w-80 max-w-[calc(100vw-2rem)] pointer-events-none"
    aria-live="polite"
  >
    <div
      v-for="alert in alerts"
      :key="alert.key"
      class="flex items-start gap-2 p-2.5 text-sm rounded-lg shadow-lg pointer-events-auto bg-n-solid-1 border border-n-weak border-s-4 border-s-n-brand"
    >
      <button
        type="button"
        class="flex-1 min-w-0 p-0 text-start bg-transparent border-0"
        @click="openConversation(alert)"
      >
        <span class="block font-semibold truncate text-n-slate-12">
          {{ alert.sender }}
        </span>
        <span class="block text-xs text-n-slate-11 line-clamp-2">
          {{ alert.preview }}
        </span>
      </button>
      <button
        type="button"
        class="flex items-center justify-center flex-shrink-0 rounded-full size-6 text-n-slate-10 hover:bg-n-slate-3 hover:text-n-slate-12"
        :aria-label="t('GTI.ALERTS.CLOSE')"
        @click="dismiss(alert.key)"
      >
        <span class="i-lucide-x size-4" />
      </button>
    </div>
  </div>
</template>
