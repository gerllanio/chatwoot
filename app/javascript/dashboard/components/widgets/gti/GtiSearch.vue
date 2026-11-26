<script setup>
// GTI "Work": Ctrl+K / Cmd+K search. One box that looks through contacts,
// WhatsApp and Instagram conversations, tasks, quick replies and tags, shown in
// that order. Each source answers on its own, so contacts appear first while
// the rest is still being searched.
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { debounce } from '@chatwoot/utils';
import { useAlert } from 'dashboard/composables';
import { useMapGetter } from 'dashboard/composables/store';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import ContactAPI from 'dashboard/api/contacts';
import SearchAPI from 'dashboard/api/search';
import GtiTasksAPI from 'dashboard/api/gtiTasks';
import TeleportWithDirection from 'dashboard/components-next/TeleportWithDirection.vue';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { gtiAvatarColor, gtiInitials } from 'dashboard/helper/gtiTicketCard';
import {
  GTI_SEARCH_MIN_REMOTE,
  GTI_SEARCH_SECTIONS,
  gtiSearchMatches,
  gtiSearchRows,
  gtiSplitConversations,
} from 'dashboard/helper/gtiSearch';

const DEBOUNCE_MS = 300;
const MAX_PER_SECTION = 8;

const SECTION_ICONS = {
  contacts: 'i-material-symbols-person',
  whatsapp: 'i-material-symbols-chat',
  instagram: 'i-material-symbols-photo-camera',
  tasks: 'i-material-symbols-assignment-turned-in',
  canned: 'i-material-symbols-bolt',
  labels: 'i-material-symbols-sell',
};

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useStore();
const inboxes = useMapGetter('inboxes/getInboxes');
const cannedResponses = useMapGetter('getCannedResponses');
const labels = useMapGetter('labels/getLabels');

const isOpen = ref(false);
const query = ref('');
const inputRef = ref(null);
const activeIndex = ref(0);
const results = ref({});
const loading = ref({});
const pendingTasks = ref(null);
let searchRun = 0;

const inboxesById = computed(() =>
  Object.fromEntries((inboxes.value || []).map(inbox => [inbox.id, inbox]))
);

const rows = computed(() => gtiSearchRows(results.value));
const hasTerm = computed(() => query.value.trim().length > 0);
const isSearching = computed(() => Object.values(loading.value).some(Boolean));

const setSection = (run, section, items) => {
  if (run !== searchRun) return;
  results.value = {
    ...results.value,
    [section]: items.slice(0, MAX_PER_SECTION),
  };
  loading.value = { ...loading.value, [section]: false };
};

const searchContacts = async (run, term) => {
  try {
    const { data } = await ContactAPI.search(term);
    setSection(run, 'contacts', data.payload || []);
  } catch {
    setSection(run, 'contacts', []);
  }
};

const searchConversations = async (run, term) => {
  try {
    const { data } = await SearchAPI.conversations({ q: term });
    const groups = gtiSplitConversations(
      data.payload?.conversations,
      inboxesById.value
    );
    setSection(run, 'whatsapp', groups.whatsapp);
    setSection(run, 'instagram', groups.instagram);
  } catch {
    setSection(run, 'whatsapp', []);
    setSection(run, 'instagram', []);
  }
};

const searchTasks = async (run, term) => {
  try {
    if (!pendingTasks.value) {
      const { data } = await GtiTasksAPI.list({ status: 'pending' });
      pendingTasks.value = data.payload || [];
    }
    const found = pendingTasks.value.filter(task =>
      gtiSearchMatches(
        term,
        task.title,
        task.description,
        task.conversation_display_id
      )
    );
    setSection(run, 'tasks', found);
  } catch {
    setSection(run, 'tasks', []);
  }
};

const searchLocal = (run, term) => {
  setSection(
    run,
    'canned',
    (cannedResponses.value || []).filter(item =>
      gtiSearchMatches(term, item.short_code, item.content)
    )
  );
  setSection(
    run,
    'labels',
    (labels.value || []).filter(item =>
      gtiSearchMatches(term, item.title, item.description)
    )
  );
};

