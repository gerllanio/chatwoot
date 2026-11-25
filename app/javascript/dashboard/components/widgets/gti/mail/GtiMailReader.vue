<script setup>
// Right column of the e-mail screen: the opened message, sanitized the same way
// Chatwoot renders e-mail conversations, with the Ticketz-style actions.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Letter } from 'vue-letter';
import { allowedCssProperties } from 'lettersanitizer';
import Avatar from 'dashboard/components-next/avatar/Avatar.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import { vOnClickOutside } from '@vueuse/components';
import { fullDate } from 'dashboard/helper/gtiMail';

const props = defineProps({
  message: { type: Object, default: null },
  isLoading: { type: Boolean, default: false },
  folders: { type: Array, default: () => [] },
  currentFolder: { type: String, default: '' },
  isBusy: { type: Boolean, default: false },
});

const emit = defineEmits([
  'reply',
  'forward',
  'toConversation',
  'move',
  'delete',
  'download',
  'back',
]);

const { t } = useI18n();
const showMoveMenu = ref(false);
const confirmDelete = ref(false);

const moveTargets = computed(() =>
  props.folders.filter(folder => folder.path !== props.currentFolder)
);

const sentAt = computed(() => fullDate(props.message?.date));

const KB = 1024;
const formatSize = bytes =>
  bytes < KB * KB
    ? `${Math.max(1, Math.round(bytes / KB))} KB`
    : `${(bytes / KB / KB).toFixed(1)} MB`;

const onMove = target => {
  showMoveMenu.value = false;
  emit('move', target);
};

const onDelete = () => {
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  confirmDelete.value = false;
  emit('delete');
};
</script>

<template>
  <section class="flex flex-col h-full min-w-0 overflow-y-auto bg-n-solid-1">
    <div
      v-if="isLoading"
      class="flex items-center justify-center flex-1 text-n-slate-10"
    >
      <span class="i-lucide-loader-circle size-6 animate-spin" />
    </div>
    <div
      v-else-if="!message"
      class="flex flex-col items-center justify-center flex-1 gap-2 p-6 text-sm text-center text-n-slate-10"
    >
      <span class="i-lucide-mail size-14 opacity-30" />
      <b class="text-n-slate-12">{{ t('GTI_MAIL.SELECT_TITLE') }}</b>
      {{ t('GTI_MAIL.SELECT_HINT') }}
    </div>
    <template v-else>
      <header class="px-5 py-4 border-b border-n-weak">
        <div class="flex items-start gap-2">
          <Button
            class="md:hidden"
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="slate"
            size="sm"
            :aria-label="t('GTI_MAIL.BACK')"
            @click="emit('back')"
          />
          <h2 class="flex-1 m-0 mb-3 text-lg font-semibold text-n-slate-12">
            {{ message.subject || t('GTI_MAIL.NO_SUBJECT') }}
          </h2>
        </div>
        <div class="flex items-center gap-2.5 text-sm">
          <Avatar
            :name="message.from_name || message.from_email"
            :size="34"
            rounded-full
          />
          <div class="min-w-0">
            <b class="block truncate text-n-slate-12">
              {{ message.from_name || message.from_email }}
            </b>
            <small class="block truncate text-n-slate-10">
              {{ message.from_email }} · {{ sentAt }}
            </small>
            <small v-if="message.to" class="block truncate text-n-slate-10">
              {{ t('GTI_MAIL.TO_LINE', { to: message.to }) }}
            </small>
          </div>
        </div>
      </header>
      <div class="px-5 py-4 text-sm text-n-slate-12">
        <Letter
          class-name="prose prose-bubble !max-w-none"
          :html="message.html || ''"
          :text="message.text || ''"
          :allowed-css-properties="allowedCssProperties"
        />
      </div>
      <div
        v-if="message.attachments?.length"
        class="flex flex-wrap gap-2 px-5 pb-4"
      >
        <button
          v-for="file in message.attachments"
          :key="file.index"
          type="button"
          class="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg border-n-weak hover:bg-n-alpha-1 text-n-slate-12"
          @click="emit('download', file)"
        >
          <span class="i-lucide-file-text size-4 text-n-ruby-9" />
          <span class="truncate max-w-[14rem]">{{ file.filename }}</span>
          <small class="text-n-slate-10">{{ formatSize(file.size) }}</small>
        </button>
      </div>
      <div class="flex flex-wrap gap-2 px-5 pb-6">
        <Button
          icon="i-lucide-reply"
          :label="t('GTI_MAIL.REPLY')"
          :disabled="isBusy"
          @click="emit('reply')"
        />
        <Button
          icon="i-lucide-forward"
          color="slate"
          variant="outline"
          :label="t('GTI_MAIL.FORWARD')"
          :disabled="isBusy"
          @click="emit('forward')"
        />
        <Button
          icon="i-lucide-messages-square"
          color="slate"
          variant="outline"
          :label="t('GTI_MAIL.TO_CONVERSATION')"
          :disabled="isBusy"
          @click="emit('toConversation')"
        />
        <div v-on-click-outside="() => (showMoveMenu = false)" class="relative">
          <Button
            icon="i-lucide-folder-input"
            color="slate"
            variant="outline"
            :label="t('GTI_MAIL.MOVE')"
            :disabled="isBusy || !moveTargets.length"
            @click="showMoveMenu = !showMoveMenu"
          />
          <div
            v-if="showMoveMenu"
            class="absolute z-20 py-1 mt-1 overflow-y-auto border rounded-lg shadow-lg max-h-64 min-w-[12rem] bg-n-solid-2 border-n-weak"
          >
            <button
              v-for="folder in moveTargets"
              :key="folder.path"
              type="button"
              class="block w-full px-3 py-1.5 text-sm text-start text-n-slate-12 hover:bg-n-alpha-2"
              @click="onMove(folder.path)"
            >
              {{ folder.name }}
            </button>
          </div>
        </div>
        <Button
          icon="i-lucide-trash-2"
          color="ruby"
          variant="outline"
          :label="
            confirmDelete ? t('GTI_MAIL.CONFIRM_DELETE') : t('GTI_MAIL.DELETE')
          "
          :disabled="isBusy"
          @click="onDelete"
        />
      </div>
    </template>
  </section>
</template>
