<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { useElementSize } from '@vueuse/core';
import BackButton from '../BackButton.vue';
import InboxName from '../InboxName.vue';
import MoreActions from './MoreActions.vue';
import Avatar from 'next/avatar/Avatar.vue';
import SLACardLabel from './components/SLACardLabel.vue';
import ConversationCallButton from './ConversationCallButton.vue';
import wootConstants from 'dashboard/constants/globals';
import { conversationListPageURL } from 'dashboard/helper/URLHelper';
import { snoozedReopenTime } from 'dashboard/helper/snoozeHelpers';
import { useInbox } from 'dashboard/composables/useInbox';
import { useAlert } from 'dashboard/composables';
import { useI18n } from 'vue-i18n';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { useGtiClassicMode } from 'dashboard/helper/gtiMode';
import GtiConversationActions from '../gti/GtiConversationActions.vue';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { useMapGetter } from 'dashboard/composables/store';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import {
  gtiAvatarColor,
  gtiChannelBadge,
  gtiChannelName,
  gtiInitials,
  gtiTeamColor,
} from 'dashboard/helper/gtiTicketCard';

const props = defineProps({
  chat: {
    type: Object,
    default: () => ({}),
  },
  showBackButton: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
const store = useStore();
const route = useRoute();
const conversationHeader = ref(null);
const { width } = useElementSize(conversationHeader);
const { isAWebWidgetInbox, isAnEmailChannel } = useInbox();
const gtiClassicMode = useGtiClassicMode();
// Prototype header subline: "Atribuído a X · Fila · Canal".
const GTI_SEPARATOR = '·';
const { uiSettings, updateUISettings } = useUISettings();
const teams = useMapGetter('teams/getTeams');

const currentChat = computed(() => store.getters.getSelectedChat);
const accountId = computed(() => store.getters.getCurrentAccountId);

const chatMetadata = computed(() => props.chat.meta);

const backButtonUrl = computed(() => {
  const {
    params: { inbox_id: inboxId, label, teamId, id: customViewId },
    name,
  } = route;

  const conversationTypeMap = {
    conversation_through_mentions: 'mention',
    conversation_through_participating: 'participating',
    conversation_through_unattended: 'unattended',
  };
  return conversationListPageURL({
    accountId: accountId.value,
    inboxId,
    label,
    teamId,
    conversationType: conversationTypeMap[name],
    customViewId,
  });
});

const isHMACVerified = computed(() => {
  if (!isAWebWidgetInbox.value) {
    return true;
  }
  return chatMetadata.value.hmac_verified;
});

const mailSubject = computed(() => {
  if (!isAnEmailChannel.value) return '';
  return props.chat.additional_attributes?.mail_subject;
});

const currentContact = computed(() =>
  store.getters['contacts/getContact'](props.chat.meta.sender.id)
);

const isSnoozed = computed(
  () => currentChat.value.status === wootConstants.STATUS_TYPE.SNOOZED
);

const snoozedDisplayText = computed(() => {
  const { snoozed_until: snoozedUntil } = currentChat.value;
  if (snoozedUntil) {
    return `${t('CONVERSATION.HEADER.SNOOZED_UNTIL')} ${snoozedReopenTime(snoozedUntil)}`;
  }
  return t('CONVERSATION.HEADER.SNOOZED_UNTIL_NEXT_REPLY');
});

const inbox = computed(() => {
  const { inbox_id: inboxId } = props.chat;
  return store.getters['inboxes/getInbox'](inboxId);
});

const hasMultipleInboxes = computed(
  () => store.getters['inboxes/getInboxes'].length > 1
);

const hasSlaPolicyId = computed(
  () => props.chat?.applied_sla?.id && !currentContact.value?.blocked
);

// GTI "Work" subline: who is attending, the queue and the connection.
const gtiAssigneeText = computed(() => {
  const assignee = props.chat.meta?.assignee;
  return assignee
    ? t('GTI_CHAT.ASSIGNED_TO', { name: assignee.name })
    : t('GTI_CHAT.WAITING_AGENT');
});

// GTI header: queue in its own colour, channel badge on the avatar and an
// ⓘ button that opens the contact drawer.
const gtiTeamColorValue = computed(() => {
  const id = props.chat.meta?.team?.id;
  return gtiTeamColor((teams.value || []).find(team => team.id === id));
});
const gtiBadge = computed(() => gtiChannelBadge(inbox.value?.channel_type));
const toggleGtiContactDrawer = () => {
  updateUISettings({
    is_contact_sidebar_open: !uiSettings.value?.is_contact_sidebar_open,
  });
};

const copyConversationId = async () => {
  try {
    await copyTextToClipboard(String(props.chat.id));
    useAlert(t('CONVERSATION.HEADER.COPY_ID_SUCCESS'));
  } catch (error) {
    // error
  }
};
</script>

<template>
  <div
    ref="conversationHeader"
    class="flex flex-col gap-3 items-center justify-between flex-1 w-full min-w-0 xl:flex-row px-3"
    :class="
      gtiClassicMode
        ? 'pt-3 pb-2 h-24 xl:h-12'
        : 'py-2 h-auto xl:min-h-[3.875rem] border-b border-n-weak bg-n-solid-1'
    "
  >
    <div
      class="flex items-center justify-start w-full xl:w-auto max-w-full min-w-0 xl:flex-1"
    >
      <BackButton
        v-if="showBackButton"
        :back-url="backButtonUrl"
        class="me-2"
      />
      <div
        v-if="!gtiClassicMode"
        class="relative flex-shrink-0 size-[2.625rem]"
      >
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
          :class="gtiBadge.bg"
        >
          <span class="text-white size-2.5" :class="gtiBadge.icon" />
        </span>
      </div>
      <Avatar
        v-else
        :name="currentContact.name"
        :src="currentContact.thumbnail"
        :size="32"
        :status="currentContact.availability_status"
        hide-offline-status
      />
      <div class="flex flex-col items-start min-w-0 ms-2 overflow-hidden">
        <div class="flex flex-row items-center max-w-full gap-1 p-0 m-0">
          <span
            class="text-sm font-medium truncate leading-tight text-n-slate-12"
          >
            {{ currentContact.name }}
          </span>
          <fluent-icon
            v-if="!isHMACVerified"
            v-tooltip="$t('CONVERSATION.UNVERIFIED_SESSION')"
            size="14"
            class="text-n-amber-10 my-0 mx-0 min-w-[14px] flex-shrink-0"
            icon="warning"
          />
        </div>

        <div
          v-if="!gtiClassicMode"
          class="flex items-center max-w-full gap-1 overflow-hidden text-xs text-n-gti-muted whitespace-nowrap"
        >
          <span class="truncate">{{ gtiAssigneeText }}</span>
          <template v-if="chat.meta?.team">
            <span>{{ GTI_SEPARATOR }}</span>
            <span
              class="font-semibold truncate"
              :class="{ 'text-n-brand': !gtiTeamColorValue }"
              :style="gtiTeamColorValue ? { color: gtiTeamColorValue } : null"
            >
              {{ chat.meta.team.name }}
            </span>
          </template>
          <template v-if="gtiChannelName(inbox?.channel_type)">
            <span>{{ GTI_SEPARATOR }}</span>
            <span class="truncate">{{
              gtiChannelName(inbox?.channel_type)
            }}</span>
          </template>
        </div>
        <div
          v-else
          class="flex items-center max-w-full gap-1 overflow-hidden text-xs conversation--header--actions text-n-slate-11 text-ellipsis whitespace-nowrap"
        >
          <button
            type="button"
            class="truncate shrink-0 text-label-small text-n-slate-11 hover:text-n-slate-12 !p-0 cucursor-pointer"
            @click="copyConversationId"
          >
            {{ `#${chat.id}` }}
          </button>
          <span v-if="hasMultipleInboxes">•</span>
          <InboxName v-if="hasMultipleInboxes" :inbox="inbox" class="!mx-0" />
          <span v-if="mailSubject">•</span>
          <span
            v-if="mailSubject"
            v-tooltip="mailSubject"
            class="flex-1 min-w-16 truncate text-label-small text-n-slate-11"
          >
            {{ mailSubject }}
          </span>
          <span v-if="isSnoozed">•</span>
          <span
            v-if="isSnoozed"
            class="min-w-0 truncate font-medium text-n-amber-10 shrink-0"
          >
            {{ snoozedDisplayText }}
          </span>
        </div>
      </div>
    </div>
    <div
      class="flex flex-row items-center justify-start xl:justify-end flex-shrink-0 gap-2 w-full xl:w-auto header-actions-wrap"
    >
      <SLACardLabel
        v-if="hasSlaPolicyId"
        :chat="chat"
        show-extended-info
        :parent-width="width"
        class="hidden md:flex"
      />
      <GtiConversationActions v-if="!gtiClassicMode" :chat="currentChat" />
      <button
        v-if="!gtiClassicMode"
        v-tooltip.top="t('GTI_TICKETS.HEADER.CONTACT_INFO')"
        type="button"
        class="inline-flex items-center justify-center !p-0 !border !border-solid !rounded-md size-[2.125rem] border-n-gti-line bg-white text-n-gti-muted hover:text-n-gti-green"
        :aria-label="t('GTI_TICKETS.HEADER.CONTACT_INFO')"
        @click="toggleGtiContactDrawer"
      >
        <Icon icon="i-material-symbols-info" class="size-[1.125rem]" />
      </button>
      <ConversationCallButton :inbox="inbox" :chat="currentChat" />
      <MoreActions :conversation-id="currentChat.id" />
    </div>
  </div>
</template>
