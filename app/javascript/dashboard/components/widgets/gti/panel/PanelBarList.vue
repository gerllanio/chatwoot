<script setup>
// Horizontal bars ranked by value, e.g. conversations per channel or queue.
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  // [{ key, label, value, display, color: { bg } }]
  rows: { type: Array, default: () => [] },
  emptyLabel: { type: String, required: true },
});

const max = computed(() => Math.max(1, ...props.rows.map(row => row.value)));
</script>

<template>
  <div
    class="flex flex-col p-4 min-w-0 rounded-xl bg-n-solid-2 outline outline-1 outline-n-container"
  >
    <h4 class="m-0 text-sm font-semibold text-n-slate-12">{{ title }}</h4>
    <p class="m-0 mt-0.5 mb-3 text-xs text-n-slate-11">{{ subtitle }}</p>
    <p v-if="!rows.length" class="m-0 text-sm text-n-slate-10">
      {{ emptyLabel }}
    </p>
    <div
      v-for="row in rows"
      :key="row.key"
      class="grid items-center gap-2 py-1 text-sm grid-cols-[minmax(4rem,8rem)_1fr_auto]"
      :title="`${row.label}: ${row.value}`"
    >
      <span class="truncate text-n-slate-11">{{ row.label }}</span>
      <div class="h-2 overflow-hidden rounded-full bg-n-slate-3">
        <div
          class="h-full rounded-full"
          :class="row.color.bg"
          :style="{ width: `${(row.value / max) * 100}%` }"
        />
      </div>
      <span class="font-semibold tabular-nums text-n-slate-12">
        {{ row.display ?? row.value }}
      </span>
    </div>
  </div>
</template>
