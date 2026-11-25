<script setup>
// GTI "Work" Painel: the attendance overview from the approved prototype,
// fed by Chatwoot's own report and live-metric endpoints.
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { useMapGetter } from 'dashboard/composables/store';
import { useLiveRefresh } from 'dashboard/composables/useLiveRefresh';
import ReportsAPI from 'dashboard/api/reports';
import SummaryReportsAPI from 'dashboard/api/summaryReports';
import LiveReportsAPI from 'dashboard/api/liveReports';
import CSATReportsAPI from 'dashboard/api/csatReports';
import GtiTasksAPI from 'dashboard/api/gtiTasks';
import ConversationApi from 'dashboard/api/inbox/conversation';
import Button from 'dashboard/components-next/button/Button.vue';
import Select from 'dashboard/components-next/select/Select.vue';
import wootConstants from 'dashboard/constants/globals';
import { dateTimeFormat } from 'shared/helpers/localizedDate';
import {
  formatWait,
  isLate,
  waitingSeconds,
} from 'dashboard/helper/gtiMonitor';
import {
  PANEL_PERIODS,
  STATUS_COLORS,
  agentRows,
  agentStatusCounts,
  channelTotals,
  csatScore,
  deltaPercent,
  formatDuration,
  heatmapGrid,
  namedTotals,
  periodRange,
  seriesColor,
} from 'dashboard/helper/gtiPanel';
import PanelDonutCard from 'dashboard/components/widgets/gti/panel/PanelDonutCard.vue';
import PanelKpiCard from 'dashboard/components/widgets/gti/panel/PanelKpiCard.vue';
import PanelLineChart from 'dashboard/components/widgets/gti/panel/PanelLineChart.vue';
import PanelBarList from 'dashboard/components/widgets/gti/panel/PanelBarList.vue';
import PanelHeatmap from 'dashboard/components/widgets/gti/panel/PanelHeatmap.vue';
import PanelAgentsTable from 'dashboard/components/widgets/gti/panel/PanelAgentsTable.vue';

const NOW_REFRESH_MS = 30000;
const LATE_LIST_SIZE = 4;
const PEAK_DAYS = 28;
const SECONDS_PER_DAY = 24 * 60 * 60;
const ALL = 'all';
// 4 January 2026 was a Sunday: the heatmap rows start on Sunday.
const FIRST_SUNDAY = new Date(2026, 0, 4);

const { t } = useI18n();
const store = useStore();
const router = useRouter();
const agents = useMapGetter('agents/getAgents');
const teams = useMapGetter('teams/getTeams');
const inboxes = useMapGetter('inboxes/getInboxes');

const period = ref(PANEL_PERIODS.LAST_7_DAYS);
const teamId = ref(ALL);
const inboxId = ref(ALL);
const agentId = ref(ALL);

// Chatwoot reports read one dimension at a time, so picking a queue, a
// connection or an agent clears the other two.
const clearOthers = kept => {
  if (kept !== 'team') teamId.value = ALL;
  if (kept !== 'inbox') inboxId.value = ALL;
  if (kept !== 'agent') agentId.value = ALL;
};
const onTeamChange = value => {
  if (value !== ALL) clearOthers('team');
};
const onInboxChange = value => {
  if (value !== ALL) clearOthers('inbox');
};
const onAgentChange = value => {
  if (value !== ALL) clearOthers('agent');
};
watch(teamId, onTeamChange);
watch(inboxId, onInboxChange);
watch(agentId, onAgentChange);

const dimension = computed(() => {
  if (teamId.value !== ALL) return { type: 'team', id: teamId.value };
  if (inboxId.value !== ALL) return { type: 'inbox', id: inboxId.value };
  if (agentId.value !== ALL) return { type: 'agent', id: agentId.value };
  return { type: 'account', id: undefined };
});

