<script setup>
// Agents table, sortable by any column.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar.vue';
import {
  STATUS_COLORS,
  formatDuration,
  sortRows,
} from 'dashboard/helper/gtiPanel';

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const { t } = useI18n();
const sortKey = ref('total');
const sortDirection = ref(-1);

const COLUMNS = [
  { key: 'name', label: 'GTI_PANEL.AGENTS.NAME', numeric: false },
  { key: 'total', label: 'GTI_PANEL.AGENTS.TOTAL', numeric: true },
  { key: 'open', label: 'GTI_PANEL.AGENTS.OPEN', numeric: true },
  { key: 'resolved', label: 'GTI_PANEL.AGENTS.RESOLVED', numeric: true },
  {
    key: 'firstResponse',
    label: 'GTI_PANEL.AGENTS.FIRST_RESPONSE',
    numeric: true,
  },
  { key: 'resolution', label: 'GTI_PANEL.AGENTS.RESOLUTION', numeric: true },
];

const sorted = computed(() =>
  sortRows(props.rows, sortKey.value, sortDirection.value)
);
const totalVolume = computed(() =>
  Math.max(
    1,
    props.rows.reduce((sum, row) => sum + row.total, 0)
  )
);
const share = row => Math.round((row.total / totalVolume.value) * 100);
const shareText = row => `${share(row)}%`;

const sortBy = key => {
  if (sortKey.value === key) {
    sortDirection.value = -sortDirection.value;
    return;
  }
  sortKey.value = key;
  sortDirection.value = key === 'name' ? 1 : -1;
};
const arrow = key => {
  if (sortKey.value !== key) {
    return '';
  }
  return sortDirection.value < 0 ? ' ↓' : ' ↑';
};
</script>

<template>
  <div
    class="overflow-x-auto rounded-xl bg-n-solid-2 outline outline-1 outline-n-container"
  >
    <table class="w-full text-sm border-collapse min-w-[40rem]">
      <thead>
        <tr class="text-xs text-start text-n-slate-11">
          <th
            v-for="column in COLUMNS"
            :key="column.key"
            class="px-3 py-2 font-medium border-b cursor-pointer select-none border-n-weak"
            :class="[
              column.numeric ? 'text-end' : 'text-start',
              { 'text-n-slate-12': sortKey === column.key },
            ]"
            @click="sortBy(column.key)"
          >
            {{ t(column.label) }}{{ arrow(column.key) }}
          </th>
          <th class="px-3 py-2 font-medium border-b text-start border-n-weak">
            {{ t('GTI_PANEL.AGENTS.SHARE') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length">
          <td colspan="7" class="px-3 py-4 text-n-slate-10">
            {{ t('GTI_PANEL.AGENTS.EMPTY') }}
          </td>
        </tr>
        <tr
          v-for="row in sorted"
          :key="row.id"
          class="border-b border-n-weak last:border-0"
        >
          <td class="px-3 py-2">
            <div class="flex items-center gap-2 min-w-0">
              <Avatar :name="row.name" :src="row.thumbnail" :size="28" />
              <div class="flex flex-col min-w-0">
                <span class="truncate text-n-slate-12">{{ row.name }}</span>
                <span
                  class="inline-flex items-center gap-1 text-xs text-n-slate-11"
                >
                  <i
                    class="rounded-full size-1.5"
                    :class="
                      (STATUS_COLORS[row.status] || STATUS_COLORS.offline).bg
                    "
                  />
                  {{ t(`GTI_PANEL.STATUS.${row.status.toUpperCase()}`) }}
                </span>
              </div>
            </div>
          </td>
          <td class="px-3 py-2 tabular-nums text-end">{{ row.total }}</td>
          <td class="px-3 py-2 tabular-nums text-end">{{ row.open }}</td>
          <td class="px-3 py-2 tabular-nums text-end">{{ row.resolved }}</td>
          <td class="px-3 py-2 tabular-nums text-end">
            {{ formatDuration(row.firstResponse) }}
          </td>
          <td class="px-3 py-2 tabular-nums text-end">
            {{ formatDuration(row.resolution) }}
          </td>
          <td class="px-3 py-2">
            <div class="flex items-center gap-2">
              <span
                class="w-20 h-1.5 overflow-hidden rounded-full bg-n-slate-3"
              >
                <i
                  class="block h-full rounded-full bg-n-brand"
                  :style="{ width: shareText(row) }"
                />
              </span>
              <span class="text-xs tabular-nums">{{ shareText(row) }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
