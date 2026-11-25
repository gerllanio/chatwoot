<script setup>
// Personal notes on an internal chat channel: only the signed-in user sees
// them. Kept in the user's own ui_settings, keyed by channel id.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUISettings } from 'dashboard/composables/useUISettings';
import Button from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  channelId: { type: Number, required: true },
});

const NOTES_KEY = 'gti_channel_notes';

const { t } = useI18n();
const { uiSettings, updateUISettings } = useUISettings();

const savedNotes = computed(() => uiSettings.value?.[NOTES_KEY] || {});
const draft = ref('');
const saved = ref(false);

watch(
  () => [props.channelId, savedNotes.value[props.channelId]],
  () => {
    draft.value = savedNotes.value[props.channelId] || '';
  },
  { immediate: true }
);

const isDirty = computed(
  () => draft.value !== (savedNotes.value[props.channelId] || '')
);

const save = () => {
  const notes = { ...savedNotes.value };
  if (draft.value.trim()) {
    notes[props.channelId] = draft.value;
  } else {
    delete notes[props.channelId];
  }
  updateUISettings({ [NOTES_KEY]: notes });
  saved.value = true;
};

watch(draft, () => {
  saved.value = false;
});
</script>

<template>
  <div class="px-4 py-4 border-b border-n-slate-5">
    <h4 class="mb-1 text-xs font-semibold uppercase text-n-slate-10">
      {{ t('GTI_CHANNEL_NOTES.TITLE') }}
    </h4>
    <p class="mb-2 text-xs text-n-slate-10">
      {{ t('GTI_CHANNEL_NOTES.HELP') }}
    </p>
    <textarea
      v-model="draft"
      rows="4"
      class="w-full !mb-2 text-sm resize-y"
      :placeholder="t('GTI_CHANNEL_NOTES.PLACEHOLDER')"
    />
    <div class="flex items-center gap-2">
      <Button
        size="sm"
        :label="t('GTI_CHANNEL_NOTES.SAVE')"
        :disabled="!isDirty"
        @click="save"
      />
      <span v-if="saved && !isDirty" class="text-xs text-n-teal-11">
        {{ t('GTI_CHANNEL_NOTES.SAVED') }}
      </span>
    </div>
  </div>
</template>
