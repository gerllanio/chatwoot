<script setup>
// Middle column of the e-mail screen: the messages of one folder, newest first.
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'dashboard/components-next/button/Button.vue';
import { listDate } from 'dashboard/helper/gtiMail';

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  messages: { type: Array, required: true },
  selectedUid: { type: Number, default: null },
  isLoading: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: false },
  query: { type: String, default: '' },
});

const emit = defineEmits(['open', 'more', 'search', 'back', 'refresh']);
const { t } = useI18n();
const search = ref(props.query);

watch(
  () => props.query,
  value => {
    search.value = value;
  }
);
</script>

<template>
  <section class="flex flex-col h-full min-h-0 bg-n-solid-1">
    <header class="flex flex-col gap-2 px-3 py-2.5 border-b border-n-weak">
      <div class="flex items-center gap-2">
        <Button
          class="md:hidden"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="slate"
          size="sm"
          :aria-label="t('GTI_MAIL.BACK')"
          @click="emit('back')"
        />
        <b class="flex-1 min-w-0 text-sm truncate text-n-slate-12">
          {{ title }}
          <span class="font-normal text-n-slate-10">· {{ subtitle }}</span>
        </b>
        <Button
          icon="i-lucide-refresh-cw"
          variant="ghost"
          color="slate"
          size="sm"
          :aria-label="t('GTI_MAIL.REFRESH')"
          :disabled="isLoading"
          @click="emit('refresh')"
        />
      </div>
      <input
        v-model="search"
        type="search"
        class="!mb-0 text-sm"
        :placeholder="t('GTI_MAIL.SEARCH')"
        @keyup.enter="emit('search', search.trim())"
        @search="emit('search', search.trim())"
      />
    </header>
    <div class="flex-1 min-h-0 overflow-y-auto">
      <button
        v-for="message in messages"
        :key="message.uid"
        type="button"
        class="block w-full px-3 py-2.5 border-b text-start border-n-weak border-s-[3px] hover:bg-n-alpha-1"
        :class="[
          message.seen ? 'border-s-transparent' : 'border-s-n-gti-blue',
          selectedUid === message.uid ? 'bg-n-brand/10' : '',
        ]"
        @click="emit('open', message.uid)"
      >
        <div class="flex gap-2 text-sm">
          <span
            class="flex-1 min-w-0 truncate text-n-slate-12"
            :class="{ 'font-bold': !message.seen }"
          >
            {{ message.from_name || message.from_email }}
          </span>
          <span class="text-xs text-n-slate-10 shrink-0">
            {{ listDate(message.date) }}
          </span>
        </div>
        <div
          class="mt-0.5 text-sm truncate text-n-slate-12"
          :class="{ 'font-bold': !message.seen }"
        >
          <span
            v-if="message.has_attachments"
            class="i-lucide-paperclip size-3.5 align-[-2px] me-1 text-n-slate-10"
          />
          {{ message.subject || t('GTI_MAIL.NO_SUBJECT') }}
        </div>
        <div class="text-xs truncate text-n-slate-10">
          {{ message.from_email }}
        </div>
      </button>
      <p
        v-if="!messages.length && !isLoading"
        class="px-5 py-10 m-0 text-sm text-center text-n-slate-10"
      >
        {{ t('GTI_MAIL.EMPTY_FOLDER') }}
      </p>
      <div v-if="isLoading" class="flex justify-center py-4">
        <span
          class="i-lucide-loader-circle size-5 animate-spin text-n-slate-10"
        />
      </div>
      <div v-else-if="hasMore" class="flex justify-center p-3">
        <Button
          size="sm"
          variant="outline"
          color="slate"
          :label="t('GTI_MAIL.LOAD_MORE')"
          @click="emit('more')"
        />
      </div>
    </div>
  </section>
</template>
