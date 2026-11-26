<script setup>
// GTI "Work": "Ticket (opcional)" of the task dialog. A combobox that lists the
// active tickets (Atendendo and Aguardando) as small cards, searchable by name,
// phone or number; typing a number that is not listed still links that ticket.
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import ConversationApi from 'dashboard/api/inbox/conversation';
import wootConstants from 'dashboard/constants/globals';
import { getLastMessage } from 'dashboard/helper/conversationHelper';
import {
  gtiAvatarColor,
  gtiCardTime,
  gtiInitials,
  gtiTeamColor,
} from 'dashboard/helper/gtiTicketCard';

const props = defineProps({
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
});

const model = defineModel({ type: String, default: '' });

const MAX_RESULTS = 30;
const BLUR_DELAY_MS = 150;
const { STATUS_TYPE, ASSIGNEE_TYPE, SORT_BY_TYPE } = wootConstants;

const { t } = useI18n();
const teams = useMapGetter('teams/getTeams');

const tickets = ref([]);
const isLoading = ref(false);
const isOpen = ref(false);
const query = ref('');

const fetchStatus = async status => {
  const { data } = await ConversationApi.get({
    status,
    assigneeType: ASSIGNEE_TYPE.ALL,
    sortBy: SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC,
    page: 1,
  });
  return data.data.payload || [];
};

