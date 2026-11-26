<script setup>
// GTI "Contatos": the prototype's contact table (name, contact, channel,
// company) with "Abrir ticket", which opens the new-conversation form for
// that contact.
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { debounce } from '@chatwoot/utils';
import { useAlert } from 'dashboard/composables';
import { useStore } from 'dashboard/composables/store';
import types from 'dashboard/store/mutation-types';
import Avatar from 'next/avatar/Avatar.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import ChannelIcon from 'next/icon/ChannelIcon.vue';
import CreateNewContactDialog from 'dashboard/components-next/Contacts/ContactsForm/CreateNewContactDialog.vue';
import ComposeConversation from 'dashboard/components-next/NewConversation/ComposeConversation.vue';
import GtiPage from 'dashboard/components/widgets/gti/pages/GtiPage.vue';
import GtiContactsListAPI from 'dashboard/api/gtiContactsList';
import {
  GTI_TABLE_CARD,
  GTI_TD,
  GTI_TH,
  gtiContactCompany,
  gtiContactInbox,
} from 'dashboard/helper/gtiPages';

const PAGE_SIZE = 15;

const { t } = useI18n();
const store = useStore();
const route = useRoute();
const router = useRouter();

// Opens upstream's contact page, where every field, note and label can be edited.
const editContact = contact => {
  router.push({
    name: 'contacts_edit',
    params: { accountId: route.params.accountId, contactId: contact.id },
  });
};

const contacts = ref([]);
const total = ref(0);
const page = ref(1);
const search = ref('');
const loading = ref(false);
const createDialogRef = ref(null);

const pageCount = computed(() =>
  Math.max(1, Math.ceil(total.value / PAGE_SIZE))
);

const load = async () => {
  loading.value = true;
  try {
    const {
      data: { payload, meta },
    } = await GtiContactsListAPI.list(page.value, search.value.trim());
    contacts.value = payload;
    total.value = meta.count;
    // ComposeConversation reads the contact from the store; it fetches the
    // contactable inboxes itself, so the slim contact inboxes stay out.
    store.commit(
      `contacts/${types.SET_CONTACTS}`,
      payload.map(({ contact_inboxes: _inboxes, ...contact }) => contact)
    );
  } finally {
    loading.value = false;
  }
};

onMounted(load);
watch(page, load);
watch(
  search,
  debounce(() => {
    page.value = 1;
    load();
  }, 400)
);

const importContacts = () =>
  router.push({
    name: 'settings_data_imports',
    params: { accountId: route.params.accountId },
    query: { tab: 'import', action: 'import', source: 'csv' },
  });

const onCreate = async contact => {
  try {
    await store.dispatch('contacts/create', contact);
    createDialogRef.value?.onSuccess();
    useAlert(
      t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.SUCCESS_MESSAGE')
    );
    load();
  } catch (error) {
    useAlert(
      t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.ERROR_MESSAGE')
    );
  }
};

const contactLine = contact => contact.phone_number || contact.email || '—';
</script>

<template>
  <GtiPage
    :title="t('GTI_PAGES.CONTACTS.TITLE')"
    :subtitle="t('GTI_PAGES.CONTACTS.SUBTITLE')"
  >
    <template #toolbar>
      <input
        v-model="search"
        type="search"
        class="!mb-0 max-w-xs !h-9 text-sm"
        :placeholder="t('GTI_PAGES.CONTACTS.SEARCH')"
      />
      <Button
        icon="i-lucide-plus"
        size="sm"
        :label="t('GTI_PAGES.CONTACTS.ADD')"
        @click="createDialogRef?.dialogRef.open()"
      />
      <Button
        size="sm"
        color="slate"
        variant="faded"
        :label="t('GTI_PAGES.CONTACTS.IMPORT')"
        @click="importContacts"
      />
    </template>
    <div :class="GTI_TABLE_CARD" :aria-busy="loading">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th :class="GTI_TH">{{ t('GTI_PAGES.CONTACTS.NAME') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.CONTACTS.CONTACT') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.CONTACTS.CHANNEL') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.CONTACTS.COMPANY') }}</th>
            <th :class="GTI_TH" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="contact in contacts" :key="contact.id">
            <td :class="GTI_TD">
              <div class="flex items-center gap-2">
                <Avatar
                  :name="contact.name"
                  :src="contact.thumbnail"
                  :size="30"
                  rounded-full
                />
                <span class="truncate max-w-64">{{ contact.name }}</span>
              </div>
            </td>
            <td :class="GTI_TD">{{ contactLine(contact) }}</td>
            <td :class="GTI_TD">
              <span
                v-if="gtiContactInbox(contact)"
                class="inline-flex items-center gap-1.5"
              >
                <ChannelIcon
                  :inbox="gtiContactInbox(contact)"
                  class="size-4 text-n-slate-11"
                />
                {{ gtiContactInbox(contact).name }}
              </span>
              <span v-else class="text-n-slate-10">—</span>
            </td>
            <td :class="GTI_TD" class="text-n-slate-11">
              {{ gtiContactCompany(contact) || '—' }}
            </td>
            <td :class="GTI_TD">
              <div class="flex justify-end gap-1.5">
                <Button
                  size="xs"
                  color="slate"
                  variant="faded"
                  icon="i-material-symbols-edit"
                  :label="t('GTI_PAGES.CONTACTS.EDIT')"
                  @click="editContact(contact)"
                />
                <ComposeConversation :contact-id="String(contact.id)">
                  <template #trigger>
                    <Button
                      size="xs"
                      color="slate"
                      variant="faded"
                      :label="t('GTI_PAGES.CONTACTS.OPEN_TICKET')"
                    />
                  </template>
                </ComposeConversation>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !contacts.length">
            <td :class="GTI_TD" colspan="5" class="text-center text-n-slate-11">
              {{ t('GTI_PAGES.CONTACTS.EMPTY') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="pageCount > 1"
      class="flex items-center justify-end gap-2 mt-3 text-sm text-n-slate-11"
    >
      <Button
        icon="i-lucide-chevron-left"
        size="xs"
        color="slate"
        variant="ghost"
        :disabled="page <= 1"
        @click="page -= 1"
      />
      {{ t('GTI_PAGES.CONTACTS.PAGE', { page, total: pageCount }) }}
      <Button
        icon="i-lucide-chevron-right"
        size="xs"
        color="slate"
        variant="ghost"
        :disabled="page >= pageCount"
        @click="page += 1"
      />
    </div>
    <CreateNewContactDialog ref="createDialogRef" @create="onCreate" />
  </GtiPage>
</template>
