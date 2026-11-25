<script setup>
// GTI "Work": the prototype contact drawer (contactPanel()) that replaces the
// upstream contact sidebar in the Work layout: contact card, Primata box,
// tags, observations (contact notes), ticket info and previous attendances.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { useAlert } from 'dashboard/composables';
import { frontendURL, conversationUrl } from 'dashboard/helper/URLHelper';
import { messageTimestamp } from 'shared/helpers/timeHelper';
import {
  gtiAvatarColor,
  gtiChannelName,
  gtiInitials,
  gtiTeamColor,
} from 'dashboard/helper/gtiTicketCard';
import LabelBox from 'dashboard/routes/dashboard/conversation/labels/LabelBox.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';

const props = defineProps({
  chat: { type: Object, required: true },
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useStore();
const { updateUISettings } = useUISettings();

const contactId = computed(() => props.chat.meta?.sender?.id);
const getContact = useMapGetter('contacts/getContact');
const getNotes = useMapGetter('contactNotes/getAllNotesByContact');
const getConversations = useMapGetter(
  'contactConversations/getContactConversation'
);
const getInbox = useMapGetter('inboxes/getInbox');
const teams = useMapGetter('teams/getTeams');

const contact = computed(() => getContact.value(contactId.value) || {});
const notes = computed(() => getNotes.value(contactId.value) || []);
const inbox = computed(() => getInbox.value(props.chat.inbox_id) || {});
const company = computed(
  () =>
    contact.value.additional_attributes?.company_name ||
    contact.value.company?.name ||
    '—'
);
const history = computed(() =>
  (getConversations.value(contactId.value) || [])
    .filter(conversation => conversation.id !== props.chat.id)
    .slice(0, 10)
);
const teamColorFor = conversation => {
  const id = conversation.meta?.team?.id;
  return gtiTeamColor((teams.value || []).find(team => team.id === id));
};

const noteDraft = ref('');
const savingNote = ref(false);

watch(
  contactId,
  id => {
    if (!id) return;
    store.dispatch('contacts/show', { id });
    store.dispatch('contactNotes/get', { contactId: id });
    store.dispatch('contactConversations/get', id);
  },
  { immediate: true }
);

const close = () => {
  updateUISettings({ is_contact_sidebar_open: false });
};

const editContact = () => {
  router.push({
    name: 'contacts_edit',
    params: { accountId: route.params.accountId, contactId: contactId.value },
  });
};

const saveNote = async () => {
  const content = noteDraft.value.trim();
  if (!content) return;
  savingNote.value = true;
  try {
    await store.dispatch('contactNotes/create', {
      contactId: contactId.value,
      content,
    });
    noteDraft.value = '';
    useAlert(t('GTI_TICKETS.DRAWER.NOTE_SAVED'));
  } catch {
    useAlert(t('GTI_TICKETS.DRAWER.NOTE_FAILED'));
  } finally {
    savingNote.value = false;
  }
};

const openConversation = conversation => {
  router.push(
    frontendURL(
      conversationUrl({
        accountId: route.params.accountId,
        id: conversation.id,
      })
    )
  );
};

const STATUS_KEYS = {
  open: 'GTI_TICKETS.DRAWER.STATUS_OPEN',
  pending: 'GTI_TICKETS.DRAWER.STATUS_OPEN',
  snoozed: 'GTI_TICKETS.DRAWER.STATUS_OPEN',
  resolved: 'GTI_TICKETS.DRAWER.STATUS_RESOLVED',
};
const SECTION = 'px-[1.125rem] py-3.5 border-b border-n-weak';
const SECTION_TITLE =
  'm-0 mb-2 text-xs font-semibold tracking-wider uppercase text-n-slate-11';
const KV = 'flex justify-between gap-2.5 py-0.5 text-[0.8125rem]';
</script>

<template>
  <aside
    class="w-[18.75rem] min-w-[18.75rem] h-full overflow-y-auto border-s bg-n-solid-1 border-n-weak"
  >
    <div class="relative px-5 py-5 text-center border-b border-n-weak">
      <button
        type="button"
        class="absolute flex items-center justify-center p-0 rounded-full top-2 end-2 size-8 text-n-slate-11 hover:bg-n-alpha-2"
        :aria-label="t('GTI_TICKETS.DRAWER.CLOSE')"
        @click="close"
      >
        <Icon icon="i-lucide-x" class="size-5" />
      </button>
      <img
        v-if="contact.thumbnail"
        :src="contact.thumbnail"
        :alt="contact.name"
        class="object-cover mx-auto mb-2.5 rounded-full size-[4.5rem]"
      />
      <span
        v-else
        class="flex items-center justify-center mx-auto mb-2.5 text-2xl font-semibold text-white rounded-full size-[4.5rem]"
        :class="gtiAvatarColor(contactId)"
      >
        {{ gtiInitials(contact.name) }}
      </span>
      <p class="m-0 font-semibold text-n-slate-12">{{ contact.name }}</p>
      <p class="m-0 text-[0.8125rem] text-n-slate-11">
        {{ contact.phone_number || contact.email }}
      </p>
      <Button
        :label="t('GTI_TICKETS.DRAWER.EDIT_CONTACT')"
        size="xs"
        color="slate"
        variant="outline"
        class="mt-2.5"
        @click="editContact"
      />
    </div>

    <section :class="SECTION">
      <h4 :class="SECTION_TITLE">{{ t('GTI_TICKETS.DRAWER.PRIMATA') }}</h4>
      <div
        class="p-2.5 border rounded-lg border-n-weak bg-gradient-to-br from-n-gti-soft dark:from-n-gti-soft-dark to-transparent"
      >
        <div :class="KV">
          <span class="text-n-slate-11">{{
            t('GTI_TICKETS.DRAWER.COMPANY')
          }}</span>
          <b class="text-n-slate-12">{{ company }}</b>
        </div>
        <p class="m-0 mt-1 text-xs text-n-slate-10">
          {{ t('GTI_TICKETS.DRAWER.PRIMATA_SOON') }}
        </p>
        <Button
          :label="t('GTI_TICKETS.DRAWER.OPEN_PRIMATA')"
          size="xs"
          color="slate"
          variant="outline"
          class="justify-center w-full mt-2"
          disabled
        />
      </div>
    </section>

    <section :class="SECTION">
      <h4 :class="SECTION_TITLE">{{ t('GTI_TICKETS.DRAWER.TAGS') }}</h4>
      <LabelBox />
    </section>

    <section :class="SECTION">
      <h4 :class="SECTION_TITLE">{{ t('GTI_TICKETS.DRAWER.NOTES') }}</h4>
      <div
        v-for="note in notes"
        :key="note.id"
        class="px-2.5 py-2 mb-1.5 text-[0.8125rem] border rounded-md whitespace-pre-line bg-n-slate-2 border-n-weak text-n-slate-12"
      >
        {{ note.content }}
        <small class="block mt-0.5 text-[0.6875rem] text-n-slate-11">
          {{ note.user?.name }} ·
          {{ messageTimestamp(note.created_at, 'dd/MM HH:mm') }}
        </small>
      </div>
      <textarea
        v-model="noteDraft"
        rows="3"
        class="w-full !mb-1.5 text-[0.8125rem] rounded-md resize-y"
        :placeholder="t('GTI_TICKETS.DRAWER.NOTE_PLACEHOLDER')"
      />
      <Button
        :label="t('GTI_TICKETS.DRAWER.SAVE_NOTE')"
        size="xs"
        :is-loading="savingNote"
        :disabled="!noteDraft.trim()"
        @click="saveNote"
      />
    </section>

    <section :class="SECTION">
      <h4 :class="SECTION_TITLE">{{ t('GTI_TICKETS.DRAWER.INFO') }}</h4>
      <div :class="KV">
        <span class="text-n-slate-11">{{
          t('GTI_TICKETS.DRAWER.CHANNEL')
        }}</span>
        <span>{{ gtiChannelName(inbox.channel_type) || '—' }}</span>
      </div>
      <div :class="KV">
        <span class="text-n-slate-11">{{
          t('GTI_TICKETS.DRAWER.CONNECTION')
        }}</span>
        <span class="truncate">{{ inbox.name || '—' }}</span>
      </div>
      <div :class="KV">
        <span class="text-n-slate-11">{{
          t('GTI_TICKETS.DRAWER.TICKET')
        }}</span>
        <span>#{{ chat.id }}</span>
      </div>
      <div :class="KV">
        <span class="text-n-slate-11">{{
          t('GTI_TICKETS.DRAWER.OPENED_AT')
        }}</span>
        <span>{{ messageTimestamp(chat.created_at, 'dd/MM HH:mm') }}</span>
      </div>
    </section>

    <section :class="SECTION">
      <h4 :class="SECTION_TITLE">{{ t('GTI_TICKETS.DRAWER.HISTORY') }}</h4>
      <p v-if="!history.length" class="m-0 text-[0.8125rem] text-n-slate-11">
        {{ t('GTI_TICKETS.DRAWER.NO_HISTORY') }}
      </p>
      <button
        v-for="conversation in history"
        :key="conversation.id"
        type="button"
        class="flex justify-between w-full gap-2 py-1.5 text-[0.78125rem] text-start border-b border-dashed border-n-weak hover:text-n-gti-green"
        @click="openConversation(conversation)"
      >
        <span class="flex items-center min-w-0 gap-1.5">
          <span
            class="flex-shrink-0 rounded-sm size-2"
            :class="{ 'bg-n-slate-8': !teamColorFor(conversation) }"
            :style="
              teamColorFor(conversation)
                ? { backgroundColor: teamColorFor(conversation) }
                : null
            "
          />
          <span class="truncate">
            #{{ conversation.id }} ·
            {{
              conversation.meta?.team?.name || t('GTI_TICKETS.DRAWER.NO_QUEUE')
            }}
          </span>
        </span>
        <span class="flex-shrink-0 text-n-slate-11">
          {{ t(STATUS_KEYS[conversation.status] || STATUS_KEYS.open) }} ·
          {{ messageTimestamp(conversation.timestamp, 'dd/MM') }}
        </span>
      </button>
    </section>
  </aside>
</template>
