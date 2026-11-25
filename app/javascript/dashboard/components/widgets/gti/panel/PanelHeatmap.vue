<script setup>
// Peak hours: conversations per weekday and hour over the last weeks, to help
// plan the team's schedule.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  // 7 x 24 grid, Sunday first
  grid: { type: Array, required: true },
  weekdays: { type: Array, required: true },
});

const { t } = useI18n();
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const INTENSITY_CLASSES = [
  'bg-n-slate-3',
  'bg-n-teal-4',
  'bg-n-teal-6',
  'bg-n-teal-8',
  'bg-n-teal-10',
];

const max = computed(() => Math.max(1, ...props.grid.flat()));
const intensity = value => {
  if (!value) {
    return INTENSITY_CLASSES[0];
  }
  const level = Math.ceil((value / max.value) * (INTENSITY_CLASSES.length - 1));
  return INTENSITY_CLASSES[level];
};
</script>

<template>
  <div class="overflow-x-auto">
    <div
      class="grid gap-0.5 min-w-[32rem] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))]"
    >
      <template v-for="(row, day) in grid" :key="day">
        <span class="text-xs leading-4 text-n-slate-11">
          {{ weekdays[day] }}
        </span>
        <span
          v-for="hour in HOURS"
          :key="hour"
          class="h-4 rounded-sm"
          :class="intensity(row[hour])"
          :title="
            t('GTI_PANEL.PEAK.CELL', {
              day: weekdays[day],
              hour,
              count: row[hour],
            })
          "
        />
      </template>
      <span />
      <span
        v-for="hour in HOURS"
        :key="`h${hour}`"
        class="text-[0.625rem] text-center text-n-slate-10"
      >
        {{ hour % 3 === 0 ? hour : '' }}
      </span>
    </div>
  </div>
</template>
