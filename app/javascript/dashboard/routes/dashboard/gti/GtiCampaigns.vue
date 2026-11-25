<script setup>
// GTI "Work" campaigns, Ticketz style: bulk WhatsApp sends to a contact list through a
// native (QR code) connection, with rotated message variations and spaced sends.
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useMapGetter } from 'dashboard/composables/store';
import { messageTimestamp } from 'shared/helpers/timeHelper';
import GtiCampaignsAPI from 'dashboard/api/gtiCampaigns';
import GtiContactListsAPI from 'dashboard/api/gtiContactLists';
import Button from 'dashboard/components-next/button/Button.vue';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import GtiCampaignReport from 'dashboard/components/widgets/gti/campaigns/GtiCampaignReport.vue';
import {
  GTI_CAMPAIGN_STATUS_CLASSES,
  buildCampaignFormData,
  campaignProgress,
  campaignToForm,
  emptyCampaignForm,
  isCampaignEditable,
} from 'dashboard/helper/gtiCampaigns';

const DATE_FORMAT = 'dd/MM/yyyy HH:mm';
const SELECT_CLASS =
  'px-2 py-2 text-sm border rounded-lg border-n-weak bg-n-solid-1 text-n-slate-12';

const { t } = useI18n();
const store = useStore();
const whatsappInboxes = useMapGetter('inboxes/getWhatsAppInboxes');

const campaigns = ref([]);
const contactLists = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const form = ref(emptyCampaignForm());
const editing = ref(null);
const currentMedia = ref(null);
const activeMessage = ref(0);
const target = ref(null);
const reportCampaign = ref(null);

const formDialogRef = ref(null);
const deleteDialogRef = ref(null);
const cancelDialogRef = ref(null);
const reportDialogRef = ref(null);

const canSave = computed(
  () =>
    form.value.name.trim() &&
    form.value.inboxId &&
    form.value.contactListId &&
    form.value.messages.some(message => message.trim())
);

const statusLabel = status => t(`GTI_CAMPAIGNS.STATUS.${status.toUpperCase()}`);
const formatDate = seconds =>
  seconds ? messageTimestamp(seconds, DATE_FORMAT) : '—';

const loadCampaigns = async () => {
  isLoading.value = true;
  try {
    const { data } = await GtiCampaignsAPI.get();
    campaigns.value = data.payload;
  } finally {
    isLoading.value = false;
  }
};

const loadContactLists = async () => {
  const { data } = await GtiContactListsAPI.get();
  contactLists.value = data.payload;
};

const openForm = campaign => {
  editing.value = campaign;
  form.value = campaign ? campaignToForm(campaign) : emptyCampaignForm();
  currentMedia.value = campaign?.media || null;
  activeMessage.value = 0;
  formDialogRef.value.open();
};

const onMediaChange = event => {
  form.value.media = event.target.files[0] || null;
  form.value.removeMedia = false;
};

const removeMedia = () => {
  form.value.removeMedia = true;
  form.value.media = null;
  currentMedia.value = null;
};

const saveCampaign = async () => {
  if (!canSave.value) return;
  isSaving.value = true;
  try {
    const payload = buildCampaignFormData(form.value);
    if (editing.value) {
      await GtiCampaignsAPI.update(editing.value.id, payload);
    } else {
      await GtiCampaignsAPI.create(payload);
    }
    formDialogRef.value.close();
    useAlert(t('GTI_CAMPAIGNS.ALERTS.SAVED'));
    await loadCampaigns();
  } catch {
    useAlert(t('GTI_CAMPAIGNS.ALERTS.ERROR'));
  } finally {
    isSaving.value = false;
  }
};

const askDelete = campaign => {
  target.value = campaign;
  deleteDialogRef.value.open();
};

const confirmDelete = async () => {
  await GtiCampaignsAPI.delete(target.value.id);
  deleteDialogRef.value.close();
  useAlert(t('GTI_CAMPAIGNS.ALERTS.DELETED'));
  await loadCampaigns();
};

