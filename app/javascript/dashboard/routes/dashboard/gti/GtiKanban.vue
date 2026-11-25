<script setup>
// GTI "Work" Kanban, the prototype's board: conversations by stage (or by
// queue), drag a card to move the conversation, and a TV mode for the wall
// monitor that shows the same board in large type with the queue KPIs.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { debounce } from '@chatwoot/utils';
import { useAlert } from 'dashboard/composables';
import { useMapGetter } from 'dashboard/composables/store';
import ConversationApi from 'dashboard/api/inbox/conversation';
import Button from 'dashboard/components-next/button/Button.vue';
import GtiKanbanColumn from 'dashboard/components/widgets/gti/kanban/GtiKanbanColumn.vue';
import wootConstants from 'dashboard/constants/globals';
import { frontendURL, conversationUrl } from 'dashboard/helper/URLHelper';
import { dateTimeFormat } from 'shared/helpers/localizedDate';
import {
  formatWait,
  isLate,
  waitingSeconds,
} from 'dashboard/helper/gtiMonitor';
import {
  KANBAN_STAGES,
  KANBAN_STAGE_ORDER,
  dropActions,
  groupByStage,
  groupByTeam,
  startOfTodaySeconds,
} from 'dashboard/helper/gtiKanban';

const props = defineProps({
  tv: { type: Boolean, default: false },
});

const REFRESH_MS = 15000;
const CLOCK_MS = 1000;
const LIVE_UPDATE_DELAY_MS = 2000;
const MS_PER_SECOND = 1000;
// One page is 25 conversations; four pages per status keeps the board light.
const MAX_PAGES = 4;
const PAGE_SIZE = 25;

const VIEWS = { STAGE: 'stage', TEAM: 'team' };

const STAGE_STYLES = {
  [KANBAN_STAGES.NEW]: { bar: 'border-n-slate-9', pill: 'bg-n-slate-9' },
  [KANBAN_STAGES.ATTENDING]: {
    bar: 'border-n-gti-blue',
    pill: 'bg-n-gti-blue',
  },
  [KANBAN_STAGES.WAITING_CUSTOMER]: {
    bar: 'border-n-amber-9',
    pill: 'bg-n-amber-9',
  },
  [KANBAN_STAGES.RESOLVED]: {
    bar: 'border-n-gti-green',
    pill: 'bg-n-gti-green',
  },
};

const STAGE_LABELS = {
  [KANBAN_STAGES.NEW]: 'GTI_KANBAN.STAGES.NEW',
  [KANBAN_STAGES.ATTENDING]: 'GTI_KANBAN.STAGES.ATTENDING',
  [KANBAN_STAGES.WAITING_CUSTOMER]: 'GTI_KANBAN.STAGES.WAITING_CUSTOMER',
  [KANBAN_STAGES.RESOLVED]: 'GTI_KANBAN.STAGES.RESOLVED',
};

const TEAM_PALETTE = [
  { bar: 'border-n-teal-9', pill: 'bg-n-teal-9' },
  { bar: 'border-n-iris-9', pill: 'bg-n-iris-9' },
  { bar: 'border-n-amber-9', pill: 'bg-n-amber-9' },
  { bar: 'border-n-ruby-9', pill: 'bg-n-ruby-9' },
  { bar: 'border-n-violet-9', pill: 'bg-n-violet-9' },
  { bar: 'border-n-gti-blue', pill: 'bg-n-gti-blue' },
];

const { t } = useI18n();
const store = useStore();
const route = useRoute();
const router = useRouter();
const teams = useMapGetter('teams/getTeams');
const agents = useMapGetter('agents/getAgents');
const inboxes = useMapGetter('inboxes/getInboxes');
const currentUser = useMapGetter('getCurrentUser');
const storeConversations = useMapGetter('getAllConversations');

const rootRef = ref(null);
const view = ref(VIEWS.STAGE);
const tvMode = ref(props.tv || route.name === 'gti_monitor');
const conversations = ref([]);
const now = ref(Date.now());
let refreshTimer = null;
let clockTimer = null;

const nowSeconds = computed(() => Math.floor(now.value / MS_PER_SECOND));
const todayStart = computed(() => startOfTodaySeconds(new Date(now.value)));
const clockFormat = dateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const clock = computed(() => clockFormat.format(now.value));

const fetchPages = async (params, keepGoing = () => true) => {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    // Pages depend on the previous one, so they are read one after another.
    // eslint-disable-next-line no-await-in-loop
    const { data } = await ConversationApi.get({ ...params, page });
    const payload = data.data.payload || [];
    all.push(...payload);
    if (payload.length < PAGE_SIZE || !keepGoing(payload)) break;
  }
  return all;
};

const { STATUS_TYPE, ASSIGNEE_TYPE, SORT_BY_TYPE } = wootConstants;