const runSearch = debounce(() => {
  searchRun += 1;
  const run = searchRun;
  const term = query.value.trim();
  activeIndex.value = 0;
  if (!term) {
    results.value = {};
    loading.value = {};
    return;
  }
  const remote = term.length >= GTI_SEARCH_MIN_REMOTE;
  loading.value = {
    contacts: remote,
    whatsapp: remote,
    instagram: remote,
    tasks: true,
  };
  results.value = {};
  if (remote) {
    searchContacts(run, term);
    searchConversations(run, term);
  }
  searchTasks(run, term);
  searchLocal(run, term);
}, DEBOUNCE_MS);

watch(query, runSearch);

const open = async () => {
  isOpen.value = true;
  pendingTasks.value = null;
  if (!(cannedResponses.value || []).length) {
    store.dispatch('getCannedResponse');
  }
  if (!(labels.value || []).length) store.dispatch('labels/get');
  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
};

const close = () => {
  isOpen.value = false;
};

const accountId = computed(() => route.params.accountId);

const choose = async ({ section, item }) => {
  close();
  const params = { accountId: accountId.value };
  if (section === 'contacts') {
    router.push({
      name: 'contacts_edit',
      params: { ...params, contactId: item.id },
    });
  } else if (section === 'whatsapp' || section === 'instagram') {
    router.push({
      name: 'inbox_conversation',
      params: { ...params, conversation_id: item.id },
    });
  } else if (section === 'tasks') {
    router.push({ name: 'gti_tasks', params });
  } else if (section === 'labels') {
    router.push({
      name: 'label_conversations',
      params: { ...params, label: item.title },
    });
  } else if (section === 'canned') {
    await copyTextToClipboard(item.content);
    useAlert(t('GTI_SEARCH.COPIED'));
  }
};

