<script setup>
// GTI "Usuários": the prototype's user table (name, role, queues, status),
// reusing Chatwoot's add / edit / delete agent flows.
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { picoSearch } from '@chatwoot/pico-search';
import { useAlert } from 'dashboard/composables';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import Avatar from 'next/avatar/Avatar.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import GtiPage from 'dashboard/components/widgets/gti/pages/GtiPage.vue';
import AddAgent from '../settings/agents/AddAgent.vue';
import EditAgent from '../settings/agents/EditAgent.vue';
import GtiTeamMembersAPI from 'dashboard/api/gtiTeamMembers';
import { useGtiTeamColors } from 'dashboard/composables/useGtiTeamColors';
import {
  GTI_TABLE_CARD,
  GTI_TD,
  GTI_TH,
  gtiAvailabilityDot,
} from 'dashboard/helper/gtiPages';

const { t } = useI18n();
const store = useStore();
const agents = useMapGetter('agents/getAgents');
const teams = useMapGetter('teams/getTeams');
const customRoles = useMapGetter('customRole/getCustomRoles');
const currentUserId = useMapGetter('getCurrentUserID');

const { loadTeamSettings, colorOf } = useGtiTeamColors();
const search = ref('');
const teamsByUser = ref({});
const showAdd = ref(false);
const showEdit = ref(false);
const showDelete = ref(false);
const current = ref({});

const filteredAgents = computed(() => {
  const query = search.value.trim();
  if (!query) return agents.value;
  return picoSearch(agents.value, query, ['name', 'email']);
});

const loadMemberships = async () => {
  const map = {};
  await Promise.all(
    teams.value.map(async (team, index) => {
      const { data } = await GtiTeamMembersAPI.list(team.id);
      const color = colorOf(team, index);
      data.forEach(member => {
        map[member.id] = [...(map[member.id] || []), { ...team, color }];
      });
    })
  );
  teamsByUser.value = map;
};

onMounted(async () => {
  store.dispatch('agents/get');
  store.dispatch('customRole/getCustomRole');
  await store.dispatch('teams/get');
  await loadTeamSettings(teams.value);
  loadMemberships();
});

const roleName = agent => {
  if (agent.custom_role_id) {
    return (
      customRoles.value.find(role => role.id === agent.custom_role_id)?.name ||
      ''
    );
  }
  return t(`AGENT_MGMT.AGENT_TYPES.${agent.role.toUpperCase()}`);
};

const availabilityLabel = status =>
  t(`GTI_PAGES.USERS.STATUS.${(status || 'offline').toUpperCase()}`);

const openEdit = agent => {
  current.value = agent;
  showEdit.value = true;
};
const closeEdit = () => {
  showEdit.value = false;
  loadMemberships();
};
const closeAdd = () => {
  showAdd.value = false;
  loadMemberships();
};
const openDelete = agent => {
  current.value = agent;
  showDelete.value = true;
};
const confirmDelete = async () => {
  showDelete.value = false;
  try {
    await store.dispatch('agents/delete', current.value.id);
    useAlert(t('AGENT_MGMT.DELETE.API.SUCCESS_MESSAGE'));
  } catch (error) {
    useAlert(t('AGENT_MGMT.DELETE.API.ERROR_MESSAGE'));
  }
};
</script>

<template>
  <GtiPage
    :title="t('GTI_PAGES.USERS.TITLE')"
    :subtitle="t('GTI_PAGES.USERS.SUBTITLE')"
  >
    <template #toolbar>
      <input
        v-model="search"
        type="search"
        class="!mb-0 max-w-xs !h-9 text-sm"
        :placeholder="t('GTI_PAGES.SEARCH')"
      />
      <Button
        icon="i-lucide-plus"
        size="sm"
        :label="t('GTI_PAGES.USERS.ADD')"
        @click="showAdd = true"
      />
    </template>
    <div :class="GTI_TABLE_CARD">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th :class="GTI_TH">{{ t('GTI_PAGES.USERS.NAME') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.USERS.ROLE') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.USERS.QUEUES') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.USERS.STATUS_HEADER') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.USERS.EMAIL') }}</th>
            <th :class="GTI_TH" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="agent in filteredAgents" :key="agent.id">
            <td :class="GTI_TD">
              <div class="flex items-center gap-2">
                <Avatar
                  :name="agent.name"
                  :src="agent.thumbnail"
                  :size="28"
                  rounded-full
                />
                <span class="font-medium">{{
                  agent.available_name || agent.name
                }}</span>
              </div>
            </td>
            <td :class="GTI_TD">{{ roleName(agent) }}</td>
            <td :class="GTI_TD">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="team in teamsByUser[agent.id] || []"
                  :key="team.id"
                  class="px-[0.4375rem] py-px text-[0.65625rem] font-semibold text-white rounded"
                  :style="{ backgroundColor: team.color }"
                >
                  {{ team.name }}
                </span>
              </div>
            </td>
            <td :class="GTI_TD">
              <span class="inline-flex items-center gap-1.5 text-xs">
                <span
                  class="rounded-full size-2"
                  :class="gtiAvailabilityDot(agent.availability_status)"
                />
                {{ availabilityLabel(agent.availability_status) }}
              </span>
            </td>
            <td :class="GTI_TD" class="text-n-slate-11">{{ agent.email }}</td>
            <td :class="GTI_TD">
              <div class="flex justify-end gap-1">
                <Button
                  v-if="agent.id !== currentUserId"
                  v-tooltip.top="t('GTI_PAGES.EDIT')"
                  icon="i-lucide-pen"
                  size="xs"
                  color="slate"
                  variant="ghost"
                  @click="openEdit(agent)"
                />
                <Button
                  v-if="agent.id !== currentUserId"
                  v-tooltip.top="t('GTI_PAGES.DELETE')"
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="ruby"
                  variant="ghost"
                  @click="openDelete(agent)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <woot-modal v-model:show="showAdd" :on-close="closeAdd">
      <AddAgent @close="closeAdd" />
    </woot-modal>
    <woot-modal v-model:show="showEdit" :on-close="closeEdit">
      <EditAgent
        v-if="showEdit"
        :id="current.id"
        :name="current.name"
        :provider="current.provider"
        :type="current.role"
        :email="current.email"
        :availability="current.availability_status"
        :custom-role-id="current.custom_role_id"
        @close="closeEdit"
      />
    </woot-modal>
    <woot-delete-modal
      v-model:show="showDelete"
      :on-close="() => (showDelete = false)"
      :on-confirm="confirmDelete"
      :title="t('AGENT_MGMT.DELETE.CONFIRM.TITLE')"
      :message="t('AGENT_MGMT.DELETE.CONFIRM.MESSAGE')"
      :message-value="` ${current.name}?`"
      :confirm-text="t('AGENT_MGMT.DELETE.CONFIRM.YES')"
      :reject-text="t('AGENT_MGMT.DELETE.CONFIRM.NO')"
    />
  </GtiPage>
</template>