const refresh = async () => {
  const [open, pending, resolved] = await Promise.all([
    fetchPages({
      status: STATUS_TYPE.OPEN,
      assigneeType: ASSIGNEE_TYPE.ALL,
      sortBy: SORT_BY_TYPE.WAITING_SINCE_ASC,
    }),
    fetchPages({
      status: STATUS_TYPE.PENDING,
      assigneeType: ASSIGNEE_TYPE.ALL,
    }),
    fetchPages(
      {
        status: STATUS_TYPE.RESOLVED,
        assigneeType: ASSIGNEE_TYPE.ALL,
        sortBy: SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC,
      },
      page => page.at(-1).timestamp >= todayStart.value
    ),
  ]);
  const byId = new Map(
    [...open, ...pending, ...resolved].map(item => [item.id, item])
  );
  conversations.value = [...byId.values()];
};

const inboxName = id => inboxes.value.find(inbox => inbox.id === id)?.name;

const toCard = conversation => {
  const isNew =
    conversation.status === STATUS_TYPE.OPEN && !conversation.meta?.assignee;
  const seconds = isNew
    ? waitingSeconds(conversation, nowSeconds.value)
    : Math.max(0, nowSeconds.value - conversation.timestamp);
  return {
    id: conversation.id,
    name: conversation.meta?.sender?.name || '',
    time: formatWait(seconds),
    late: isNew && isLate(seconds),
    details: [
      conversation.meta?.team?.name || t('GTI_KANBAN.NO_QUEUE'),
      inboxName(conversation.inbox_id),
      conversation.meta?.assignee?.name || t('GTI_KANBAN.NO_AGENT'),
    ]
      .filter(Boolean)
      .join(' · '),
  };
};

const stageGroups = computed(() =>
  groupByStage(conversations.value, todayStart.value)
);

const stageColumns = computed(() =>
  KANBAN_STAGE_ORDER.map(stage => ({
    key: stage,
    title: t(STAGE_LABELS[stage]),
    barClass: STAGE_STYLES[stage].bar,
    pillClass: STAGE_STYLES[stage].pill,
    color: null,
    cards: stageGroups.value[stage].map(toCard),
  }))
);

const teamColumns = computed(() =>
  groupByTeam(conversations.value, teams.value, t('GTI_KANBAN.NO_QUEUE')).map(
    (column, index) => ({
      key: `team-${column.id ?? 'none'}`,
      title: column.name,
      barClass: TEAM_PALETTE[index % TEAM_PALETTE.length].bar,
      pillClass: TEAM_PALETTE[index % TEAM_PALETTE.length].pill,
      color: column.color,
      cards: column.conversations.map(toCard),
    })
  )
);

const columns = computed(() =>
  view.value === VIEWS.STAGE ? stageColumns.value : teamColumns.value
);

// TV header figures, the same ones the old monitor screen showed.
const waitingCards = computed(() =>
  stageGroups.value[KANBAN_STAGES.NEW].map(item =>
    waitingSeconds(item, nowSeconds.value)
  )
);
const attendingCount = computed(
  () =>
    stageGroups.value[KANBAN_STAGES.ATTENDING].length +
    stageGroups.value[KANBAN_STAGES.WAITING_CUSTOMER].length
);
const longestWait = computed(() => Math.max(0, ...waitingCards.value));
const lateCount = computed(
  () => waitingCards.value.filter(seconds => isLate(seconds)).length
);
const onlineAgents = computed(
  () =>
    agents.value.filter(agent => agent.availability_status === 'online').length
);

const runAction = (conversationId, action) => {
  if (action.type === 'status') {
    return ConversationApi.toggleStatus({
      conversationId,
      status: action.status,
    });
  }
  return ConversationApi.assignAgent({
    conversationId,
    agentId: action.agentId,
    assigneeType: 'User',
  });
};

const onDrop = async (stage, conversationId) => {
  const conversation = conversations.value.find(
    item => item.id === conversationId
  );
  if (!conversation) return;
  const actions = dropActions(conversation, stage, currentUser.value?.id);
  try {
    // Order matters (reopen before assigning), so the calls run one by one.
    // eslint-disable-next-line no-restricted-syntax
    for (const action of actions) {
      // eslint-disable-next-line no-await-in-loop
      await runAction(conversationId, action);
    }
  } catch (error) {
    useAlert(t('GTI_KANBAN.MOVE_FAILED'));
  }
  await refresh();
};

const openConversation = id => {
  router.push({
    path: frontendURL(
      conversationUrl({ accountId: route.params.accountId, id })
    ),
  });
};

const enterTv = () => {
  tvMode.value = true;
  rootRef.value?.requestFullscreen?.()?.catch(() => {});
};

const exitTv = () => {
  tvMode.value = false;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
};

// Live updates: the dashboard store already receives every websocket event,
// so a change there refreshes the board (debounced, since events come in bursts).
const liveRefresh = debounce(refresh, LIVE_UPDATE_DELAY_MS);
watch(
  () =>
    storeConversations.value
      .map(item => `${item.id}:${item.status}:${item.timestamp}`)
      .join(','),
  () => liveRefresh()
);

