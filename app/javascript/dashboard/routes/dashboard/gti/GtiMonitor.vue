<script setup>
// GTI "Work" TV monitor: a static, auto-refreshing screen for a wall monitor
// that shows who is waiting in each queue and for how long.
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useMapGetter } from 'dashboard/composables/store';
import ConversationApi from 'dashboard/api/inbox/conversation';
import Button from 'dashboard/components-next/button/Button.vue';
import wootConstants from 'dashboard/constants/globals';
import { dateTimeFormat } from 'shared/helpers/localizedDate';
import {
  formatWait,
  groupWaitingByTeam,
  isLate,
  longestWait,
} from 'dashboard/helper/gtiMonitor';

const REFRESH_MS = 15000;
const CLOCK_MS = 1000;
const MS_PER_SECOND = 1000;

const { t } = useI18n();
const store = useStore();
const teams = useMapGetter('teams/getTeams');
const agents = useMapGetter('agents/getAgents');

const rootRef = ref(null);
const waitingConversations = ref([]);
const openCount = ref(0);
const now = ref(Date.now());
let refreshTimer = null;
let clockTimer = null;

const nowSeconds = computed(() => Math.floor(now.value / MS_PER_SECOND));
const clockFormat = dateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const clock = computed(() => clockFormat.format(now.value));

const columns = computed(() =>
  groupWaitingByTeam(
    waitingConversations.value,
    teams.value,
    nowSeconds.value,
    t('GTI.MONITOR.NO_QUEUE')
  )
);
const longest = computed(() => longestWait(columns.value));
const lateCount = computed(
  () =>
    columns.value
      .flatMap(column => column.waiting)
      .filter(entry => isLate(entry.seconds)).length
);
const onlineAgents = computed(() =>
  agents.value.filter(agent => agent.availability_status === 'online')
);

const refresh = async () => {
  const {
    data: { data },
  } = await ConversationApi.get({
    status: wootConstants.STATUS_TYPE.OPEN,
    assigneeType: wootConstants.ASSIGNEE_TYPE.UNASSIGNED,
    sortBy: wootConstants.SORT_BY_TYPE.WAITING_SINCE_ASC,
    page: 1,
  });
  waitingConversations.value = data.payload;
  openCount.value = data.meta.all_count - data.meta.unassigned_count;
};

const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    rootRef.value?.requestFullscreen?.();
  }
};

onMounted(() => {
  store.dispatch('teams/get');
  store.dispatch('agents/get');
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
    class="dark flex flex-col w-full h-full gap-4 p-5 overflow-y-auto bg-n-background text-n-slate-12"
  >
    <header class="flex flex-wrap items-center gap-4">
      <h1 class="flex-1 m-0 text-2xl font-semibold">
        {{ t('GTI.MONITOR.TITLE') }}
      </h1>
      <span class="text-3xl font-bold tabular-nums">{{ clock }}</span>
      <Button
        :label="t('GTI.MONITOR.FULLSCREEN')"
        icon="i-lucide-maximize"
        color="slate"
        size="sm"
        @click="toggleFullscreen"
      />
    </header>

    <section class="grid gap-3 grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
      <div class="p-4 rounded-xl bg-n-solid-2 border-t-4 border-n-amber-9">
        <span class="text-sm text-n-slate-11">{{
          t('GTI.MONITOR.WAITING')
        }}</span>
        <b class="block text-4xl tabular-nums">{{
          waitingConversations.length
        }}</b>
      </div>
      <div class="p-4 rounded-xl bg-n-solid-2 border-t-4 border-n-brand">
        <span class="text-sm text-n-slate-11">{{
          t('GTI.MONITOR.ATTENDING')
        }}</span>
        <b class="block text-4xl tabular-nums">{{ openCount }}</b>
      </div>
      <div class="p-4 rounded-xl bg-n-solid-2 border-t-4 border-n-ruby-9">
        <span class="text-sm text-n-slate-11">{{
          t('GTI.MONITOR.LONGEST')
        }}</span>
        <b
          class="block text-4xl tabular-nums"
          :class="{ 'text-n-ruby-11 animate-pulse': isLate(longest) }"
        >
          {{
            waitingConversations.length
              ? formatWait(longest)
              : t('GTI.MONITOR.NONE')
          }}
        </b>
      </div>
      <div class="p-4 rounded-xl bg-n-solid-2 border-t-4 border-n-teal-9">
        <span class="text-sm text-n-slate-11">{{
          t('GTI.MONITOR.ONLINE')
        }}</span>
        <b class="block text-4xl tabular-nums">
          {{
            t('GTI.MONITOR.RATIO', {
              online: onlineAgents.length,
              total: agents.length,
            })
          }}
        </b>
      </div>
      <div class="p-4 rounded-xl bg-n-solid-2 border-t-4 border-n-ruby-9">
        <span class="text-sm text-n-slate-11">{{ t('GTI.MONITOR.LATE') }}</span>
        <b class="block text-4xl tabular-nums">{{ lateCount }}</b>
      </div>
    </section>

    <section
      class="grid flex-1 gap-3 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]"
    >
      <div
        v-for="column in columns"
        :key="column.id ?? 'none'"
        class="flex flex-col overflow-hidden rounded-xl bg-n-solid-2"
      >
        <h2
          class="flex justify-between gap-2 px-4 py-3 m-0 text-lg font-semibold border-b-4 border-n-brand"
        >
          {{ column.name }}
          <span class="text-n-slate-11">
            {{
              t('GTI.MONITOR.WAITING_COUNT', { count: column.waiting.length })
            }}
          </span>
        </h2>
        <p
          v-if="!column.waiting.length"
          class="px-4 py-3 m-0 text-base text-n-slate-10"
        >
          {{ t('GTI.MONITOR.NOBODY_WAITING') }}
        </p>
        <div
          v-for="entry in column.waiting"
          :key="entry.id"
          class="flex justify-between gap-3 px-4 py-2.5 text-lg border-b border-n-weak"
        >
          <span class="truncate">{{ entry.name }}</span>
          <span
            class="font-bold whitespace-nowrap tabular-nums"
            :class="{ 'text-n-ruby-11 animate-pulse': isLate(entry.seconds) }"
          >
            {{ formatWait(entry.seconds) }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>
