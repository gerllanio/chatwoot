<script setup>
// GTI "Work" header of the ticket list, as in the approved prototype:
// "Abertos / Resolvidos / Busca" on top, then "+ Novo", "Ver todos" and the
// queue (team) filter, then the "Atendendo / Aguardando" sub-tabs.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { useAccount } from 'dashboard/composables/useAccount';
import Switch from 'dashboard/components-next/switch/Switch.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu.vue';
import GtiNewTicketModal from './GtiNewTicketModal.vue';
import {
  GTI_LIST_SECTIONS,
  GTI_TICKET_TABS,
  gtiSectionOfTab,
} from 'dashboard/helper/gtiTicketTabs';

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
  teams: {
    type: Array,
    default: () => [],
  },
  activeTeamId: {
    type: [String, Number],
    default: 0,
  },
});

const emit = defineEmits(['tabChange']);

const showAll = defineModel('showAll', {
  type: Boolean,
  default: false,
});

const { t } = useI18n();
const router = useRouter();
const { accountScopedRoute } = useAccount();

const ALL_TEAMS = 'all';

const activeSection = computed(() => gtiSectionOfTab(props.activeTab));
const isOpenSection = computed(
  () => activeSection.value === GTI_LIST_SECTIONS.OPEN
);

const sections = computed(() => [
  {
    key: GTI_LIST_SECTIONS.OPEN,
    label: t('GTI.TICKETS.OPEN'),
    icon: 'i-material-symbols-inbox',
  },
  {
    key: GTI_LIST_SECTIONS.RESOLVED,
    label: t('GTI.TICKETS.RESOLVED'),
    icon: 'i-material-symbols-check',
  },
  {
    key: GTI_LIST_SECTIONS.SEARCH,
    label: t('GTI.TICKETS.SEARCH'),
    icon: 'i-material-symbols-search',
  },
]);

const selectTab = tab => {
  if (tab !== props.activeTab) {
    emit('tabChange', tab);
  }
};

const onSectionClick = section => {
  if (section === GTI_LIST_SECTIONS.SEARCH) {
    router.push(accountScopedRoute('search'));
    return;
  }
  if (section === GTI_LIST_SECTIONS.RESOLVED) {
    selectTab(GTI_TICKET_TABS.RESOLVED);
    return;
  }
  if (!isOpenSection.value) {
    selectTab(GTI_TICKET_TABS.ATTENDING);
  }
};

const subTabClass = key => {
  if (key !== props.activeTab) {
    return 'text-n-slate-11 border-transparent hover:text-n-slate-12';
  }
  return 'text-n-slate-12 font-semibold border-n-brand';
};

const badgeClass = key =>
  key === GTI_TICKET_TABS.WAITING ? 'bg-n-amber-9' : 'bg-n-gti-blue';

const newTicketModalRef = ref(null);
const showTeamMenu = ref(false);
const teamMenuItems = computed(() => [
  {
    label: t('GTI.TICKETS.ALL_QUEUES'),
    value: ALL_TEAMS,
    action: 'team',
    isSelected: !props.activeTeamId,
  },
  ...props.teams.map(team => ({
    label: team.name,
    value: team.id,
    action: 'team',
    isSelected: String(team.id) === String(props.activeTeamId),
  })),
]);

const onTeamSelect = ({ value }) => {
  showTeamMenu.value = false;
  if (value === ALL_TEAMS) {
    router.push(accountScopedRoute('home'));
    return;
  }
  router.push(accountScopedRoute('team_conversations', { teamId: value }));
};

const showAllToggleVisible = computed(
  () => props.canShowAll && props.activeTab === GTI_TICKET_TABS.ATTENDING
);

useKeyboardEvents({
  'Alt+KeyN': {
    action: () => {
      const keys = props.items.map(item => item.key);
      const next = keys[(keys.indexOf(props.activeTab) + 1) % keys.length];
      if (next) {
        selectTab(next);
      }
    },
  },
});
</script>

<template>
  <div class="flex flex-col w-full border-b border-n-weak">
    <nav class="flex w-full border-b border-n-weak">
      <button
        v-for="section in sections"
        :key="section.key"
        type="button"
        class="flex flex-col items-center flex-1 gap-0.5 py-2 text-xs border-b-2 -mb-px"
        :class="
          activeSection === section.key
            ? 'text-n-brand border-n-brand font-medium'
            : 'text-n-slate-11 border-transparent hover:text-n-slate-12'
        "
        @click="onSectionClick(section.key)"
      >
        <span :class="section.icon" class="size-4" />
        {{ section.label }}
      </button>
    </nav>

    <div class="flex items-center gap-2 px-3 py-2">
      <Button
        :label="t('GTI.TICKETS.NEW')"
        icon="i-material-symbols-add"
        size="sm"
        class="!bg-n-brand !text-white hover:!brightness-110"
        @click="newTicketModalRef.open()"
      />
      <GtiNewTicketModal ref="newTicketModalRef" />
      <label
        v-if="showAllToggleVisible"
        class="flex items-center gap-1.5 text-xs cursor-pointer text-n-slate-11 whitespace-nowrap"
      >
        <Switch v-model="showAll" />
        {{ t('GTI.TICKETS.SHOW_ALL') }}
      </label>
      <span class="flex-1" />
      <div
        v-if="teams.length"
        v-on-clickaway="() => (showTeamMenu = false)"
        class="relative"
      >
        <Button
          :label="t('GTI.TICKETS.QUEUES', { count: teams.length })"
          icon="i-material-symbols-filter-list"
          size="sm"
          variant="outline"
          color="slate"
          @click="showTeamMenu = !showTeamMenu"
        />
        <DropdownMenu
          v-if="showTeamMenu"
          :menu-items="teamMenuItems"
          class="mt-1 ltr:right-0 rtl:left-0 top-full max-h-80 overflow-y-auto"
          @action="onTeamSelect"
        />
      </div>
      <div class="relative">
        <!-- Upstream's advanced filter modal teleports here while the GTI header replaces ChatListHeader. -->
        <div
          id="conversationFilterTeleportTarget"
          class="absolute z-50 mt-2 ltr:right-0 rtl:left-0"
        />
      </div>
    </div>

    <div v-if="isOpenSection && items.length" class="flex bg-n-alpha-1">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="flex items-center justify-center flex-1 gap-2 py-2 text-sm border-b-2 -mb-px"
        :class="subTabClass(item.key)"
        @click="selectTab(item.key)"
      >
        {{ item.name }}
        <span
          class="px-1.5 text-xs font-semibold leading-5 text-white rounded-full min-w-5"
          :class="badgeClass(item.key)"
        >
          {{ item.count }}
        </span>
      </button>
    </div>
  </div>
</template>
