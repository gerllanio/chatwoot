<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import Switch from 'dashboard/components-next/switch/Switch.vue';
import { GTI_TICKET_TABS } from 'dashboard/helper/gtiTicketTabs';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  activeTab: {
    type: String,
    default: GTI_TICKET_TABS.ATTENDING,
  },
  canShowAll: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['tabChange']);

const showAll = defineModel('showAll', {
  type: Boolean,
  default: false,
});

const { t } = useI18n();

const activeTabIndex = computed(() =>
  props.items.findIndex(item => item.key === props.activeTab)
);

const onTabChange = index => {
  const selected = props.items[index];
  if (selected && selected.key !== props.activeTab) {
    emit('tabChange', selected.key);
  }
};

const showAllToggleVisible = computed(
  () => props.canShowAll && props.activeTab === GTI_TICKET_TABS.ATTENDING
);

useKeyboardEvents({
  'Alt+KeyN': {
    action: () => onTabChange((activeTabIndex.value + 1) % props.items.length),
  },
});
</script>

<template>
  <div class="flex flex-col w-full">
    <woot-tabs
      :index="activeTabIndex"
      class="w-full px-3 -mt-1 py-0 [&_ul]:p-0 h-10"
      @change="onTabChange"
    >
      <woot-tabs-item
        v-for="(item, index) in items"
        :key="item.key"
        class="text-sm [&_a]:font-medium"
        :index="index"
        :name="item.name"
        :count="item.count ?? 0"
        :show-badge="item.count !== null"
        is-compact
      />
    </woot-tabs>
    <label
      v-if="showAllToggleVisible"
      class="flex items-center gap-2 px-4 py-1.5 text-xs cursor-pointer text-n-slate-11"
    >
      <Switch v-model="showAll" />
      {{ t('GTI.TICKETS.SHOW_ALL') }}
    </label>
  </div>
</template>
