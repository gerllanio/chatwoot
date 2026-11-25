<script setup>
// GTI "Work": the prototype "Novo atendimento" window (newModal()). Pick a
// contact (or register a new one), the connection and the queue, write an
// optional first message, and the ticket opens assigned to me.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import { debounce } from '@chatwoot/utils';
import ContactAPI from 'dashboard/api/contacts';
import ConversationApi from 'dashboard/api/conversations';
import { fetchContactableInboxes } from 'dashboard/components-next/NewConversation/helpers/composeConversationHelper';
import { createConversationPayload } from 'dashboard/store/modules/contactConversations';
import { useGtiDefaultInbox } from 'dashboard/composables/useGtiDefaultInbox';
import { frontendURL, conversationUrl } from 'dashboard/helper/URLHelper';
import {
  gtiAvatarColor,
  gtiInitials,
  gtiLooksLikePhone,
  gtiNormalizePhone,
} from 'dashboard/helper/gtiTicketCard';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const inboxes = useMapGetter('inboxes/getInboxes');
const teams = useMapGetter('teams/getTeams');
const currentUser = useMapGetter('getCurrentUser');
const { defaultInboxFor, rememberInbox } = useGtiDefaultInbox();

const dialogRef = ref(null);
const query = ref('');
const suggestions = ref([]);
const showSuggestions = ref(false);
const picked = ref(null);
const isNew = ref(false);
const form = ref({ name: '', phone: '', email: '', company: '' });
const inboxId = ref('');
const teamId = ref('');
const firstMessage = ref('');
const isBusy = ref(false);

const INPUT =
  'w-full !mb-0 px-2.5 py-2 text-sm border rounded-md border-n-weak bg-n-slate-2 text-n-slate-12';
const LABEL = 'flex flex-col gap-1 text-xs text-n-slate-11';

const searchContacts = debounce(
  async value => {
    try {
      const { data } = await ContactAPI.search(value);
      suggestions.value = (data.payload || []).slice(0, 6);
    } catch {
      suggestions.value = [];
    }
  },
  300,
  false
);

watch(query, value => {
  showSuggestions.value = true;
  searchContacts(value.trim());
});

const reset = () => {
  query.value = '';
  suggestions.value = [];
  showSuggestions.value = false;
  picked.value = null;
  isNew.value = false;
  form.value = { name: '', phone: '', email: '', company: '' };
  inboxId.value =
    defaultInboxFor(inboxes.value)?.id || inboxes.value[0]?.id || '';
  teamId.value = '';
  firstMessage.value = '';
};

const open = () => {
  reset();
  dialogRef.value.open();
};

const pick = contact => {
  picked.value = contact;
  showSuggestions.value = false;
};

const startNew = () => {
  const value = query.value.trim();
  isNew.value = true;
  showSuggestions.value = false;
  if (gtiLooksLikePhone(value)) form.value.phone = value;
  else form.value.name = value;
};

const backToSearch = () => {
  isNew.value = false;
};

const canSubmit = computed(() => {
  if (!inboxId.value) return false;
  if (isNew.value) return form.value.name.trim() && form.value.phone.trim();
  return Boolean(picked.value);
});

const createContact = async () => {
  const { data } = await ContactAPI.create({
    name: form.value.name.trim(),
    phone_number: gtiNormalizePhone(form.value.phone),
    email: form.value.email.trim() || undefined,
    additional_attributes: form.value.company.trim()
      ? { company_name: form.value.company.trim() }
      : undefined,
  });
  return data.payload?.contact || data.payload || data;
};

const submit = async () => {
  if (!canSubmit.value) {
    useAlert(t('GTI_TICKETS.NEW.REQUIRED'));
    return;
  }
  isBusy.value = true;
  try {
    const contact = isNew.value ? await createContact() : picked.value;
    const contactable = await fetchContactableInboxes(contact.id);
    const target = contactable.find(item => item.id === Number(inboxId.value));
    if (!target) {
      useAlert(t('GTI_TICKETS.NEW.NOT_REACHABLE'));
      return;
    }
    const payload = createConversationPayload({
      params: {
        inboxId: inboxId.value,
        sourceId: target.sourceId,
        assigneeId: currentUser.value?.id,
        message: firstMessage.value.trim()
          ? { content: firstMessage.value.trim() }
          : null,
      },
      contactId: contact.id,
    });
    if (teamId.value) payload.append('team_id', teamId.value);
    const { data } = await ConversationApi.create(payload);
    rememberInbox(
      inboxes.value.find(item => item.id === Number(inboxId.value))
    );
    dialogRef.value.close();
    useAlert(
      t(
        isNew.value ? 'GTI_TICKETS.NEW.CREATED_NEW' : 'GTI_TICKETS.NEW.CREATED',
        {
          name: contact.name,
        }
      )
    );
    router.push(
      frontendURL(
        conversationUrl({ accountId: route.params.accountId, id: data.id })
      )
    );
  } catch {
    useAlert(t('GTI_TICKETS.NEW.FAILED'));
  } finally {
    isBusy.value = false;
  }
};

defineExpose({ open });
</script>