onMounted(() => {
  store.dispatch('teams/get');
  store.dispatch('agents/get');
  store.dispatch('inboxes/get');
  refresh();
  refreshTimer = setInterval(refresh, REFRESH_MS);
  clockTimer = setInterval(() => {
    now.value = Date.now();
  }, CLOCK_MS);
});

onUnmounted(() => {
  clearInterval(refreshTimer);
  clearInterval(clockTimer);
});
</script>

<template>
  <div
    ref="rootRef"
    class="flex flex-col w-full h-full gap-4 overflow-hidden bg-n-background text-n-slate-12"
    :class="tvMode ? 'dark p-5' : 'p-4'"
  >
    <header class="flex flex-wrap items-center gap-3">
      <div class="flex-1 min-w-0">
        <h1 class="m-0 font-semibold" :class="tvMode ? 'text-3xl' : 'text-xl'">
          {{ tvMode ? t('GTI.MONITOR.TITLE') : t('GTI_KANBAN.TITLE') }}
        </h1>
        <p v-if="!tvMode" class="m-0 text-sm text-n-slate-11">
          {{
            view === VIEWS.STAGE
              ? t('GTI_KANBAN.SUBTITLE_STAGE')
              : t('GTI_KANBAN.SUBTITLE_TEAM')
          }}
        </p>
      </div>
      <span v-if="tvMode" class="text-3xl font-bold tabular-nums">
        {{ clock }}
      </span>
      <div class="flex p-0.5 rounded-lg bg-n-alpha-2">
        <button
          v-for="option in [VIEWS.STAGE, VIEWS.TEAM]"
          :key="option"
          type="button"
          class="px-3 py-1 text-sm font-medium rounded-md"
          :class="
            view === option
              ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
              : 'text-n-slate-11'
          "
          @click="view = option"
        >
          {{
            option === VIEWS.STAGE
              ? t('GTI_KANBAN.BY_STAGE')
              : t('GTI_KANBAN.BY_TEAM')
          }}
        </button>
      </div>
      <Button
        v-if="!tvMode"
        :label="t('GTI_KANBAN.TV_MODE')"
        icon="i-lucide-monitor"
        size="sm"
        @click="enterTv"
      />
      <Button
        v-else
        :label="t('GTI_KANBAN.EXIT_TV')"
        icon="i-lucide-minimize"
        color="slate"
        size="sm"
        @click="exitTv"
      />
    </header>

    <section
      v-if="tvMode"
      class="grid gap-3 grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]"
    >
      <div class="p-4 border-t-4 rounded-xl bg-n-solid-2 border-n-amber-9">
        <span class="text-sm text-n-slate-11">
          {{ t('GTI.MONITOR.WAITING') }}
        </span>
        <b class="block text-4xl tabular-nums">{{ waitingCards.length }}</b>
      </div>
      <div class="p-4 border-t-4 rounded-xl bg-n-solid-2 border-n-brand">
        <span class="text-sm text-n-slate-11">
          {{ t('GTI.MONITOR.ATTENDING') }}
        </span>
        <b class="block text-4xl tabular-nums">{{ attendingCount }}</b>
      </div>
      <div class="p-4 border-t-4 rounded-xl bg-n-solid-2 border-n-ruby-9">
        <span class="text-sm text-n-slate-11">
          {{ t('GTI.MONITOR.LONGEST') }}
        </span>
        <b
          class="block text-4xl tabular-nums"
          :class="{ 'text-n-ruby-11 animate-pulse': isLate(longestWait) }"
        >
          {{
            waitingCards.length
              ? formatWait(longestWait)
              : t('GTI.MONITOR.NONE')
          }}
        </b>
      </div>
      <div class="p-4 border-t-4 rounded-xl bg-n-solid-2 border-n-teal-9">
        <span class="text-sm text-n-slate-11">
          {{ t('GTI.MONITOR.ONLINE') }}
        </span>
        <b class="block text-4xl tabular-nums">
          {{
            t('GTI.MONITOR.RATIO', {
              online: onlineAgents,
              total: agents.length,
            })
          }}
        </b>
      </div>
      <div class="p-4 border-t-4 rounded-xl bg-n-solid-2 border-n-ruby-9">
        <span class="text-sm text-n-slate-11">{{ t('GTI.MONITOR.LATE') }}</span>
        <b class="block text-4xl tabular-nums">{{ lateCount }}</b>
      </div>
    </section>

    <div class="flex items-start flex-1 min-h-0 gap-3 pb-2 overflow-x-auto">
      <GtiKanbanColumn
        v-for="column in columns"
        :key="column.key"
        class="max-h-full"
        :title="column.title"
        :cards="column.cards"
        :bar-class="column.barClass"
        :pill-class="column.pillClass"
        :color="column.color"
        :droppable="view === VIEWS.STAGE"
        :tv="tvMode"
        @drop="onDrop(column.key, $event)"
        @open="openConversation"
      />
    </div>
  </div>
</template>
