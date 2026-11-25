<script setup>
// Opened x resolved conversations over the period, with a hover readout per
// bucket.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { linePoints } from 'dashboard/helper/gtiPanel';

const props = defineProps({
  // [{ timestamp, label, opened, resolved }]
  buckets: { type: Array, default: () => [] },
});

const WIDTH = 600;
const HEIGHT = 160;

const { t } = useI18n();
const hovered = ref(null);

const max = computed(() =>
  Math.max(
    1,
    ...props.buckets.flatMap(bucket => [bucket.opened, bucket.resolved])
  )
);
const openedPoints = computed(() =>
  linePoints(
    props.buckets.map(bucket => bucket.opened),
    WIDTH,
    HEIGHT,
    max.value
  )
);
const resolvedPoints = computed(() =>
  linePoints(
    props.buckets.map(bucket => bucket.resolved),
    WIDTH,
    HEIGHT,
    max.value
  )
);
const step = computed(() => WIDTH / Math.max(1, props.buckets.length - 1));
const hoveredBucket = computed(() =>
  hovered.value === null ? null : props.buckets[hovered.value]
);
const firstLabel = computed(() => props.buckets[0]?.label || '');
const lastLabel = computed(() => props.buckets.at(-1)?.label || '');
</script>

<template>
  <div class="flex flex-col min-w-0">
    <div class="flex flex-wrap gap-4 mb-2 text-xs text-n-slate-11">
      <span class="inline-flex items-center gap-1.5">
        <i class="w-3.5 h-0.5 rounded bg-n-iris-9" />
        {{ t('GTI_PANEL.VOLUME.OPENED') }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <i class="w-3.5 h-0.5 rounded bg-n-teal-9" />
        {{ t('GTI_PANEL.VOLUME.RESOLVED') }}
      </span>
      <span v-if="hoveredBucket" class="ms-auto text-n-slate-12 tabular-nums">
        {{
          t('GTI_PANEL.VOLUME.READOUT', {
            label: hoveredBucket.label,
            opened: hoveredBucket.opened,
            resolved: hoveredBucket.resolved,
          })
        }}
      </span>
    </div>
    <svg
      :viewBox="`0 -4 ${WIDTH} ${HEIGHT + 8}`"
      class="w-full h-auto overflow-visible"
      role="img"
      :aria-label="t('GTI_PANEL.VOLUME.TITLE')"
      @mouseleave="hovered = null"
    >
      <line
        v-for="gridLine in 4"
        :key="gridLine"
        x1="0"
        :x2="WIDTH"
        :y1="(HEIGHT / 4) * (gridLine - 1)"
        :y2="(HEIGHT / 4) * (gridLine - 1)"
        class="stroke-n-slate-4"
        stroke-width="1"
      />
      <line
        v-if="hovered !== null"
        :x1="hovered * step"
        :x2="hovered * step"
        y1="0"
        :y2="HEIGHT"
        class="stroke-n-slate-8"
        stroke-width="1"
      />
      <polyline
        :points="openedPoints"
        fill="none"
        stroke-width="2"
        stroke-linejoin="round"
        class="stroke-n-iris-9"
      />
      <polyline
        :points="resolvedPoints"
        fill="none"
        stroke-width="2"
        stroke-linejoin="round"
        class="stroke-n-teal-9"
      />
      <rect
        v-for="(bucket, index) in buckets"
        :key="bucket.timestamp"
        :x="index * step - step / 2"
        y="0"
        :width="step"
        :height="HEIGHT"
        fill="transparent"
        @mouseenter="hovered = index"
      />
    </svg>
    <div class="flex justify-between mt-1 text-xs text-n-slate-10">
      <span>{{ firstLabel }}</span>
      <span>{{ t('GTI_PANEL.VOLUME.MAX', { max }) }}</span>
      <span>{{ lastLabel }}</span>
    </div>
  </div>
</template>