const move = step => {
  const total = rows.value.length;
  if (!total) return;
  activeIndex.value = (activeIndex.value + step + total) % total;
  nextTick(() => {
    document
      .querySelector(`[data-gti-search-row="${activeIndex.value}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  });
};

const onEnter = () => {
  const row = rows.value[activeIndex.value];
  if (row) choose(row);
};

const rowIndex = (section, index) =>
  rows.value.findIndex(
    row => row.section === section && row.item === results.value[section][index]
  );

const sectionLabels = computed(() => ({
  contacts: t('GTI_SEARCH.SECTIONS.CONTACTS'),
  whatsapp: t('GTI_SEARCH.SECTIONS.WHATSAPP'),
  instagram: t('GTI_SEARCH.SECTIONS.INSTAGRAM'),
  tasks: t('GTI_SEARCH.SECTIONS.TASKS'),
  canned: t('GTI_SEARCH.SECTIONS.CANNED'),
  labels: t('GTI_SEARCH.SECTIONS.LABELS'),
}));

const visibleSections = computed(() =>
  GTI_SEARCH_SECTIONS.filter(
    section => loading.value[section] || (results.value[section] || []).length
  )
);

const rowTitle = (section, item) => {
  if (section === 'contacts') return item.name;
  if (section === 'whatsapp' || section === 'instagram') {
    return item.contact?.name;
  }
  if (section === 'tasks') return item.title;
  if (section === 'canned') return `/${item.short_code}`;
  return item.title;
};

const rowSubtitle = (section, item) => {
  if (section === 'contacts') {
    return [item.phone_number, item.email].filter(Boolean).join(' · ');
  }
  if (section === 'whatsapp' || section === 'instagram') {
    return t('GTI_SEARCH.CONVERSATION_META', {
      id: item.id,
      inbox: item.inbox?.name || '',
    });
  }
  if (section === 'tasks') {
    return [
      item.assignee?.name,
      item.conversation_display_id
        ? t('GTI_SEARCH.TICKET', { id: item.conversation_display_id })
        : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (section === 'canned') return item.content;
  return item.description;
};

const avatarName = (section, item) =>
  section === 'contacts' ? item.name : item.contact?.name;
const avatarId = (section, item) =>
  section === 'contacts' ? item.id : item.contact?.id;
const hasAvatar = section =>
  ['contacts', 'whatsapp', 'instagram'].includes(section);

const showEmpty = computed(
  () => hasTerm.value && !isSearching.value && !rows.value.length
);

useKeyboardEvents({
  '$mod+KeyK': {
    action: event => {
      event.preventDefault();
      if (isOpen.value) close();
      else open();
    },
    allowOnFocusedInput: true,
  },
});

defineExpose({ open });
</script>

<template>
  <TeleportWithDirection to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-[12vh] bg-n-gti-navy/40"
      @mousedown.self="close"
    >
      <div
        class="flex flex-col w-full max-w-[40rem] max-h-[70vh] overflow-hidden rounded-xl shadow-2xl bg-n-solid-1 border border-n-weak"
        role="dialog"
        :aria-label="t('GTI_SEARCH.TITLE')"
      >
        <div class="flex items-center gap-2 px-4 border-b border-n-weak">
          <span class="i-material-symbols-search size-5 text-n-slate-11" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            class="flex-1 min-w-0 !mb-0 !h-12 !p-0 !border-0 !bg-transparent !shadow-none !outline-none text-base text-n-slate-12"
            :placeholder="t('GTI_SEARCH.PLACEHOLDER')"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="onEnter"
            @keydown.esc.prevent="close"
          />
          <span
            v-if="isSearching"
            class="i-material-symbols-progress-activity size-4 animate-spin text-n-gti-green"
          />
          <kbd
            class="px-1.5 text-[0.6875rem] border rounded border-n-weak text-n-slate-11"
          >
            {{ t('GTI_SEARCH.ESC') }}
          </kbd>
        </div>

        <div class="flex-1 overflow-y-auto">
          <p v-if="!hasTerm" class="px-4 py-6 text-sm text-n-slate-11">
            {{ t('GTI_SEARCH.HINT') }}
          </p>
          <p v-else-if="showEmpty" class="px-4 py-6 text-sm text-n-slate-11">
            {{ t('GTI_SEARCH.EMPTY', { query: query.trim() }) }}
          </p>
          <section
            v-for="section in visibleSections"
            :key="section"
            class="py-1 border-b border-n-weak last:border-b-0"
          >
            <h3
              class="flex items-center gap-1.5 px-4 pt-2 pb-1 text-[0.6875rem] font-semibold tracking-wide uppercase text-n-slate-11"
            >
              <span :class="SECTION_ICONS[section]" class="size-3.5" />
              {{ sectionLabels[section] }}
              <span
                v-if="loading[section]"
                class="font-normal normal-case tracking-normal text-n-slate-10"
              >
                {{ t('GTI_SEARCH.LOADING') }}
              </span>
            </h3>
            <button
              v-for="(item, index) in results[section] || []"
              :key="`${section}-${item.id}`"
              type="button"
              :data-gti-search-row="rowIndex(section, index)"
              class="flex items-center w-full gap-3 px-4 py-2 text-start !border-0 !rounded-none"
              :class="
                rowIndex(section, index) === activeIndex
                  ? '!bg-n-gti-soft'
                  : '!bg-transparent hover:!bg-n-alpha-1'
              "
              @mousemove="activeIndex = rowIndex(section, index)"
              @click="choose({ section, item })"
            >
              <span
                v-if="hasAvatar(section)"
                class="flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white rounded-full size-8"
                :class="gtiAvatarColor(avatarId(section, item))"
              >
                {{ gtiInitials(avatarName(section, item)) }}
              </span>
              <span
                v-else-if="section === 'labels'"
                class="flex-shrink-0 rounded-full size-3 ms-2.5 me-2.5"
                :style="{ backgroundColor: item.color }"
              />
              <span
                v-else
                class="flex items-center justify-center flex-shrink-0 rounded-full size-8 bg-n-slate-3 text-n-slate-11"
              >
                <span :class="SECTION_ICONS[section]" class="size-4" />
              </span>
              <span class="flex flex-col flex-1 min-w-0">
                <span class="text-sm font-semibold truncate text-n-slate-12">
                  {{ rowTitle(section, item) }}
                </span>
                <span
                  v-if="rowSubtitle(section, item)"
                  class="text-xs truncate text-n-slate-11"
                >
                  {{ rowSubtitle(section, item) }}
                </span>
              </span>
              <span
                v-if="section === 'canned'"
                class="flex-shrink-0 text-[0.6875rem] text-n-slate-10"
              >
                {{ t('GTI_SEARCH.COPY') }}
              </span>
            </button>
          </section>
        </div>
      </div>
    </div>
  </TeleportWithDirection>
</template>
