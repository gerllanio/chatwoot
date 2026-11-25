<script setup>
// Small "Conectado / Conectando / Desconectado" pill for a WhatsApp QR inbox.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  gtiConnectionState,
  GTI_CONNECTION_STATES,
} from 'dashboard/helper/gtiConnection';

const props = defineProps({
  inbox: { type: Object, required: true },
});

const { t } = useI18n();

const STYLES = {
  [GTI_CONNECTION_STATES.CONNECTED]: {
    pill: 'bg-n-teal-3 text-n-teal-11',
    dot: 'bg-n-teal-9',
    label: 'GTI_INBOX.CONNECTION.CONNECTED',
  },
  [GTI_CONNECTION_STATES.CONNECTING]: {
    pill: 'bg-n-amber-3 text-n-amber-11',
    dot: 'bg-n-amber-9 animate-pulse',
    label: 'GTI_INBOX.CONNECTION.CONNECTING',
  },
  [GTI_CONNECTION_STATES.DISCONNECTED]: {
    pill: 'bg-n-ruby-3 text-n-ruby-11',
    dot: 'bg-n-ruby-9',
    label: 'GTI_INBOX.CONNECTION.DISCONNECTED',
  },
};

const style = computed(
  () => STYLES[gtiConnectionState(props.inbox.provider_connection)]
);
</script>

<template>
  <span
    v-if="style"
    class="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full shrink-0"
    :class="style.pill"
  >
    <span class="rounded-full size-2" :class="style.dot" />
    {{ t(style.label) }}
  </span>
</template>
