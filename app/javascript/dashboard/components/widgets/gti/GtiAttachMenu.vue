<script setup>
// GTI "Work": the prototype composer's 📎 menu (document, gallery, take a
// photo, record a video) and its 📷 shortcut. Picked files go through the
// reply box's own staging (onFiles = ReplyBox#stageFile), like a paste.
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { vOnClickOutside } from '@vueuse/components';
import Icon from 'dashboard/components-next/icon/Icon.vue';

const props = defineProps({
  onFiles: { type: Function, required: true },
  accept: { type: String, default: '' },
});

const { t } = useI18n();
const open = ref(false);

const OPTIONS = [
  {
    key: 'DOCUMENT',
    icon: 'i-lucide-file-text',
    bg: 'bg-n-gti-mail',
    accept: null,
    capture: null,
  },
  {
    key: 'GALLERY',
    icon: 'i-lucide-image',
    bg: 'bg-n-gti-blue',
    accept: 'image/*,video/*',
    capture: null,
  },
  {
    key: 'PHOTO',
    icon: 'i-lucide-camera',
    bg: 'bg-n-gti-ig',
    accept: 'image/*',
    capture: 'environment',
  },
  {
    key: 'VIDEO',
    icon: 'i-lucide-video',
    bg: 'bg-n-gti-warn',
    accept: 'video/*',
    capture: 'environment',
  },
];

const onChange = event => {
  const files = Array.from(event.target.files || []);
  files.forEach(file => {
    const { name, type, size } = file;
    props.onFiles({ name, type, size, file });
  });
  event.target.value = '';
  open.value = false;
};
</script>

<template>
  <div v-on-click-outside="() => (open = false)" class="relative flex gap-1.5">
    <button
      v-tooltip.top="t('GTI_TICKETS.COMPOSER.ATTACH')"
      type="button"
      class="inline-flex items-center justify-center p-0 border rounded-md size-[2.125rem] border-n-weak bg-n-solid-1 text-n-slate-11 hover:text-n-gti-green"
      :aria-label="t('GTI_TICKETS.COMPOSER.ATTACH')"
      @click="open = !open"
    >
      <Icon icon="i-lucide-paperclip" class="size-[1.125rem]" />
    </button>
    <label
      v-tooltip.top="t('GTI_TICKETS.COMPOSER.TAKE_PHOTO')"
      class="inline-flex items-center justify-center p-0 border rounded-md cursor-pointer size-[2.125rem] border-n-weak bg-n-solid-1 text-n-slate-11 hover:text-n-gti-green"
      :aria-label="t('GTI_TICKETS.COMPOSER.TAKE_PHOTO')"
    >
      <Icon icon="i-lucide-camera" class="size-[1.125rem]" />
      <input
        type="file"
        class="hidden"
        accept="image/*"
        capture="environment"
        @change="onChange"
      />
    </label>
    <div
      v-if="open"
      class="absolute z-20 flex flex-col p-1.5 border shadow-lg bottom-full start-0 mb-1 rounded-[0.625rem] min-w-[12rem] bg-n-solid-1 border-n-weak"
    >
      <label
        v-for="option in OPTIONS"
        :key="option.key"
        class="flex items-center gap-2.5 px-2.5 py-2 text-[0.8125rem] rounded-md cursor-pointer text-n-slate-12 hover:bg-n-alpha-2"
      >
        <span
          class="inline-flex items-center justify-center text-white rounded-full size-[1.875rem]"
          :class="option.bg"
        >
          <Icon :icon="option.icon" class="size-4" />
        </span>
        {{ t(`GTI_TICKETS.COMPOSER.${option.key}`) }}
        <input
          type="file"
          class="hidden"
          multiple
          :accept="option.accept || accept"
          :capture="option.capture"
          @change="onChange"
        />
      </label>
    </div>
  </div>
</template>
