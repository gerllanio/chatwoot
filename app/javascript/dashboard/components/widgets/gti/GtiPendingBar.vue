<script setup>
// GTI "Work": the prototype's bar in place of the composer while a ticket is
// waiting in its queue ("Aceitar atendimento") or already resolved.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAssignmentError } from 'dashboard/composables';
import { useGtiNotice } from 'dashboard/composables/useGtiNotice';
import { gtiTeamColor } from 'dashboard/helper/gtiTicketCard';
import wootConstants from 'dashboard/constants/globals';
import Button from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  chat: { type: Object, required: true },
});

const { t } = useI18n();
const store = useStore();
const currentUser = useMapGetter('getCurrentUser');
const teams = useMapGetter('teams/getTeams');
const sendGtiNotice = useGtiNotice();
const isBusy = ref(false);

const isResolved = computed(
  () => props.chat.status === wootConstants.STATUS_TYPE.RESOLVED
);
const team = computed(() => {
  const embedded = props.chat.meta?.team;
  if (!embedded) return null;
  return (teams.value || []).find(item => item.id === embedded.id) || embedded;
});
const teamColor = computed(() => gtiTeamColor(team.value));

const accept = async () => {
  isBusy.value = true;
  const { avatar_url: avatarUrl, ...user } = currentUser.value || {};
  try {
    await store.dispatch('assignAgent', {
      conversationId: props.chat.id,
      assignee: { ...user, thumbnail: avatarUrl },
      assigneeType: 'User',
    });
    await sendGtiNotice(props.chat.id, 'accepted');
  } catch (error) {
    useAssignmentError(error, t('GTI.TICKETS.ACCEPT_FAILED'));
  } finally {
    isBusy.value = false;
  }
};
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-center gap-3 p-3.5 text-sm border-t bg-n-solid-1 border-n-weak text-n-slate-11"
  >
    <template v-if="isResolved">
      {{ t('GTI_TICKETS.PENDING.RESOLVED') }}
    </template>
    <template v-else>
      {{ t('GTI_TICKETS.PENDING.WAITING') }}
      <span
        v-if="team"
        class="px-1.5 text-[0.65625rem] font-semibold leading-4 text-white rounded"
        :class="{ 'bg-n-gti-green': !teamColor }"
        :style="teamColor ? { backgroundColor: teamColor } : null"
      >
        {{ team.name }}
      </span>
      <Button
        :label="t('GTI_TICKETS.PENDING.ACCEPT')"
        icon="i-lucide-check"
        size="sm"
        :is-loading="isBusy"
        @click="accept"
      />
    </template>
  </div>
</template>
