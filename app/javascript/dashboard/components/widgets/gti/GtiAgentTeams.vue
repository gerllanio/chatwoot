<script setup>
// "Filas que pode atender": queue (team) checkboxes in the user form.
// The parent calls save(userId) after saving the user itself.
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import GtiTeamMembersAPI from 'dashboard/api/gtiTeamMembers';
import { teamMembershipChanges } from 'dashboard/helper/gtiAgentTeams';

const props = defineProps({
  userId: { type: Number, default: null },
});

const { t } = useI18n();
const store = useStore();
const teams = useMapGetter('teams/getTeams');
const selected = ref([]);
const current = ref([]);
const loading = ref(false);

const loadMembership = async () => {
  if (!props.userId) {
    return;
  }
  loading.value = true;
  const memberships = await Promise.all(
    teams.value.map(async team => {
      const { data } = await GtiTeamMembersAPI.list(team.id);
      return data.some(member => member.id === props.userId) ? team.id : null;
    })
  );
  current.value = memberships.filter(Boolean);
  selected.value = [...current.value];
  loading.value = false;
};

onMounted(async () => {
  if (!teams.value.length) {
    await store.dispatch('teams/get');
  }
  await loadMembership();
});

const save = async userId => {
  const { toAdd, toRemove } = teamMembershipChanges(
    current.value,
    selected.value
  );
  await Promise.all([
    ...toAdd.map(teamId => GtiTeamMembersAPI.add(teamId, userId)),
    ...toRemove.map(teamId => GtiTeamMembersAPI.remove(teamId, userId)),
  ]);
  current.value = [...selected.value];
};

defineExpose({ save });
</script>

<template>
  <div v-if="teams.length" class="w-full mb-4">
    <span class="block mb-1 text-sm font-medium text-n-slate-12">
      {{ t('GTI_AGENT_TEAMS.LABEL') }}
    </span>
    <p class="mb-2 text-xs text-n-slate-11">
      {{ t('GTI_AGENT_TEAMS.HELP') }}
    </p>
    <div class="flex flex-wrap gap-2" :class="{ 'opacity-50': loading }">
      <label
        v-for="team in teams"
        :key="team.id"
        class="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg cursor-pointer border-n-weak hover:bg-n-alpha-1"
        :class="{
          'border-n-brand bg-n-brand/10 text-n-brand': selected.includes(
            team.id
          ),
        }"
      >
        <input
          v-model="selected"
          type="checkbox"
          class="!m-0"
          :value="team.id"
          :disabled="loading"
        />
        {{ team.name }}
      </label>
    </div>
  </div>
</template>
