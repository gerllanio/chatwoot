<script setup>
// Shipping report of a GTI campaign: totals plus each send, filterable by status.
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { messageTimestamp } from 'shared/helpers/timeHelper';
import GtiCampaignsAPI from 'dashboard/api/gtiCampaigns';
import Button from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  campaignId: { type: Number, required: true },
});

const SHIPPING_STATUS_CLASSES = {
  pending: 'text-n-slate-11',
  delivered: 'text-n-teal-11',
  failed: 'text-n-ruby-11',
};
const FILTERS = ['', 'delivered', 'failed', 'pending'];

const { t } = useI18n();
const route = useRoute();

const campaign = ref(null);
const shippings = ref([]);
const meta = ref({ count: 0, page: 1, per_page: 100 });
const status = ref('');
const page = ref(1);

const pages = computed(() =>
  Math.max(1, Math.ceil(meta.value.count / meta.value.per_page))
);
const totals = computed(() => campaign.value?.shippings || {});

const filterLabel = value =>
  value
    ? t(`GTI_CAMPAIGNS.SHIPPING_STATUS.${value.toUpperCase()}`)
    : t('GTI_CAMPAIGNS.REPORT.FILTER_ALL');

const load = async () => {
  const { data } = await GtiCampaignsAPI.report(props.campaignId, {
    status: status.value || undefined,
    page: page.value,
  });
  campaign.value = data.campaign;
  shippings.value = data.payload;
  meta.value = data.meta;
};

const conversationRoute = displayId => ({
  name: 'inbox_conversation',
  params: { accountId: route.params.accountId, conversation_id: displayId },
});

watch(status, () => {
  page.value = 1;
  load();
});
watch(page, load);
onMounted(load);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid gap-2 grid-cols-2 sm:grid-cols-4">
      <div
        v-for="key in ['total', 'delivered', 'failed', 'pending']"
        :key="key"
        class="p-3 rounded-lg bg-n-alpha-2"
      >
        <span class="block text-xs text-n-slate-11">
          {{ t(`GTI_CAMPAIGNS.REPORT.${key.toUpperCase()}`) }}
        </span>
        <b class="text-xl tabular-nums text-n-slate-12">
          {{ totals[key] ?? 0 }}
        </b>
      </div>
    </div>

    <div class="flex flex-wrap gap-1">
      <button
        v-for="value in FILTERS"
        :key="value || 'all'"
        type="button"
        class="px-3 py-1 text-xs border rounded-lg border-n-weak"
        :class="
          status === value
            ? 'bg-n-brand text-white'
            : 'bg-n-solid-1 text-n-slate-11'
        "
        @click="status = value"
      >
        {{ filterLabel(value) }}
      </button>
    </div>

    <p v-if="!shippings.length" class="m-0 text-sm text-n-slate-10">
      {{ t('GTI_CAMPAIGNS.REPORT.EMPTY') }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-n-slate-11">
            <th class="px-2 py-2 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.REPORT.CONTACT') }}
            </th>
            <th class="px-2 py-2 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.REPORT.NUMBER') }}
            </th>
            <th class="px-2 py-2 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.REPORT.MESSAGE') }}
            </th>
            <th class="px-2 py-2 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.REPORT.STATUS') }}
            </th>
            <th class="px-2 py-2 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.REPORT.SENT_AT') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="shipping in shippings"
            :key="shipping.id"
            class="border-t border-n-weak text-n-slate-12"
          >
            <td class="px-2 py-2">{{ shipping.name || '—' }}</td>
            <td class="px-2 py-2 tabular-nums">{{ shipping.number }}</td>
            <td class="max-w-xs px-2 py-2 truncate" :title="shipping.message">
              {{ shipping.message }}
            </td>
            <td
              class="px-2 py-2"
              :class="SHIPPING_STATUS_CLASSES[shipping.status]"
            >
              {{
                t(
                  `GTI_CAMPAIGNS.SHIPPING_STATUS.${shipping.status.toUpperCase()}`
                )
              }}
              <span v-if="shipping.error" class="block text-xs">
                {{ shipping.error }}
              </span>
            </td>
            <td class="px-2 py-2 whitespace-nowrap">
              <router-link
                v-if="shipping.conversation_display_id"
                :to="conversationRoute(shipping.conversation_display_id)"
                class="text-n-brand hover:underline"
                :title="t('GTI_CAMPAIGNS.REPORT.OPEN_CONVERSATION')"
              >
                {{ messageTimestamp(shipping.delivered_at, 'dd/MM HH:mm') }}
              </router-link>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pages > 1" class="flex items-center justify-end gap-2">
      <Button
        :label="t('GTI_CAMPAIGNS.ITEMS.PREVIOUS')"
        slate
        faded
        xs
        :disabled="page <= 1"
        @click="page -= 1"
      />
      <span class="text-xs text-n-slate-11">
        {{ t('GTI_CAMPAIGNS.ITEMS.PAGE', { page, pages }) }}
      </span>
      <Button
        :label="t('GTI_CAMPAIGNS.ITEMS.NEXT')"
        slate
        faded
        xs
        :disabled="page >= pages"
        @click="page += 1"
      />
    </div>
  </div>
</template>
