<script setup>
// GTI "Filas & Chatbot": the welcome menu preview and the queue table of the
// prototype. Editing a queue opens Chatwoot's team page (with the GTI greeting).
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import Button from 'dashboard/components-next/button/Button.vue';
import GtiPage from 'dashboard/components/widgets/gti/pages/GtiPage.vue';
import GtiTeamMembersAPI from 'dashboard/api/gtiTeamMembers';
import { useGtiTeamColors } from 'dashboard/composables/useGtiTeamColors';
import {
  GTI_TABLE_CARD,
  GTI_TD,
  GTI_TH,
  gtiTruncate,
  gtiWelcomeMenu,
} from 'dashboard/helper/gtiPages';

const { t } = useI18n();
const store = useStore();
const route = useRoute();
const router = useRouter();
const teams = useMapGetter('teams/getTeams');
const getAccount = useMapGetter('accounts/getAccount');
const { settingsByTeam, loadTeamSettings, colorOf } = useGtiTeamColors();
const membersByTeam = ref({});

const accountName = computed(
  () => getAccount.value(route.params.accountId)?.name || ''
);
const menu = computed(() => gtiWelcomeMenu(teams.value));

const loadMembers = async () => {
  const entries = await Promise.all(
    teams.value.map(async team => {
      const { data } = await GtiTeamMembersAPI.list(team.id);
      return [
        team.id,
        data.map(member => member.available_name || member.name),
      ];
    })
  );
  membersByTeam.value = Object.fromEntries(entries);
};

onMounted(async () => {
  await store.dispatch('teams/get');
  await Promise.all([loadTeamSettings(teams.value), loadMembers()]);
});

const editTeam = team =>
  router.push({
    name: 'settings_teams_edit',
    params: { accountId: route.params.accountId, teamId: team.id },
  });
const addTeam = () =>
  router.push({
    name: 'settings_teams_new',
    params: { accountId: route.params.accountId },
  });
</script>

<template>
  <GtiPage
    :title="t('GTI_PAGES.QUEUES.TITLE')"
    :subtitle="t('GTI_PAGES.QUEUES.SUBTITLE')"
  >
    <template #toolbar>
      <Button
        icon="i-lucide-plus"
        size="sm"
        :label="t('GTI_PAGES.QUEUES.ADD')"
        @click="addTeam"
      />
    </template>
    <div
      class="w-full max-w-lg p-4 mb-3.5 border rounded-[0.625rem] border-n-weak bg-n-solid-1 shadow-sm"
    >
      <b class="text-sm text-n-slate-12">{{ t('GTI_PAGES.QUEUES.WELCOME') }}</b>
      <div
        class="px-2.5 pt-1.5 pb-2 mt-2.5 text-sm border rounded-lg rounded-tl-none border-n-weak bg-n-gti-in dark:bg-n-gti-in-dark text-n-slate-12"
      >
        <p class="m-0">
          {{ t('GTI_PAGES.QUEUES.WELCOME_GREETING', { name: accountName }) }}
        </p>
        <p class="m-0">{{ t('GTI_PAGES.QUEUES.WELCOME_PROMPT') }}</p>
        <p v-for="item in menu" :key="item.option" class="m-0">
          <b>{{ item.option }}</b> – {{ item.name }}
        </p>
      </div>
    </div>
    <div :class="GTI_TABLE_CARD">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th :class="GTI_TH">{{ t('GTI_PAGES.QUEUES.QUEUE') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.QUEUES.OPTION') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.QUEUES.AGENTS') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.QUEUES.GREETING') }}</th>
            <th :class="GTI_TH" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(team, index) in teams" :key="team.id">
            <td :class="GTI_TD">
              <span
                class="px-[0.4375rem] py-px text-[0.65625rem] font-semibold text-white rounded whitespace-nowrap"
                :style="{ backgroundColor: colorOf(team, index) }"
              >
                {{ team.name }}
              </span>
            </td>
            <td :class="GTI_TD">{{ index + 1 }}</td>
            <td :class="GTI_TD">
              {{ (membersByTeam[team.id] || []).join(', ') || '—' }}
            </td>
            <td :class="GTI_TD" class="text-n-slate-11">
              {{
                gtiTruncate(settingsByTeam[team.id]?.greeting_message, 70) ||
                '—'
              }}
            </td>
            <td :class="GTI_TD">
              <div class="flex justify-end">
                <Button
                  v-tooltip.top="t('GTI_PAGES.EDIT')"
                  icon="i-lucide-pen"
                  size="xs"
                  color="slate"
                  variant="ghost"
                  @click="editTeam(team)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </GtiPage>
</template>