const periodOptions = computed(() =>
  Object.values(PANEL_PERIODS).map(value => ({
    value,
    label: t(`GTI_PANEL.PERIODS.${value.toUpperCase()}`),
  }))
);
const teamOptions = computed(() => [
  { value: ALL, label: t('GTI_PANEL.FILTERS.ALL_QUEUES') },
  ...teams.value.map(team => ({ value: team.id, label: team.name })),
]);
const inboxOptions = computed(() => [
  { value: ALL, label: t('GTI_PANEL.FILTERS.ALL_CONNECTIONS') },
  ...inboxes.value.map(inbox => ({ value: inbox.id, label: inbox.name })),
]);
const agentOptions = computed(() => [
  { value: ALL, label: t('GTI_PANEL.FILTERS.ALL_AGENTS') },
  ...agents.value.map(agent => ({ value: agent.id, label: agent.name })),
]);
const periodLabel = computed(() =>
  t(`GTI_PANEL.PERIODS.${period.value.toUpperCase()}`)
);

// ---- Agora (live) ----
const waiting = ref([]);
const byTeamLive = ref([]);
const byAgentLive = ref([]);
const nowSeconds = ref(Math.floor(Date.now() / 1000));

const fetchNow = async () => {
  const [waitingResponse, teamResponse, agentResponse] = await Promise.all([
    ConversationApi.get({
      status: wootConstants.STATUS_TYPE.OPEN,
      assigneeType: wootConstants.ASSIGNEE_TYPE.UNASSIGNED,
      sortBy: wootConstants.SORT_BY_TYPE.WAITING_SINCE_ASC,
      page: 1,
    }),
    LiveReportsAPI.getGroupedConversations({ groupBy: 'team_id' }),
    LiveReportsAPI.getGroupedConversations({ groupBy: 'assignee_id' }),
  ]);
  nowSeconds.value = Math.floor(Date.now() / 1000);
  waiting.value = waitingResponse.data.data.payload;
  byTeamLive.value = teamResponse.data;
  byAgentLive.value = agentResponse.data;
};

const teamName = id =>
  teams.value.find(team => team.id === id)?.name || t('GTI_PANEL.NO_QUEUE');

const liveParts = metric =>
  byTeamLive.value
    .map(row => ({ key: row.team_id ?? 'none', value: metric(row) }))
    .filter(part => part.value > 0)
    .sort((first, second) => second.value - first.value)
    .map((part, index) => ({
      ...part,
      label: teamName(part.key === 'none' ? null : part.key),
      color: seriesColor(index),
    }));

const waitingParts = computed(() => liveParts(row => row.unassigned));
const attendingParts = computed(() =>
  liveParts(row => row.open - row.unassigned)
);
const waitingTotal = computed(() =>
  waitingParts.value.reduce((sum, part) => sum + part.value, 0)
);
const attendingTotal = computed(() =>
  attendingParts.value.reduce((sum, part) => sum + part.value, 0)
);

const statusCounts = computed(() => agentStatusCounts(agents.value));
const statusParts = computed(() =>
  ['online', 'busy', 'offline'].map(key => ({
    key,
    label: t(`GTI_PANEL.STATUS.${key.toUpperCase()}`),
    value: statusCounts.value[key],
    color: STATUS_COLORS[key],
  }))
);

const waitingEntries = computed(() =>
  waiting.value.map(conversation => ({
    id: conversation.id,
    name: conversation.meta?.sender?.name || '',
    team: teamName(conversation.meta?.team?.id),
    seconds: waitingSeconds(conversation, nowSeconds.value),
  }))
);
const longestWait = computed(() =>
  Math.max(0, ...waitingEntries.value.map(entry => entry.seconds))
);
const lateEntries = computed(() =>
  waitingEntries.value
    .filter(entry => isLate(entry.seconds))
    .sort((first, second) => second.seconds - first.seconds)
);