const askCancel = campaign => {
  target.value = campaign;
  cancelDialogRef.value.open();
};

const confirmCancel = async () => {
  await GtiCampaignsAPI.cancel(target.value.id);
  cancelDialogRef.value.close();
  useAlert(t('GTI_CAMPAIGNS.ALERTS.CANCELLED'));
  await loadCampaigns();
};

const restartCampaign = async campaign => {
  await GtiCampaignsAPI.restart(campaign.id);
  useAlert(t('GTI_CAMPAIGNS.ALERTS.RESTARTED'));
  await loadCampaigns();
};

const openReport = campaign => {
  reportCampaign.value = campaign;
  reportDialogRef.value.open();
};

onMounted(() => {
  store.dispatch('inboxes/get');
  loadCampaigns();
  loadContactLists();
});
</script>

<template>
  <div class="flex flex-col w-full h-full gap-5 p-6 overflow-y-auto">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="m-0 text-2xl font-semibold text-n-slate-12">
          {{ t('GTI_CAMPAIGNS.TITLE') }}
        </h1>
        <p class="m-0 mt-1 text-sm text-n-slate-11">
          {{ t('GTI_CAMPAIGNS.SUBTITLE') }}
        </p>
      </div>
      <Button
        :label="t('GTI_CAMPAIGNS.NEW')"
        icon="i-lucide-plus"
        @click="openForm(null)"
      />
    </header>

    <p v-if="isLoading" class="m-0 text-sm text-n-slate-10">
      {{ t('GTI_CAMPAIGNS.LOADING') }}
    </p>
    <p v-else-if="!campaigns.length" class="m-0 text-sm text-n-slate-10">
      {{ t('GTI_CAMPAIGNS.EMPTY') }}
    </p>
    <div
      v-else
      class="overflow-x-auto border rounded-xl border-n-weak bg-n-solid-1"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="text-start text-n-slate-11">
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.TABLE.NAME') }}
            </th>
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.TABLE.STATUS') }}
            </th>
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.TABLE.LIST') }}
            </th>
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.TABLE.CONNECTION') }}
            </th>
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.TABLE.SCHEDULED') }}
            </th>
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.TABLE.COMPLETED') }}
            </th>
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.TABLE.PROGRESS') }}
            </th>
            <th class="px-4 py-3 font-medium text-end">
              {{ t('GTI_CAMPAIGNS.TABLE.ACTIONS') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="campaign in campaigns"
            :key="campaign.id"
            class="border-t border-n-weak text-n-slate-12"
          >
            <td class="px-4 py-3 font-medium">{{ campaign.name }}</td>
            <td class="px-4 py-3">
              <span
                class="px-2 py-0.5 text-xs font-medium rounded-md whitespace-nowrap"
                :class="GTI_CAMPAIGN_STATUS_CLASSES[campaign.status]"
              >
                {{ statusLabel(campaign.status) }}
              </span>
            </td>
            <td class="px-4 py-3">
              {{
                campaign.contact_list?.name ||
                t('GTI_CAMPAIGNS.TABLE.NOT_DEFINED')
              }}
            </td>
            <td class="px-4 py-3">{{ campaign.inbox.name }}</td>
            <td class="px-4 py-3 whitespace-nowrap">
              {{ formatDate(campaign.scheduled_at) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              {{ formatDate(campaign.completed_at) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap tabular-nums">
              {{
                t('GTI_CAMPAIGNS.TABLE.PROGRESS_VALUE', {
                  sent: campaign.shippings.delivered,
                  total: campaign.shippings.total,
                  percent: campaignProgress(campaign),
                })
              }}
            </td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <Button
                  v-if="isCampaignEditable(campaign)"
                  v-tooltip.top="t('GTI_CAMPAIGNS.ACTIONS.EDIT')"
                  icon="i-lucide-pencil"
                  slate
                  faded
                  xs
                  @click="openForm(campaign)"
                />
                <Button
                  v-tooltip.top="t('GTI_CAMPAIGNS.ACTIONS.REPORT')"
                  icon="i-lucide-file-chart-column"
                  slate
                  faded
                  xs
                  @click="openReport(campaign)"
                />
                <Button
                  v-if="['scheduled', 'in_progress'].includes(campaign.status)"
                  v-tooltip.top="t('GTI_CAMPAIGNS.ACTIONS.CANCEL')"
                  icon="i-lucide-circle-stop"
                  amber
                  faded
                  xs
                  @click="askCancel(campaign)"
                />
                <Button
                  v-if="campaign.status === 'cancelled'"
                  v-tooltip.top="t('GTI_CAMPAIGNS.ACTIONS.RESTART')"
                  icon="i-lucide-rotate-ccw"
                  teal
                  faded
                  xs
                  @click="restartCampaign(campaign)"
                />
                <Button
                  v-tooltip.top="t('GTI_CAMPAIGNS.ACTIONS.DELETE')"
                  icon="i-lucide-trash-2"
                  ruby
                  faded
                  xs
                  @click="askDelete(campaign)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog
      ref="formDialogRef"
      :title="
        editing
          ? t('GTI_CAMPAIGNS.FORM.TITLE_EDIT')
          : t('GTI_CAMPAIGNS.FORM.TITLE_NEW')
      "
      :confirm-button-label="t('GTI_CAMPAIGNS.FORM.SAVE')"
      :cancel-button-label="t('GTI_CAMPAIGNS.FORM.CANCEL')"
      :disable-confirm-button="!canSave"
      :is-loading="isSaving"
      width="2xl"
      overflow-y-auto
      @confirm="saveCampaign"
    >
      <div class="flex flex-col gap-4">
        <Input
          v-model="form.name"
          :label="t('GTI_CAMPAIGNS.FORM.NAME')"
          :placeholder="t('GTI_CAMPAIGNS.FORM.NAME_PLACEHOLDER')"
        />
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm text-n-slate-12">
            {{ t('GTI_CAMPAIGNS.FORM.CONNECTION') }}
            <select v-model="form.inboxId" :class="SELECT_CLASS">
              <option value="" disabled>
                {{ t('GTI_CAMPAIGNS.FORM.CONNECTION_PLACEHOLDER') }}
              </option>
              <option
                v-for="inbox in whatsappInboxes"
                :key="inbox.id"
                :value="inbox.id"
              >
                {{ inbox.name }}
              </option>
            </select>
            <span v-if="!whatsappInboxes.length" class="text-xs text-n-ruby-11">
              {{ t('GTI_CAMPAIGNS.FORM.NO_WHATSAPP') }}
            </span>
          </label>
          <label class="flex flex-col gap-1 text-sm text-n-slate-12">
            {{ t('GTI_CAMPAIGNS.FORM.LIST') }}
            <select v-model="form.contactListId" :class="SELECT_CLASS">
              <option value="" disabled>
                {{ t('GTI_CAMPAIGNS.FORM.LIST_PLACEHOLDER') }}
              </option>
              <option
                v-for="list in contactLists"
                :key="list.id"
                :value="list.id"
              >
                {{
                  t('GTI_CAMPAIGNS.FORM.LIST_OPTION', {
                    name: list.name,
                    count: list.items_count,
                  })
                }}
              </option>
            </select>
          </label>
        </div>
        <div class="flex flex-col gap-1">
          <Input
            v-model="form.scheduledAt"
            type="datetime-local"
            :label="t('GTI_CAMPAIGNS.FORM.SCHEDULED_AT')"
          />
          <span class="text-xs text-n-slate-10">
            {{ t('GTI_CAMPAIGNS.FORM.SCHEDULED_HELP') }}
          </span>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap gap-1">
            <button
              v-for="(message, index) in form.messages"
              :key="index"
              type="button"
              class="px-3 py-1 text-xs border rounded-lg border-n-weak"
              :class="
                activeMessage === index
                  ? 'bg-n-brand text-white'
                  : message.trim()
                    ? 'bg-n-alpha-2 text-n-slate-12'
                    : 'bg-n-solid-1 text-n-slate-11'
              "
              @click="activeMessage = index"
            >
              {{ t('GTI_CAMPAIGNS.FORM.MESSAGE_TAB', { number: index + 1 }) }}
            </button>
          </div>
          <textarea
            v-model="form.messages[activeMessage]"
            rows="5"
            class="w-full p-2 text-sm border rounded-lg resize-y border-n-weak bg-n-solid-1 text-n-slate-12"
            :placeholder="t('GTI_CAMPAIGNS.FORM.MESSAGE_PLACEHOLDER')"
          />
          <span class="text-xs text-n-slate-10">
            {{ t('GTI_CAMPAIGNS.FORM.VARIABLES_HELP') }}
          </span>
        </div>

        <div class="flex flex-col gap-1 text-sm text-n-slate-12">
          {{ t('GTI_CAMPAIGNS.FORM.MEDIA') }}
          <div
            v-if="currentMedia && !form.media"
            class="flex items-center gap-2 text-xs text-n-slate-11"
          >
            {{
              t('GTI_CAMPAIGNS.FORM.MEDIA_CURRENT', { name: currentMedia.name })
            }}
            <Button
              :label="t('GTI_CAMPAIGNS.FORM.REMOVE_MEDIA')"
              ruby
              link
              xs
              @click="removeMedia"
            />
          </div>
          <input type="file" class="text-xs" @change="onMediaChange" />
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-sm text-n-slate-12">
            {{ t('GTI_CAMPAIGNS.FORM.INTERVAL') }}
          </span>
          <div class="grid gap-3 grid-cols-2">
            <Input
              v-model.number="form.minInterval"
              type="number"
              min="5"
              max="600"
              :label="t('GTI_CAMPAIGNS.FORM.INTERVAL_MIN')"
            />
            <Input
              v-model.number="form.maxInterval"
              type="number"
              min="5"
              max="600"
              :label="t('GTI_CAMPAIGNS.FORM.INTERVAL_MAX')"
            />
          </div>
          <span class="text-xs text-n-slate-10">
            {{ t('GTI_CAMPAIGNS.FORM.INTERVAL_HELP') }}
          </span>
        </div>
      </div>
    </Dialog>

    <Dialog
      ref="deleteDialogRef"
      type="alert"
      :title="t('GTI_CAMPAIGNS.CONFIRM.DELETE_TITLE')"
      :description="
        t('GTI_CAMPAIGNS.CONFIRM.DELETE_DESCRIPTION', { name: target?.name })
      "
      :confirm-button-label="t('GTI_CAMPAIGNS.CONFIRM.YES')"
      :cancel-button-label="t('GTI_CAMPAIGNS.CONFIRM.NO')"
      @confirm="confirmDelete"
    />
    <Dialog
      ref="cancelDialogRef"
      type="alert"
      :title="t('GTI_CAMPAIGNS.CONFIRM.CANCEL_TITLE')"
      :description="t('GTI_CAMPAIGNS.CONFIRM.CANCEL_DESCRIPTION')"
      :confirm-button-label="t('GTI_CAMPAIGNS.CONFIRM.YES')"
      :cancel-button-label="t('GTI_CAMPAIGNS.CONFIRM.NO')"
      @confirm="confirmCancel"
    />
    <Dialog
      ref="reportDialogRef"
      :title="
        t('GTI_CAMPAIGNS.REPORT.TITLE', { name: reportCampaign?.name || '' })
      "
      :show-confirm-button="false"
      :cancel-button-label="t('GTI_CAMPAIGNS.REPORT.CLOSE')"
      width="3xl"
      overflow-y-auto
    >
      <GtiCampaignReport
        v-if="reportCampaign"
        :key="reportCampaign.id"
        :campaign-id="reportCampaign.id"
      />
    </Dialog>
  </div>
</template>