const load = async () => {
  isLoading.value = true;
  try {
    const lists = await Promise.all([
      fetchStatus(STATUS_TYPE.OPEN),
      fetchStatus(STATUS_TYPE.PENDING),
    ]);
    tickets.value = lists.flat();
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);

const teamOf = chat => {
  const embedded = chat.meta?.team;
  if (!embedded) return null;
  return (teams.value || []).find(item => item.id === embedded.id) || embedded;
};

const selected = computed(() =>
  tickets.value.find(chat => String(chat.id) === model.value)
);

const matches = (chat, term) => {
  const sender = chat.meta?.sender || {};
  const digits = term.replace(/\D/g, '');
  if (digits && String(chat.id).startsWith(digits)) return true;
  if (digits && (sender.phone_number || '').includes(digits)) return true;
  return (sender.name || '').toLowerCase().includes(term);
};

const results = computed(() => {
  const term = query.value.trim().toLowerCase();
  const list = term
    ? tickets.value.filter(chat => matches(chat, term))
    : tickets.value;
  return list.slice(0, MAX_RESULTS);
});

const typedNumber = computed(() => {
  const term = query.value.trim();
  if (!/^\d+$/.test(term)) return '';
  return results.value.some(chat => String(chat.id) === term) ? '' : term;
});

const openList = () => {
  query.value = '';
  isOpen.value = true;
};

const closeList = () => {
  setTimeout(() => {
    isOpen.value = false;
  }, BLUR_DELAY_MS);
};

const choose = id => {
  model.value = String(id);
  isOpen.value = false;
};

const clear = () => {
  model.value = '';
};

const lastMessageText = chat => {
  const message = getLastMessage(chat);
  if (!message) return '';
  if (message.content) return message.content;
  return message.attachments?.length ? t('GTI.TASKS.PICKER.ATTACHMENT') : '';
};

const chipClass =
  'px-1.5 text-[0.65625rem] font-semibold leading-4 rounded whitespace-nowrap';
</script>

<template>
  <div class="flex flex-col gap-1 text-sm text-n-slate-12">
    <span>{{ props.label }}</span>
    <div class="relative">
      <div
        class="flex items-center gap-2 px-2 border rounded-lg min-h-10 border-n-weak bg-n-solid-1"
      >
        <template v-if="!isOpen && model">
          <span
            v-if="selected"
            class="flex items-center justify-center flex-shrink-0 text-[0.625rem] font-semibold text-white rounded-full size-6"
            :class="gtiAvatarColor(selected.meta?.sender?.id)"
          >
            {{ gtiInitials(selected.meta?.sender?.name) }}
          </span>
          <button
            type="button"
            class="flex-1 min-w-0 text-start truncate !p-0 !border-0 !bg-transparent text-n-slate-12"
            @click="openList"
          >
            <span class="font-semibold">
              {{ t('GTI.TASKS.PICKER.NUMBER', { id: model }) }}
            </span>
            <span v-if="selected" class="ms-1.5">
              {{ selected.meta?.sender?.name }}
            </span>
          </button>
          <button
            type="button"
            class="flex !p-0 !border-0 !bg-transparent text-n-slate-11 hover:text-n-slate-12"
            :title="t('GTI.TASKS.PICKER.CLEAR')"
            @click="clear"
          >
            <span class="i-material-symbols-close size-4" />
          </button>
        </template>
        <template v-else>
          <span class="i-material-symbols-search size-4 text-n-slate-10" />
          <input
            v-model="query"
            type="text"
            class="flex-1 min-w-0 !mb-0 !h-9 !p-0 !border-0 !bg-transparent !shadow-none !outline-none text-sm"
            :placeholder="props.placeholder"
            @focus="openList"
            @blur="closeList"
            @keydown.enter.prevent="typedNumber && choose(typedNumber)"
          />
        </template>
        <span
          class="flex-shrink-0 transition-transform i-material-symbols-keyboard-arrow-down size-5 text-n-slate-11"
          :class="{ 'rotate-180': isOpen }"
        />
      </div>

      <div
        v-if="isOpen"
        class="absolute z-50 w-full mt-1 overflow-y-auto border rounded-lg shadow-lg max-h-72 border-n-weak bg-n-solid-1"
      >
        <p v-if="isLoading" class="px-3 py-3 text-sm text-n-slate-11">
          {{ t('GTI.TASKS.PICKER.LOADING') }}
        </p>
        <button
          v-if="typedNumber"
          type="button"
          class="flex items-center w-full gap-2 px-3 py-2 text-sm border-b text-start !border-0 !border-b !border-solid border-n-weak !rounded-none !bg-transparent hover:!bg-n-alpha-1"
          @mousedown.prevent="choose(typedNumber)"
        >
          <span class="i-material-symbols-tag size-4 text-n-slate-11" />
          {{ t('GTI.TASKS.PICKER.USE_NUMBER', { id: typedNumber }) }}
        </button>
        <button
          v-for="chat in results"
          :key="chat.id"
          type="button"
          class="flex w-full gap-2.5 py-2 pe-3 ps-2 text-start !border-0 !border-b !border-s-4 !border-solid !rounded-none border-b-n-weak hover:!bg-n-alpha-1"
          :class="[
            String(chat.id) === model ? '!bg-n-gti-soft' : '!bg-transparent',
            gtiTeamColor(teamOf(chat)) ? '' : 'border-s-transparent',
          ]"
          :style="
            gtiTeamColor(teamOf(chat))
              ? { borderInlineStartColor: gtiTeamColor(teamOf(chat)) }
              : null
          "
          @mousedown.prevent="choose(chat.id)"
        >
          <span
            class="flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white rounded-full size-8"
            :class="gtiAvatarColor(chat.meta?.sender?.id)"
          >
            {{ gtiInitials(chat.meta?.sender?.name) }}
          </span>
          <span class="flex flex-col flex-1 min-w-0 gap-0.5">
            <span class="flex items-center gap-1.5">
              <span class="text-xs font-semibold text-n-slate-11 tabular-nums">
                {{ t('GTI.TASKS.PICKER.NUMBER', { id: chat.id }) }}
              </span>
              <span
                class="flex-1 min-w-0 text-sm font-semibold truncate text-n-slate-12"
              >
                {{ chat.meta?.sender?.name }}
              </span>
              <span class="text-[0.6875rem] text-n-slate-11 tabular-nums">
                {{ gtiCardTime(chat.timestamp || chat.created_at) }}
              </span>
            </span>
            <span class="text-[0.8125rem] truncate text-n-slate-11">
              {{ lastMessageText(chat) || '—' }}
            </span>
            <span class="flex flex-wrap items-center gap-1">
              <span
                v-if="teamOf(chat)"
                class="text-white"
                :class="[
                  chipClass,
                  { 'bg-n-gti-green': !gtiTeamColor(teamOf(chat)) },
                ]"
                :style="
                  gtiTeamColor(teamOf(chat))
                    ? { backgroundColor: gtiTeamColor(teamOf(chat)) }
                    : null
                "
              >
                {{ teamOf(chat).name }}
              </span>
              <span
                class="border bg-n-slate-2 text-n-slate-11 border-n-weak"
                :class="chipClass"
              >
                {{
                  chat.meta?.assignee
                    ? t('GTI_TICKETS.CARD.AGENT', {
                        name: chat.meta.assignee.name,
                      })
                    : t('GTI.TASKS.PICKER.WAITING')
                }}
              </span>
            </span>
          </span>
        </button>
        <p
          v-if="!isLoading && !results.length && !typedNumber"
          class="px-3 py-3 text-sm text-n-slate-11"
        >
          {{ t('GTI.TASKS.PICKER.EMPTY') }}
        </p>
      </div>
    </div>
  </div>
</template>
