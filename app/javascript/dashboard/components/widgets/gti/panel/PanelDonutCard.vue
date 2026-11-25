<script setup>
// "Agora" card: a small donut beside its total and a legend.
import { computed } from 'vue';
import { donutSegments } from 'dashboard/helper/gtiPanel';

const props = defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], required: true },
  // [{ key, label, value, color: { stroke, bg } }]
  parts: { type: Array, default: () => [] },
});

const DONUT_RADIUS = 15.915;
const segments = computed(() => donutSegments(props.parts));
</script>

<template>
  <div
    class="flex items-start gap-3 p-3 min-w-0 rounded-xl bg-n-solid-2 outline outline-1 outline-n-container"
  >
    <svg viewBox="0 0 42 42" class="flex-none size-14" aria-hidden="true">
      <circle
        cx="21"
        cy="21"
        :r="DONUT_RADIUS"
        fill="none"
        stroke-width="6"
        class="stroke-n-slate-4"
      />
      <circle
        v-for="segment in segments"
        :key="segment.key"
        cx="21"
        cy="21"
        :r="DONUT_RADIUS"
        fill="none"
        stroke-width="6"
        :stroke-dasharray="`${segment.length} ${100 - segment.length}`"
        :stroke-dashoffset="25 - segment.offset"
        :class="segment.color.stroke"
      />
    </svg>
    <div class="flex flex-col flex-1 min-w-0">
      <span class="text-xs text-n-slate-11 truncate">{{ title }}</span>
      <b class="text-xl leading-tight tabular-nums text-n-slate-12">
        {{ value }}
      </b>
      <ul class="flex flex-col gap-0.5 p-0 m-0 mt-1 list-none text-xs">
        <li
          v-for="part in parts"
          :key="part.key"
          class="flex items-center gap-1.5 text-n-slate-11"
        >
          <i class="flex-none rounded-sm size-2" :class="part.color.bg" />
          <span class="truncate">{{ part.label }}</span>
          <em class="not-italic ms-auto tabular-nums text-n-slate-12">
            {{ part.value }}
          </em>
        </li>
      </ul>
    </div>
  </div>
</template>
