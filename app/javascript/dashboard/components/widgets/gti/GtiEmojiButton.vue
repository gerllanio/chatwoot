<script setup>
// Emoji button for plain forms (quick replies): emits the chosen emoji.
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import EmojiIconPicker from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import { vOnClickOutside } from '@vueuse/components';

const emit = defineEmits(['select']);
const { t } = useI18n();
const open = ref(false);

const onSelect = event => {
  emit('select', event.value);
  open.value = false;
};
</script>

<template>
  <div class="relative inline-block">
    <Button
      type="button"
      icon="i-lucide-smile-plus"
      variant="ghost"
      color="slate"
      size="xs"
      :label="t('GTI_EMOJI.ADD')"
      @click="open = !open"
    />
    <EmojiIconPicker
      v-if="open"
      v-on-click-outside="() => (open = false)"
      mode="emoji"
      class="absolute z-20 top-8 start-0"
      @select="onSelect"
    />
  </div>
</template>
