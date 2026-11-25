<script setup>
// Period KPI with its change against the previous period of the same length.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { isImprovement } from 'dashboard/helper/gtiPanel';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  delta: { type: Number, default: null },
  higherIsBetter: { type: Boolean, default: true },
});

const { t } = useI18n();
const good = computed(() => isImprovement(props.delta, props.higherIsBetter));
const deltaText = computed(() => {
  const arrow = props.delta >= 0 ? '▲' : '▼';
  return `${arrow} ${Math.abs(props.delta)}%`;
});
</script>

<template>
  <div
    class="flex flex-col gap-0.5 px-3 py-2.5 min-w-0 rounded-xl bg-n-solid-2 outline outline-1 outline-n-container"
  >
    <span class="text-xs truncate text-n-slate-11">{{ label }}</span>
    <b class="text-xl leading-tight tabular-nums text-n-slate-12">
      {{ value }}
    </b>
    <span
      v-if="delta !== null"
      class="inline-flex items-center gap-1 text-xs font-semibold"
      :class="good ? 'text-n-teal-11' : 'text-n-ruby-11'"
    >
      {{ deltaText }}
      <small class="font-normal text-n-slate-11">
        {{ good ? t('GTI_PANEL.KPI.BETTER') : t('GTI_PANEL.KPI.WORSE') }}
      </small>
    </span>
    <span v-else class="text-xs text-n-slate-10">
      {{ t('GTI_PANEL.KPI.NO_COMPARISON') }}
    </span>
  </div>
</template>