// ---- Período ----
const summary = ref({});
const csat = ref({ current: null, previous: null });
const buckets = ref([]);
const channelRows = ref([]);
const teamRows = ref([]);
const agentSummary = ref([]);
// CSAT ratings of the period grouped by agent (Avaliação column) and my pending tasks (Agora).
const agentRatings = ref({});
const myTasks = ref([]);
const RATING_PAGES = 4;
const TASKS_IN_CARD = 4;
const taskDueFormat = dateTimeFormat(undefined, {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const peakGrid = ref(heatmapGrid([]));
let periodRequest = 0;

const hourFormat = dateTimeFormat(undefined, { hour: '2-digit' });
const dayFormat = dateTimeFormat(undefined, {
  day: '2-digit',
  month: '2-digit',
});
const weekdayFormat = dateTimeFormat(undefined, { weekday: 'short' });
const weekdays = Array.from({ length: 7 }, (_, day) =>
  weekdayFormat.format(
    new Date(
      FIRST_SUNDAY.getFullYear(),
      FIRST_SUNDAY.getMonth(),
      FIRST_SUNDAY.getDate() + day
    )
  )
);

const csatFilters = ({ type, id }) => ({
  user_ids: type === 'agent' ? id : undefined,
  inbox_id: type === 'inbox' ? id : undefined,
  team_id: type === 'team' ? id : undefined,
});

const buildBuckets = (opened, resolved, groupBy) => {
  const format = groupBy === 'hour' ? hourFormat : dayFormat;
  return opened.map(point => ({
    timestamp: point.timestamp,
    label: format.format(new Date(point.timestamp * 1000)),
    opened: Number(point.value) || 0,
    resolved:
      Number(
        resolved.find(item => item.timestamp === point.timestamp)?.value
      ) || 0,
  }));
};

async function fetchAgentRatings(since, until) {
  const ratings = {};
  for (let page = 1; page <= RATING_PAGES; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await CSATReportsAPI.get({ page, from: since, to: until });
    const responses = Array.isArray(data) ? data : data?.payload || [];
    responses.forEach(response => {
      const agentKey = response.assigned_agent?.id;
      if (!agentKey || !response.rating) return;
      ratings[agentKey] = ratings[agentKey] || { sum: 0, count: 0 };
      ratings[agentKey].sum += response.rating;
      ratings[agentKey].count += 1;
    });
    if (responses.length < 25) break;
  }
  return ratings;
}

const fetchPeriod = async () => {
  periodRequest += 1;
  const request = periodRequest;
  const { since, until, groupBy } = periodRange(period.value);
  const { type, id } = dimension.value;
  const previousSince = since - (until - since);
  const peakSince = until - PEAK_DAYS * SECONDS_PER_DAY;
  const series = metric =>
    ReportsAPI.getReports({
      metric,
      from: since,
      to: until,
      type,
      id,
      groupBy,
    });

  const [
    summaryResponse,
    openedResponse,
    resolvedResponse,
    csatResponse,
    previousCsatResponse,
    inboxResponse,
    teamResponse,
    agentResponse,
    peakResponse,
  ] = await Promise.all([
    ReportsAPI.getSummary(since, until, type, id, groupBy),
    series('conversations_count'),
    series('resolutions_count'),
    CSATReportsAPI.getMetrics({
      from: since,
      to: until,
      ...csatFilters(dimension.value),
    }),
    CSATReportsAPI.getMetrics({
      from: previousSince,
      to: since,
      ...csatFilters(dimension.value),
    }),
    SummaryReportsAPI.getInboxReports({
      since,
      until,
      userId: type === 'agent' ? id : undefined,
    }),
    SummaryReportsAPI.getTeamReports({ since, until }),
    SummaryReportsAPI.getAgentReports({
      since,
      until,
      inboxId: type === 'inbox' ? id : undefined,
    }),
    ReportsAPI.getReports({
      metric: 'conversations_count',
      from: peakSince,
      to: until,
      type,
      id,
      groupBy: 'hour',
    }),
  ]);
  if (request !== periodRequest) {
    return;
  }
  summary.value = summaryResponse.data;
  buckets.value = buildBuckets(
    openedResponse.data,
    resolvedResponse.data,
    groupBy
  );
  csat.value = {
    current: csatScore(csatResponse.data),
    previous: csatScore(previousCsatResponse.data),
  };
  channelRows.value = inboxResponse.data;
  teamRows.value = teamResponse.data;
  agentSummary.value = agentResponse.data;
  peakGrid.value = heatmapGrid(peakResponse.data);
  agentRatings.value = await fetchAgentRatings(since, until);
};

const fetchMyTasks = async () => {
  const { data } = await GtiTasksAPI.list({
    status: 'pending',
    assignee: 'me',
  });
  myTasks.value = data.payload || [];
};

const previous = computed(() => summary.value.previous || {});
const kpis = computed(() => [
  {
    key: 'conversations',
    value: summary.value.conversations_count ?? 0,
    previous: previous.value.conversations_count,
    higherIsBetter: true,
  },
  {
    key: 'resolved',
    value: summary.value.resolutions_count ?? 0,
    previous: previous.value.resolutions_count,
    higherIsBetter: true,
  },
  {
    key: 'incoming',
    value: summary.value.incoming_messages_count ?? 0,
    previous: previous.value.incoming_messages_count,
    higherIsBetter: true,
  },
  {
    key: 'first_response',
    value: summary.value.avg_first_response_time,
    previous: previous.value.avg_first_response_time,
    higherIsBetter: false,
    duration: true,
  },
  {
    key: 'reply_time',
    value: summary.value.reply_time,
    previous: previous.value.reply_time,
    higherIsBetter: false,
    duration: true,
  },
  {
    key: 'resolution',
    value: summary.value.avg_resolution_time,
    previous: previous.value.avg_resolution_time,
    higherIsBetter: false,
    duration: true,
  },
]);
const kpiDisplay = kpi =>
  kpi.duration ? formatDuration(kpi.value) : kpi.value;
const csatDisplay = computed(() =>
  csat.value.current === null ? '—' : `${csat.value.current}%`
);
const csatDelta = computed(() => {
  if (csat.value.current === null || csat.value.previous === null) {
    return null;
  }
  return csat.value.current - csat.value.previous;
});

const channelBars = computed(() => {
  const totals = channelTotals(channelRows.value, inboxes.value);
  const sum = totals.reduce((total, entry) => total + entry.value, 0) || 1;
  return totals.map((entry, index) => ({
    key: entry.key,
    label: t(`GTI_PANEL.CHANNELS.${entry.key}`),
    value: entry.value,
    display: `${Math.round((entry.value / sum) * 100)}%`,
    color: seriesColor(index),
  }));
});
const teamBars = computed(() =>
  namedTotals(teamRows.value, teams.value)
    .filter(entry => teamId.value === ALL || entry.id === teamId.value)
    .map((entry, index) => ({
      key: entry.id,
      label: entry.name,
      value: entry.value,
      color: seriesColor(index),
    }))
);

const agentTableRows = computed(() =>
  agentRows(
    agentSummary.value,
    byAgentLive.value.map(row => ({ id: row.assignee_id, metric: row })),
    agents.value
  )
    .filter(row => agentId.value === ALL || row.id === agentId.value)
    .map(row => {
      const rating = agentRatings.value[row.id];
      return { ...row, rating: rating ? rating.sum / rating.count : null };
    })
);

const openMonitor = () => {
  router.push({ name: 'gti_monitor' });
};

const { startRefetching } = useLiveRefresh(fetchNow, NOW_REFRESH_MS);

watch([period, dimension], fetchPeriod);

onMounted(() => {
  store.dispatch('agents/get');
  store.dispatch('teams/get');
  fetchNow();
  startRefetching();
  fetchPeriod();
  fetchMyTasks();
});
</script>

<template>
  <div
    class="flex flex-col w-full h-full gap-3 px-4 py-5 overflow-y-auto bg-n-background text-n-slate-12"
  >
    <header class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h1 class="m-0 text-2xl font-semibold">{{ t('GTI_PANEL.TITLE') }}</h1>
        <p class="m-0 text-sm text-n-slate-11">
          {{ t('GTI_PANEL.SUBTITLE', { period: periodLabel.toLowerCase() }) }}
        </p>
      </div>
      <span
        class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-n-teal-3 text-n-teal-11"
      >
        <i class="rounded-full size-2 bg-n-teal-9 animate-pulse" />
        {{ t('GTI_PANEL.LIVE') }}
      </span>
    </header>

    <div class="flex flex-wrap items-center gap-2">
      <Select
        v-model="period"
        :options="periodOptions"
        :aria-label="t('GTI_PANEL.FILTERS.PERIOD')"
      />
      <Select
        v-model="teamId"
        :options="teamOptions"
        :aria-label="t('GTI_PANEL.FILTERS.QUEUE')"
      />
      <Select
        v-model="inboxId"
        :options="inboxOptions"
        :aria-label="t('GTI_PANEL.FILTERS.CONNECTION')"
      />
      <Select
        v-model="agentId"
        :options="agentOptions"
        :aria-label="t('GTI_PANEL.FILTERS.AGENT')"
      />
      <span class="flex-1" />
      <Button
        :label="t('GTI_PANEL.MONITOR_MODE')"
        icon="i-lucide-monitor"
        color="slate"
        size="sm"
        @click="openMonitor"
      />
    </div>

    <h2
      class="m-0 mt-2 text-xs font-semibold tracking-wide uppercase text-n-slate-11"
    >
      {{ t('GTI_PANEL.SECTIONS.NOW') }}
    </h2>
    <section class="grid gap-3 grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">
      <PanelDonutCard
        :title="t('GTI_PANEL.NOW.AGENTS_ONLINE')"
        :value="`${statusCounts.online}/${agents.length}`"
        :parts="statusParts"
      />
      <PanelDonutCard
        :title="
          t('GTI_PANEL.NOW.WAITING', {
            longest: waiting.length ? formatWait(longestWait) : '—',
          })
        "
        :value="waitingTotal"
        :parts="waitingParts"
      />
      <PanelDonutCard
        :title="t('GTI_PANEL.NOW.ATTENDING')"
        :value="attendingTotal"
        :parts="attendingParts"
      />
      <div
        class="flex flex-col gap-1 p-3 min-w-0 rounded-xl bg-n-solid-2 outline outline-1 outline-n-container"
        :class="{ 'border-s-4 border-n-ruby-9': lateEntries.length }"
      >
        <span class="text-xs text-n-slate-11">
          {{
            lateEntries.length
              ? t('GTI_PANEL.NOW.LATE_TITLE')
              : t('GTI_PANEL.NOW.ON_TIME_TITLE')
          }}
        </span>
        <b
          class="text-xl leading-tight tabular-nums"
          :class="lateEntries.length ? 'text-n-ruby-11' : 'text-n-slate-12'"
        >
          {{ lateEntries.length }}
        </b>
        <div
          v-for="entry in lateEntries.slice(0, LATE_LIST_SIZE)"
          :key="entry.id"
          class="flex justify-between gap-2 py-0.5 text-xs border-b border-dashed border-n-weak"
        >
          <span class="truncate">
            {{
              t('GTI_PANEL.NOW.LATE_ENTRY', {
                name: entry.name,
                queue: entry.team,
              })
            }}
          </span>
          <span class="font-bold tabular-nums whitespace-nowrap text-n-ruby-11">
            {{ formatWait(entry.seconds) }}
          </span>
        </div>
        <span v-if="!lateEntries.length" class="text-xs text-n-slate-11">
          {{ t('GTI_PANEL.NOW.ON_TIME') }}
        </span>
      </div>
      <router-link
        :to="{ name: 'gti_tasks' }"
        class="flex flex-col gap-1 p-3 min-w-0 rounded-xl bg-n-solid-2 outline outline-1 outline-n-container border-s-4 border-n-gti-blue text-n-slate-12 hover:bg-n-alpha-1"
      >
        <span class="text-xs text-n-slate-11">
          {{ t('GTI_PANEL.NOW.MY_TASKS') }}
        </span>
        <b class="text-xl leading-tight tabular-nums">{{ myTasks.length }}</b>
        <div
          v-for="task in myTasks.slice(0, TASKS_IN_CARD)"
          :key="task.id"
          class="flex justify-between gap-2 py-0.5 text-xs border-b border-dashed border-n-weak"
        >
          <span class="truncate">{{ task.title }}</span>
          <span
            v-if="task.due_at"
            class="tabular-nums whitespace-nowrap text-n-slate-11"
          >
            {{ taskDueFormat.format(task.due_at * 1000) }}
          </span>
        </div>
        <span v-if="!myTasks.length" class="text-xs text-n-slate-11">
          {{ t('GTI_PANEL.NOW.NO_TASKS') }}
        </span>
      </router-link>
    </section>

    <h2
      class="m-0 mt-2 text-xs font-semibold tracking-wide uppercase text-n-slate-11"
    >
      {{ t('GTI_PANEL.SECTIONS.PERIOD', { period: periodLabel }) }}
    </h2>
    <section class="grid gap-3 grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
      <PanelKpiCard
        v-for="kpi in kpis"
        :key="kpi.key"
        :label="t(`GTI_PANEL.KPI.${kpi.key.toUpperCase()}`)"
        :value="kpiDisplay(kpi)"
        :delta="deltaPercent(kpi.value, kpi.previous)"
        :higher-is-better="kpi.higherIsBetter"
      />
      <PanelKpiCard
        :label="t('GTI_PANEL.KPI.CSAT')"
        :value="csatDisplay"
        :delta="csatDelta"
      />
    </section>

    <h2
      class="m-0 mt-2 text-xs font-semibold tracking-wide uppercase text-n-slate-11"
    >
      {{ t('GTI_PANEL.SECTIONS.VOLUME') }}
    </h2>
    <section class="grid gap-3 lg:grid-cols-2">
      <PanelBarList
        :title="t('GTI_PANEL.CHANNELS.TITLE')"
        :subtitle="t('GTI_PANEL.CHANNELS.SUBTITLE')"
        :rows="channelBars"
        :empty-label="t('GTI_PANEL.EMPTY')"
      />
      <PanelBarList
        :title="t('GTI_PANEL.QUEUES.TITLE')"
        :subtitle="t('GTI_PANEL.QUEUES.SUBTITLE')"
        :rows="teamBars"
        :empty-label="t('GTI_PANEL.EMPTY')"
      />
    </section>
    <section class="grid gap-3">
      <div
        class="flex flex-col p-4 min-w-0 rounded-xl bg-n-solid-2 outline outline-1 outline-n-container"
      >
        <h4 class="m-0 text-sm font-semibold">
          {{ t('GTI_PANEL.PEAK.TITLE') }}
        </h4>
        <p class="m-0 mt-0.5 mb-3 text-xs text-n-slate-11">
          {{ t('GTI_PANEL.PEAK.SUBTITLE', { days: PEAK_DAYS }) }}
        </p>
        <PanelHeatmap :grid="peakGrid" :weekdays="weekdays" />
      </div>
    </section>

    <h2
      class="m-0 mt-2 text-xs font-semibold tracking-wide uppercase text-n-slate-11"
    >
      {{ t('GTI_PANEL.SECTIONS.AGENTS') }}
    </h2>
    <PanelAgentsTable :rows="agentTableRows" />

    <section class="grid gap-3">
      <div
        class="flex flex-col p-4 min-w-0 rounded-xl bg-n-solid-2 outline outline-1 outline-n-container"
      >
        <h4 class="m-0 text-sm font-semibold">
          {{ t('GTI_PANEL.VOLUME.TITLE') }}
        </h4>
        <p class="m-0 mt-0.5 mb-3 text-xs text-n-slate-11">
          {{
            period === PANEL_PERIODS.TODAY
              ? t('GTI_PANEL.VOLUME.BY_HOUR')
              : t('GTI_PANEL.VOLUME.BY_DAY')
          }}
        </p>
        <PanelLineChart :buckets="buckets" />
      </div>
    </section>
  </div>
</template>
