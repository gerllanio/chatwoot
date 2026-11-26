<script setup>
// GTI "Filas & Chatbot": the Ticketz-style menu of each WhatsApp connection.
// The customer gets the greeting followed by the numbered queues chosen here
// (Gti::QueueMenuService builds the same text the preview shows).
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import Switch from 'dashboard/components-next/switch/Switch.vue';
import GtiInboxSettingsAPI from 'dashboard/api/gtiInboxSettings';
import { gtiMenuTeamOrder, gtiQueueMenuText } from 'dashboard/helper/gtiPages';
import { dateTimeFormat } from 'shared/helpers/localizedDate';

const props = defineProps({
  inboxes: { type: Array, required: true },
  teams: { type: Array, required: true },
});

const PREVIEW_TIMEZONE = 'America/Sao_Paulo';
const INPUT_CLASS =
  'p-2 text-sm border rounded-lg border-n-weak bg-n-solid-1 text-n-slate-12';

const { t } = useI18n();
const inboxId = ref(null);
const form = ref(null);
const orderedTeams = ref([]);
const saving = ref(false);

const chosenTeams = computed(() =>
  orderedTeams.value.filter(team => form.value.team_ids.includes(team.id))
);
const previewTime = dateTimeFormat('pt-BR', {
  timeZone: PREVIEW_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
}).format(new Date());
const preview = computed(() =>
  gtiQueueMenuText(form.value.greeting_message, chosenTeams.value, {
    name: t('GTI_PAGES.QUEUES.MENU.PREVIEW_CONTACT'),
    time: previewTime,
  })
);

const load = async id => {
  form.value = null;
  const { data } = await GtiInboxSettingsAPI.get(id);
  form.value = {
    menu_enabled: data.menu_enabled,
    greeting_message: data.greeting_message || '',
    team_ids: data.team_ids,
    no_queue_timeout_minutes: data.no_queue_timeout_minutes,
    no_queue_team_id: data.no_queue_team_id,
  };
  orderedTeams.value = gtiMenuTeamOrder(props.teams, data.team_ids);
};

watch(
  () => props.inboxes,
  inboxes => {
    if (!inboxId.value && inboxes.length) inboxId.value = inboxes[0].id;
  },
  { immediate: true }
);
watch(inboxId, id => id && load(id));

const toggleTeam = team => {
  const ids = form.value.team_ids;
  form.value.team_ids = ids.includes(team.id)
    ? ids.filter(id => id !== team.id)
    : [...ids, team.id];
};

const move = (index, step) => {
  const teams = [...orderedTeams.value];
  [teams[index], teams[index + step]] = [teams[index + step], teams[index]];
  orderedTeams.value = teams;
};

