<script setup>
// GTI "Work": the prototype ticket card (ticketCard() in the approved
// prototype). Queue stripe, avatar with channel badge, name and time, last
// message, unread pill and the queue / connection / agent / tag chips with the
// ✕ 👁 ✓ actions at the end of the row.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { getLastMessage } from 'dashboard/helper/conversationHelper';
import { isGtiActiveConversation } from 'dashboard/helper/gtiTicketTabs';
import {
  gtiAvatarColor,
  gtiCardTime,
  gtiChannelBadge,
  gtiInitials,
  gtiTeamColor,
} from 'dashboard/helper/gtiTicketCard';
import MessagePreview from '../conversation/MessagePreview.vue';
import GtiCardActions from './GtiCardActions.vue';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox.vue';

const props = defineProps({
  chat: { type: Object, required: true },
  currentContact: { type: Object, required: true },
  assignee: { type: Object, default: () => ({}) },
  inbox: { type: Object, default: () => ({}) },
  selected: { type: Boolean, default: false },
  isActiveChat: { type: Boolean, default: false },
  typingPreview: { type: String, default: '' },
  hasGroupActivity: { type: Boolean, default: false },
});

const emit = defineEmits(['selectConversation', 'deSelectConversation']);

const { t } = useI18n();
const teams = useMapGetter('teams/getTeams');
const labelsList = useMapGetter('labels/getLabels');

const OUTGOING = 1;

const team = computed(() => {
  const embedded = props.chat.meta?.team;
  if (!embedded) return null;
  return (teams.value || []).find(item => item.id === embedded.id) || embedded;
});
const teamColor = computed(() => gtiTeamColor(team.value));
const badge = computed(() => gtiChannelBadge(props.inbox.channel_type));
const lastMessage = computed(() => getLastMessage(props.chat));
const time = computed(() =>
  gtiCardTime(props.chat.timestamp || props.chat.created_at)
);
const unreadCount = computed(() => props.chat.unread_count || 0);
const labels = computed(() =>
  (props.chat.labels || []).map(title => {
    const label = (labelsList.value || []).find(item => item.title === title);
    return { title, color: label?.color || '' };
  })
);

const selectedModel = computed({
  get: () => props.selected,
  set: checked => {
    if (checked) emit('selectConversation', props.chat.id, props.inbox.id);
    else emit('deSelectConversation', props.chat.id);
  },
});
</script>

<template>
  <div
    class="relative flex gap-2.5 py-2.5 pe-3 ps-2 border-b border-s-4 cursor-pointer border-b-n-weak group"
    :class="[
      isActiveChat
        ? 'bg-n-gti-soft dark:bg-n-gti-soft-dark'
        : 'hover:bg-n-alpha-1',
      teamColor ? '' : 'border-s-transparent',
    ]"
    :style="teamColor ? { borderInlineStartColor: teamColor } : null"
  >
    <div class="relative flex-shrink-0 size-[2.625rem]">
      <img
        v-if="currentContact.thumbnail"
        :src="currentContact.thumbnail"
        :alt="currentContact.name"
        class="object-cover rounded-full size-full"
      />
      <span
        v-else
        class="flex items-center justify-center font-semibold text-white rounded-full size-full"
        :class="gtiAvatarColor(currentContact.id)"
      >
        {{ gtiInitials(currentContact.name) }}
      </span>
      <span
        class="absolute flex items-center justify-center border-2 rounded-full -end-1 -bottom-1 size-[1.125rem] border-n-solid-1"
        :class="badge.bg"
      >
        <span class="text-white size-2.5" :class="badge.icon" />
      </span>
      <label
        v-if="selected"
        class="absolute inset-0 flex items-center justify-center rounded-full backdrop-blur-[2px]"
        @click.stop
      >
        <Checkbox v-model="selectedModel" />
      </label>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <span
          class="flex-1 min-w-0 text-sm font-semibold truncate text-n-slate-12"
        >
          {{ currentContact.name }}
        </span>
        <span class="text-[0.6875rem] text-n-slate-11 tabular-nums">
          {{ time }}
        </span>
      </div>
      <div class="flex items-center gap-1.5">
        <span
          v-if="typingPreview"
          class="flex-1 min-w-0 text-[0.8125rem] truncate text-n-teal-11"
        >
          {{ typingPreview }}
        </span>
        <span
          v-else-if="lastMessage"
          class="flex flex-1 min-w-0 text-[0.8125rem] text-n-slate-11"
        >
          <span
            v-if="lastMessage.message_type === OUTGOING"
            class="flex-shrink-0 me-1"
          >
            {{ t('GTI_TICKETS.CARD.YOU') }}
          </span>
          <MessagePreview
            :message="lastMessage"
            :show-message-type="false"
            class="flex-1 min-w-0 truncate"
          />
        </span>
        <span v-else class="flex-1 text-[0.8125rem] text-n-slate-10">
          {{ t('GTI_TICKETS.CARD.NO_MESSAGES') }}
        </span>
        <span
          v-if="unreadCount"
          class="px-1.5 text-[0.6875rem] font-semibold leading-[1.125rem] text-white rounded-full bg-n-teal-9"
        >
          {{ unreadCount }}
        </span>
        <span
          v-else-if="hasGroupActivity"
          class="rounded-full size-2 bg-n-teal-9"
        />
      </div>
      <div class="flex flex-wrap items-center gap-1 mt-1.5">
        <span
          v-if="team"
          class="px-1.5 text-[0.65625rem] font-semibold leading-4 text-white rounded whitespace-nowrap"
          :class="{ 'bg-n-gti-green': !teamColor }"
          :style="teamColor ? { backgroundColor: teamColor } : null"
        >
          {{ team.name }}
        </span>
        <span
          v-if="inbox.name"
          class="px-1.5 text-[0.65625rem] font-semibold leading-4 border rounded whitespace-nowrap bg-n-slate-2 text-n-slate-11 border-n-weak"
        >
          {{ inbox.name }}
        </span>
        <span
          v-if="assignee.name"
          class="px-1.5 text-[0.65625rem] font-semibold leading-4 border rounded whitespace-nowrap bg-n-slate-2 text-n-slate-11 border-n-weak"
        >
          {{ t('GTI_TICKETS.CARD.AGENT', { name: assignee.name }) }}
        </span>
        <span
          v-for="label in labels"
          :key="label.title"
          class="px-1.5 text-[0.65625rem] font-semibold leading-4 text-white rounded whitespace-nowrap"
          :class="{ 'bg-n-slate-9': !label.color }"
          :style="label.color ? { backgroundColor: label.color } : null"
        >
          {{ label.title }}
        </span>
        <GtiCardActions
          v-if="isGtiActiveConversation(chat)"
          :chat="chat"
          :contact="currentContact"
          :inbox="inbox"
          class="ms-auto"
        />
      </div>
    </div>
  </div>
</template>
