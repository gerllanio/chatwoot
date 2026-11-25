<script setup>
// GTI "Work": the prototype's "Responder / 🔒 Nota interna" tabs above the
// composer, in place of the sliding reply/private toggle.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';

const props = defineProps({
  mode: { type: String, default: REPLY_EDITOR_MODES.REPLY },
  disabled: { type: Boolean, default: false },
  isReplyRestricted: { type: Boolean, default: false },
});

const emit = defineEmits(['toggleMode']);
const { t } = useI18n();

const isNote = computed(
  () => props.isReplyRestricted || props.mode === REPLY_EDITOR_MODES.NOTE
);

const pick = wantNote => {
  if (props.disabled || wantNote === isNote.value) return;
  if (!wantNote && props.isReplyRestricted) return;
  emit('toggleMode');
};
</script>

<template>
  <div class="flex gap-1">
    <button
      type="button"
      class="px-2.5 py-0.5 text-xs border-0 rounded-[0.3125rem]"
      :class="
        !isNote
          ? 'bg-n-gti-soft dark:bg-n-gti-soft-dark text-n-gti-green font-semibold'
          : 'bg-transparent text-n-slate-11'
      "
      :disabled="disabled || isReplyRestricted"
      @click="pick(false)"
    >
      {{ t('GTI_TICKETS.COMPOSER.REPLY') }}
    </button>
    <button
      type="button"
      class="px-2.5 py-0.5 text-xs border-0 rounded-[0.3125rem]"
      :class="
        isNote
          ? 'bg-n-gti-note dark:bg-n-gti-note-dark text-n-amber-11 font-semibold'
          : 'bg-transparent text-n-slate-11'
      "
      :disabled="disabled"
      @click="pick(true)"
    >
      {{ t('GTI_TICKETS.COMPOSER.NOTE') }}
    </button>
  </div>
</template>