const save = async () => {
  saving.value = true;
  try {
    const minutes = Number(form.value.no_queue_timeout_minutes) || null;
    await GtiInboxSettingsAPI.update(inboxId.value, {
      ...form.value,
      team_ids: chosenTeams.value.map(team => team.id),
      no_queue_timeout_minutes: minutes,
    });
    useAlert(t('GTI_PAGES.QUEUES.MENU.SAVED'));
  } catch {
    useAlert(t('GTI_PAGES.QUEUES.MENU.SAVE_ERROR'));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div
    class="w-full p-4 mb-3.5 border rounded-[0.625rem] border-n-weak bg-n-solid-1 shadow-sm"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <b class="text-sm text-n-slate-12">
        {{ t('GTI_PAGES.QUEUES.MENU.TITLE') }}
      </b>
      <label
        v-if="inboxes.length"
        class="flex items-center gap-2 text-sm text-n-slate-11"
      >
        {{ t('GTI_PAGES.QUEUES.MENU.CONNECTION') }}
        <select v-model="inboxId" :class="INPUT_CLASS">
          <option v-for="inbox in inboxes" :key="inbox.id" :value="inbox.id">
            {{ inbox.name }}
          </option>
        </select>
      </label>
    </div>
    <p v-if="!inboxes.length" class="mt-3 mb-0 text-sm text-n-slate-11">
      {{ t('GTI_PAGES.QUEUES.MENU.NO_CONNECTIONS') }}
    </p>
    <div v-else-if="form" class="grid gap-5 mt-4 lg:grid-cols-2">
      <div class="flex flex-col gap-4">
        <div>
          <label class="flex items-center gap-2 text-sm text-n-slate-12">
            <Switch v-model="form.menu_enabled" />
            {{ t('GTI_PAGES.QUEUES.MENU.ENABLED') }}
          </label>
          <p class="mt-1 mb-0 text-xs text-n-slate-10">
            {{ t('GTI_PAGES.QUEUES.MENU.ENABLED_HINT') }}
          </p>
        </div>
        <label class="flex flex-col gap-1 text-sm text-n-slate-12">
          {{ t('GTI_PAGES.QUEUES.MENU.GREETING') }}
          <textarea
            v-model="form.greeting_message"
            rows="5"
            class="w-full resize-y"
            :class="INPUT_CLASS"
            :placeholder="t('GTI_PAGES.QUEUES.MENU.GREETING_PLACEHOLDER')"
          />
          <span class="text-xs text-n-slate-10">
            {{ t('GTI_PAGES.QUEUES.MENU.VARIABLES') }}
          </span>
        </label>
        <div>
          <span class="text-sm text-n-slate-12">
            {{ t('GTI_PAGES.QUEUES.MENU.QUEUES') }}
          </span>
          <p class="mt-0.5 mb-1.5 text-xs text-n-slate-10">
            {{ t('GTI_PAGES.QUEUES.MENU.QUEUES_HINT') }}
          </p>
          <ul class="p-0 m-0 list-none border rounded-lg border-n-weak">
            <li
              v-for="(team, index) in orderedTeams"
              :key="team.id"
              class="flex items-center gap-2 px-2.5 py-1.5 border-b last:border-b-0 border-n-weak"
            >
              <input
                type="checkbox"
                :checked="form.team_ids.includes(team.id)"
                @change="toggleTeam(team)"
              />
              <span class="flex-1 text-sm text-n-slate-12">{{
                team.name
              }}</span>
              <Button
                v-tooltip.top="t('GTI_PAGES.QUEUES.MENU.MOVE_UP')"
                icon="i-lucide-chevron-up"
                size="xs"
                color="slate"
                variant="ghost"
                :disabled="index === 0"
                @click="move(index, -1)"
              />
              <Button
                v-tooltip.top="t('GTI_PAGES.QUEUES.MENU.MOVE_DOWN')"
                icon="i-lucide-chevron-down"
                size="xs"
                color="slate"
                variant="ghost"
                :disabled="index === orderedTeams.length - 1"
                @click="move(index, 1)"
              />
            </li>
          </ul>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm text-n-slate-12">
          {{ t('GTI_PAGES.QUEUES.MENU.TIMEOUT') }}
          <input
            v-model="form.no_queue_timeout_minutes"
            type="number"
            min="1"
            max="1440"
            class="w-20"
            :class="INPUT_CLASS"
          />
          {{ t('GTI_PAGES.QUEUES.MENU.TIMEOUT_MINUTES') }}
          <select v-model="form.no_queue_team_id" :class="INPUT_CLASS">
            <option :value="null">
              {{ t('GTI_PAGES.QUEUES.MENU.TIMEOUT_NONE') }}
            </option>
            <option v-for="team in teams" :key="team.id" :value="team.id">
              {{ team.name }}
            </option>
          </select>
        </div>
        <div>
          <Button
            icon="i-lucide-save"
            size="sm"
            :label="t('GTI_PAGES.QUEUES.MENU.SAVE')"
            :is-loading="saving"
            @click="save"
          />
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-sm text-n-slate-12">
          {{ t('GTI_PAGES.QUEUES.MENU.PREVIEW') }}
        </span>
        <div class="p-4 rounded-lg bg-n-slate-3">
          <div
            class="max-w-sm px-2.5 pt-1.5 pb-2 text-sm whitespace-pre-wrap break-words border rounded-lg rounded-tr-none ms-auto border-n-weak bg-n-gti-out dark:bg-n-gti-out-dark text-n-slate-12"
          >
            {{ preview }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
