<script setup>
// GTI "Work" settings, Opções tab: the Ticketz "Geral", "Tempos de espera" and
// "Horário de expediente" sections, each field saved to the Chatwoot setting
// that actually drives the behavior (account settings or every WhatsApp inbox).
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useAccount } from 'dashboard/composables/useAccount';
import Button from 'dashboard/components-next/button/Button.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import Select from 'dashboard/components-next/select/Select.vue';
import TextArea from 'dashboard/components-next/textarea/TextArea.vue';
import { GTI_NOTICE_VARIABLES } from 'dashboard/helper/gtiSettings';

const props = defineProps({
  whatsappInboxes: { type: Array, required: true },
});

const MESSAGE_MAX_LENGTH = 2000;
const DEFAULT_RATING_TIMEOUT = 20;
const NOTICE_PLACEHOLDER_VALUES = { user: '{{user}}', queue: '{{queue}}' };

const { t } = useI18n();
const store = useStore();
const { currentAccount, updateAccount } = useAccount();
const minCloseMinutes = window.chatwootConfig?.autoResolveMinMinutes || 10;

const ratingsEnabled = ref(false);
const ratingMode = ref('whatsapp_digits');
const ratingMessage = ref('');
const ratingThanks = ref('');
const ratingTimeout = ref('');
const acceptedMessage = ref('');
const transferMessage = ref('');
const closeAfter = ref('');
const closeMessage = ref('');
const officeEnabled = ref(false);
const officeMessage = ref('');
const isSaving = ref(false);

const enabledOptions = computed(() => [
  { value: true, label: t('GTI_SETTINGS.GENERAL.ENABLED') },
  { value: false, label: t('GTI_SETTINGS.GENERAL.DISABLED') },
]);
const ratingModeOptions = computed(() => [
  {
    value: 'whatsapp_digits',
    label: t('GTI_SETTINGS.GENERAL.RATING_MODE_DIGITS'),
  },
  { value: 'link', label: t('GTI_SETTINGS.GENERAL.RATING_MODE_LINK') },
]);
const officeOptions = computed(() => [
  { value: true, label: t('GTI_SETTINGS.OFFICE.BY_COMPANY') },
  { value: false, label: t('GTI_SETTINGS.GENERAL.DISABLED') },
]);
const variablesHint = computed(() =>
  t('GTI_SETTINGS.GENERAL.VARIABLES', {
    variables: GTI_NOTICE_VARIABLES.join(' '),
  })
);
const hasWhatsapp = computed(() => props.whatsappInboxes.length > 0);

watch(
  currentAccount,
  account => {
    const settings = account?.settings || {};
    acceptedMessage.value = settings.gti_ticket_accepted_message || '';
    transferMessage.value = settings.gti_transfer_message || '';
    ratingMode.value = settings.gti_rating_mode || 'whatsapp_digits';
    ratingMessage.value = settings.gti_rating_message || '';
    ratingThanks.value = settings.gti_rating_thanks_message || '';
    ratingTimeout.value = settings.gti_rating_timeout_minutes ?? '';
    closeAfter.value = settings.auto_resolve_after ?? '';
    closeMessage.value = settings.auto_resolve_message || '';
  },
  { immediate: true }
);

watch(
  () => props.whatsappInboxes,
  inboxes => {
    const [first] = inboxes;
    ratingsEnabled.value = inboxes.some(inbox => inbox.csat_survey_enabled);
    officeEnabled.value = inboxes.some(inbox => inbox.working_hours_enabled);
    officeMessage.value = first?.out_of_office_message || '';
  },
  { immediate: true }
);

const closeAfterMinutes = computed(() =>
  closeAfter.value === '' || closeAfter.value === null
    ? null
    : Number(closeAfter.value)
);

const saveInboxes = () =>
  Promise.all(
    props.whatsappInboxes.map(inbox =>
      store.dispatch('inboxes/updateInbox', {
        id: inbox.id,
        formData: false,
        csat_survey_enabled: ratingsEnabled.value,
        working_hours_enabled: officeEnabled.value,
        out_of_office_message: officeMessage.value,
      })
    )
  );