<template>
  <Dialog
    ref="dialogRef"
    :title="t('GTI_TICKETS.NEW.TITLE')"
    width="lg"
    overflow-y-auto
  >
    <div class="flex flex-col gap-3">
      <template v-if="!isNew">
        <div v-if="picked" :class="LABEL">
          {{ t('GTI_TICKETS.NEW.CONTACT') }}
          <div
            class="flex items-center gap-2 px-2.5 py-2 text-sm border rounded-md border-n-gti-green bg-n-gti-soft dark:bg-n-gti-soft-dark"
          >
            <img
              v-if="picked.thumbnail"
              :src="picked.thumbnail"
              :alt="picked.name"
              class="object-cover rounded-full size-7"
            />
            <span
              v-else
              class="flex items-center justify-center text-[0.6875rem] font-semibold text-white rounded-full size-7"
              :class="gtiAvatarColor(picked.id)"
            >
              {{ gtiInitials(picked.name) }}
            </span>
            <span class="flex-1 min-w-0">
              <b class="block truncate text-n-slate-12">{{ picked.name }}</b>
              <small class="text-n-slate-11">
                {{ picked.phone_number || picked.email }}
              </small>
            </span>
            <Button
              :label="t('GTI_TICKETS.NEW.CHANGE')"
              size="xs"
              color="slate"
              variant="outline"
              @click="picked = null"
            />
          </div>
        </div>
        <div v-else :class="LABEL">
          {{ t('GTI_TICKETS.NEW.CONTACT') }}
          <input
            v-model="query"
            :class="INPUT"
            :placeholder="t('GTI_TICKETS.NEW.CONTACT_PLACEHOLDER')"
            autocomplete="off"
            @focus="showSuggestions = true"
          />
          <div
            v-if="showSuggestions"
            class="overflow-auto border rounded-md max-h-[10.625rem] border-n-weak"
          >
            <button
              v-for="contact in suggestions"
              :key="contact.id"
              type="button"
              class="flex items-center w-full gap-2 px-2.5 py-1.5 text-[0.8125rem] text-start border-b border-n-weak bg-n-solid-1 hover:bg-n-gti-soft dark:hover:bg-n-gti-soft-dark"
              @click="pick(contact)"
            >
              <img
                v-if="contact.thumbnail"
                :src="contact.thumbnail"
                :alt="contact.name"
                class="object-cover rounded-full size-[1.625rem]"
              />
              <span
                v-else
                class="flex items-center justify-center text-[0.6875rem] font-semibold text-white rounded-full size-[1.625rem]"
                :class="gtiAvatarColor(contact.id)"
              >
                {{ gtiInitials(contact.name) }}
              </span>
              <span class="flex-1 min-w-0">
                <b class="block truncate text-n-slate-12">{{ contact.name }}</b>
                <small class="text-n-slate-11">
                  {{ contact.phone_number || contact.email }}
                </small>
              </span>
            </button>
            <button
              type="button"
              class="flex items-center w-full gap-2 px-2.5 py-1.5 text-[0.8125rem] font-semibold text-start bg-n-solid-1 text-n-gti-green hover:bg-n-gti-soft dark:hover:bg-n-gti-soft-dark"
              @click="startNew"
            >
              <Icon icon="i-lucide-plus" class="size-4" />
              {{
                query.trim()
                  ? t('GTI_TICKETS.NEW.REGISTER_NAMED', { name: query.trim() })
                  : t('GTI_TICKETS.NEW.REGISTER')
              }}
            </button>
          </div>
        </div>
      </template>

      <div v-else class="flex flex-col gap-2">
        <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label :class="LABEL">
            {{ t('GTI_TICKETS.NEW.NAME') }}
            <input v-model="form.name" :class="INPUT" />
          </label>
          <label :class="LABEL">
            {{ t('GTI_TICKETS.NEW.PHONE') }}
            <input
              v-model="form.phone"
              :class="INPUT"
              inputmode="tel"
              :placeholder="t('GTI_TICKETS.NEW.PHONE_PLACEHOLDER')"
            />
          </label>
          <label :class="LABEL">
            {{ t('GTI_TICKETS.NEW.EMAIL') }}
            <input v-model="form.email" :class="INPUT" type="email" />
          </label>
          <label :class="LABEL">
            {{ t('GTI_TICKETS.NEW.COMPANY') }}
            <input v-model="form.company" :class="INPUT" />
          </label>
        </div>
        <Button
          :label="t('GTI_TICKETS.NEW.BACK')"
          size="xs"
          color="slate"
          variant="outline"
          class="self-start"
          @click="backToSearch"
        />
      </div>

      <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label :class="LABEL">
          {{ t('GTI_TICKETS.NEW.CONNECTION') }}
          <select v-model="inboxId" :class="INPUT">
            <option v-for="inbox in inboxes" :key="inbox.id" :value="inbox.id">
              {{ inbox.name }}
            </option>
          </select>
        </label>
        <label :class="LABEL">
          {{ t('GTI_TICKETS.NEW.QUEUE') }}
          <select v-model="teamId" :class="INPUT">
            <option value="">{{ t('GTI_TICKETS.NEW.NO_QUEUE') }}</option>
            <option v-for="team in teams" :key="team.id" :value="team.id">
              {{ team.name }}
            </option>
          </select>
        </label>
      </div>
      <label :class="LABEL">
        {{ t('GTI_TICKETS.NEW.FIRST_MESSAGE') }}
        <textarea
          v-model="firstMessage"
          rows="2"
          :class="INPUT"
          :placeholder="
            t('GTI_TICKETS.NEW.FIRST_MESSAGE_PLACEHOLDER', {
              name: currentUser?.name,
            })
          "
        />
      </label>
    </div>
    <template #footer>
      <div class="flex justify-end w-full gap-2">
        <Button
          :label="t('GTI_TICKETS.NEW.CANCEL')"
          color="slate"
          variant="faded"
          size="sm"
          @click="dialogRef.close()"
        />
        <Button
          :label="t('GTI_TICKETS.NEW.START')"
          size="sm"
          :is-loading="isBusy"
          :disabled="!canSubmit"
          @click="submit"
        />
      </div>
    </template>
  </Dialog>
</template>
