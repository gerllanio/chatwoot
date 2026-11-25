<script setup>
// Ticketz-style extras on a conversation card: a coloured stripe on the start
// edge (the queue's colour, or the brand colour) and compact chips naming the
// queue (team), the connection (inbox) and who is attending it.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import Icon from 'dashboard/components-next/icon/Icon.vue';

const props = defineProps({
  chat: { type: Object, required: true },
  inbox: { type: Object, default: () => ({}) },
  assignee: { type: Object, default: () => ({}) },
});

const { t } = useI18n();
const teams = useMapGetter('teams/getTeams');

const CHIP_CLASS =
  'inline-flex items-center gap-1 max-w-[8rem] px-1.5 py-px rounded text-xxs font-medium leading-4 bg-n-slate-3 text-n-slate-11';

// The conversation payload embeds the team as it was when the list loaded;
// the teams store follows later renames and colour changes.
const team = computed(() => {
  const embedded = props.chat.meta?.team;
  if (!embedded) {
    return null;
  }
  const fromStore = (teams.value || []).find(item => item.id === embedded.id);
  return fromStore || embedded;
});

const teamColor = computed(() => team.value?.icon_color || '');
</script>

<template>
  <div class="flex flex-wrap items-center gap-1">
    <!-- Positioned against the card root (the nearest relative ancestor).
         The team colour is a user-chosen hex, so it can only be bound at runtime. -->
    <span
      class="absolute inset-y-0 start-0 w-1 pointer-events-none"
      :class="{ 'bg-n-brand': !teamColor }"
      :style="teamColor ? { backgroundColor: teamColor } : null"
      data-test-id="gti-card-stripe"
    />
    <span
      v-if="team"
      :class="CHIP_CLASS"
      :title="t('GTI.CARD.QUEUE')"
      data-test-id="gti-chip-team"
    >
      <span
        class="size-1.5 flex-shrink-0 rounded-full"
        :class="{ 'bg-n-brand': !teamColor }"
        :style="teamColor ? { backgroundColor: teamColor } : null"
      />
      <span class="truncate">{{ team.name }}</span>
    </span>
    <span
      v-if="inbox.name"
      :class="CHIP_CLASS"
      :title="t('GTI.CARD.CONNECTION')"
      data-test-id="gti-chip-inbox"
    >
      <Icon icon="i-lucide-plug" class="size-3 flex-shrink-0" />
      <span class="truncate">{{ inbox.name }}</span>
    </span>
    <span
      v-if="assignee.name"
      :class="CHIP_CLASS"
      :title="t('GTI.CARD.ASSIGNEE')"
      data-test-id="gti-chip-assignee"
    >
      <Icon icon="i-lucide-user-round" class="size-3 flex-shrink-0" />
      <span class="truncate">{{ assignee.name }}</span>
    </span>
  </div>
</template>
