<script setup>
// "Escrever" / reply / forward dialog of the e-mail screen.
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';

const props = defineProps({
  mailboxes: { type: Array, required: true },
  isSending: { type: Boolean, default: false },
});

const emit = defineEmits(['send']);
const { t } = useI18n();

const dialogRef = ref(null);
const fileInputRef = ref(null);
const form = reactive({
  inboxId: null,
  to: '',
  cc: '',
  subject: '',
  body: '',
  inReplyTo: '',
  references: '',
  files: [],
});

const senders = computed(() =>
  props.mailboxes.filter(mailbox => mailbox.smtp_enabled)
);
const canSend = computed(
  () => form.inboxId && form.to.trim() && !props.isSending
);

const open = (draft = {}) => {
  Object.assign(form, {
    inboxId: draft.inboxId || senders.value[0]?.id || null,
    to: draft.to || '',
    cc: '',
    subject: draft.subject || '',
    body: draft.body || '',
    inReplyTo: draft.inReplyTo || '',
    references: draft.references || '',
    files: [],
  });
  if (fileInputRef.value) fileInputRef.value.value = '';
  dialogRef.value?.open();
};

const close = () => dialogRef.value?.close();

const onFiles = event => {
  form.files = Array.from(event.target.files || []);
};

const submit = () => {
  if (!canSend.value) return;
  emit('send', { ...form, files: [...form.files] });
};

defineExpose({ open, close });
</script>

<template>
  <Dialog
    ref="dialogRef"
    width="2xl"
    :title="t('GTI_MAIL.COMPOSE_TITLE')"
    :confirm-button-label="t('GTI_MAIL.SEND')"
    :cancel-button-label="t('GTI_MAIL.DISCARD')"
    :disable-confirm-button="!canSend"
    :is-loading="isSending"
    @confirm="submit"
  >
    <div class="flex flex-col gap-3 text-sm">
      <p v-if="!senders.length" class="m-0 text-n-ruby-11">
        {{ t('GTI_MAIL.NO_SMTP') }}
      </p>
      <label class="flex flex-col gap-1">
        {{ t('GTI_MAIL.FROM') }}
        <select v-model="form.inboxId" class="!mb-0">
          <option
            v-for="mailbox in senders"
            :key="mailbox.id"
            :value="mailbox.id"
          >
            {{ mailbox.email }}
          </option>
        </select>
      </label>
      <label class="flex flex-col gap-1">
        {{ t('GTI_MAIL.TO') }}
        <input
          v-model="form.to"
          type="text"
          class="!mb-0"
          :placeholder="t('GTI_MAIL.TO_PLACEHOLDER')"
        />
      </label>
      <label class="flex flex-col gap-1">
        {{ t('GTI_MAIL.CC') }}
        <input v-model="form.cc" type="text" class="!mb-0" />
      </label>
      <label class="flex flex-col gap-1">
        {{ t('GTI_MAIL.SUBJECT') }}
        <input v-model="form.subject" type="text" class="!mb-0" />
      </label>
      <label class="flex flex-col gap-1">
        {{ t('GTI_MAIL.MESSAGE') }}
        <textarea v-model="form.body" rows="9" class="!mb-0" />
      </label>
      <label class="flex items-center gap-2">
        <span class="i-lucide-paperclip size-4 text-n-slate-10" />
        <input
          ref="fileInputRef"
          type="file"
          multiple
          class="!mb-0"
          @change="onFiles"
        />
      </label>
    </div>
  </Dialog>
</template>