const save = async () => {
  if (
    closeAfterMinutes.value !== null &&
    closeAfterMinutes.value < minCloseMinutes
  ) {
    useAlert(t('GTI_SETTINGS.TIMEOUTS.MIN_ERROR', { min: minCloseMinutes }));
    return;
  }
  isSaving.value = true;
  try {
    await updateAccount(
      {
        gti_ticket_accepted_message: acceptedMessage.value,
        gti_transfer_message: transferMessage.value,
        gti_rating_mode: ratingMode.value,
        gti_rating_message: ratingMessage.value,
        gti_rating_thanks_message: ratingThanks.value,
        gti_rating_timeout_minutes:
          ratingTimeout.value === '' || ratingTimeout.value === null
            ? null
            : Number(ratingTimeout.value),
        auto_resolve_after: closeAfterMinutes.value,
        auto_resolve_message: closeMessage.value,
      },
      { silent: true }
    );
    await saveInboxes();
    useAlert(t('GTI_SETTINGS.SAVED'));
  } catch (error) {
    useAlert(t('GTI_SETTINGS.SAVE_FAILED'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <form class="flex flex-col gap-8" @submit.prevent="save">
    <p
      v-if="!hasWhatsapp"
      class="px-4 py-3 m-0 text-sm rounded-lg bg-n-amber-3 text-n-amber-11"
    >
      {{ t('GTI_SETTINGS.NO_WHATSAPP') }}
    </p>

    <section class="flex flex-col gap-4">
      <h2 class="m-0 text-lg font-semibold text-n-slate-12">
        {{ t('GTI_SETTINGS.GENERAL.TITLE') }}
      </h2>
      <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]">
        <label class="flex flex-col gap-1 text-sm text-n-slate-11">
          {{ t('GTI_SETTINGS.GENERAL.RATINGS') }}
          <Select
            v-model="ratingsEnabled"
            :options="enabledOptions"
            :disabled="!hasWhatsapp"
          />
          <span class="text-xs text-n-slate-10">
            {{ t('GTI_SETTINGS.GENERAL.RATINGS_HINT') }}
          </span>
        </label>
        <label class="flex flex-col gap-1 text-sm text-n-slate-11">
          {{ t('GTI_SETTINGS.GENERAL.RATING_MODE') }}
          <Select
            v-model="ratingMode"
            :options="ratingModeOptions"
            :disabled="!ratingsEnabled"
          />
        </label>
        <Input
          v-if="ratingMode === 'whatsapp_digits'"
          v-model="ratingTimeout"
          type="number"
          :label="t('GTI_SETTINGS.GENERAL.RATING_TIMEOUT')"
          :placeholder="String(DEFAULT_RATING_TIMEOUT)"
          :message="t('GTI_SETTINGS.GENERAL.RATING_TIMEOUT_HINT')"
          :disabled="!ratingsEnabled"
        />
      </div>
      <div
        v-if="ratingsEnabled && ratingMode === 'whatsapp_digits'"
        class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]"
      >
        <TextArea
          v-model="ratingMessage"
          :label="t('GTI_SETTINGS.GENERAL.RATING_MESSAGE')"
          :placeholder="t('GTI_SETTINGS.GENERAL.RATING_MESSAGE_PLACEHOLDER')"
          :max-length="MESSAGE_MAX_LENGTH"
          auto-height
        />
        <TextArea
          v-model="ratingThanks"
          :label="t('GTI_SETTINGS.GENERAL.RATING_THANKS')"
          :placeholder="t('GTI_SETTINGS.GENERAL.RATING_THANKS_PLACEHOLDER')"
          :max-length="MESSAGE_MAX_LENGTH"
          auto-height
        />
      </div>
      <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]">
        <TextArea
          v-model="acceptedMessage"
          :label="t('GTI_SETTINGS.GENERAL.ACCEPTED_MESSAGE')"
          :placeholder="
            t(
              'GTI_SETTINGS.GENERAL.ACCEPTED_PLACEHOLDER',
              NOTICE_PLACEHOLDER_VALUES
            )
          "
          :max-length="MESSAGE_MAX_LENGTH"
          :message="variablesHint"
          auto-height
        />
        <TextArea
          v-model="transferMessage"
          :label="t('GTI_SETTINGS.GENERAL.TRANSFER_MESSAGE')"
          :placeholder="
            t(
              'GTI_SETTINGS.GENERAL.TRANSFER_PLACEHOLDER',
              NOTICE_PLACEHOLDER_VALUES
            )
          "
          :max-length="MESSAGE_MAX_LENGTH"
          :message="variablesHint"
          auto-height
        />
      </div>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="m-0 text-lg font-semibold text-n-slate-12">
        {{ t('GTI_SETTINGS.TIMEOUTS.TITLE') }}
      </h2>
      <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]">
        <Input
          v-model="closeAfter"
          type="number"
          :label="t('GTI_SETTINGS.TIMEOUTS.CLOSE_AFTER')"
          :message="
            t('GTI_SETTINGS.TIMEOUTS.CLOSE_AFTER_HINT', {
              min: minCloseMinutes,
            })
          "
        />
        <div class="flex flex-col gap-1 text-sm text-n-slate-11">
          {{ t('GTI_SETTINGS.TIMEOUTS.ACTION') }}
          <span class="py-2 font-medium text-n-slate-12">
            {{ t('GTI_SETTINGS.TIMEOUTS.ACTION_CLOSE') }}
          </span>
        </div>
      </div>
      <TextArea
        v-model="closeMessage"
        :label="t('GTI_SETTINGS.TIMEOUTS.CLOSE_MESSAGE')"
        :placeholder="t('GTI_SETTINGS.TIMEOUTS.CLOSE_MESSAGE_PLACEHOLDER')"
        :max-length="MESSAGE_MAX_LENGTH"
        auto-height
      />
      <p class="m-0 text-xs text-n-slate-10">
        {{ t('GTI_SETTINGS.TIMEOUTS.CHATBOT_NOTE') }}
      </p>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="m-0 text-lg font-semibold text-n-slate-12">
        {{ t('GTI_SETTINGS.OFFICE.TITLE') }}
      </h2>
      <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]">
        <label class="flex flex-col gap-1 text-sm text-n-slate-11">
          {{ t('GTI_SETTINGS.OFFICE.MANAGEMENT') }}
          <Select
            v-model="officeEnabled"
            :options="officeOptions"
            :disabled="!hasWhatsapp"
          />
        </label>
        <div class="flex flex-col gap-1 text-sm text-n-slate-11">
          {{ t('GTI_SETTINGS.OFFICE.ACTION') }}
          <span class="py-2 font-medium text-n-slate-12">
            {{ t('GTI_SETTINGS.OFFICE.ACTION_PENDING') }}
          </span>
        </div>
      </div>
      <TextArea
        v-model="officeMessage"
        :label="t('GTI_SETTINGS.OFFICE.MESSAGE')"
        :placeholder="t('GTI_SETTINGS.OFFICE.MESSAGE_PLACEHOLDER')"
        :max-length="MESSAGE_MAX_LENGTH"
        :disabled="!hasWhatsapp"
        auto-height
      />
    </section>

    <div class="flex justify-end">
      <Button
        type="submit"
        :label="t('GTI_SETTINGS.SAVE')"
        :is-loading="isSaving"
        :disabled="isSaving"
      />
    </div>
  </form>
</template>
