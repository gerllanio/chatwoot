<script setup>
// GTI "Respostas rápidas": the prototype's shortcut / message table, reusing
// Chatwoot's add and edit dialogs (which carry the WhatsApp formatting bar).
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { picoSearch } from '@chatwoot/pico-search';
import { useAlert } from 'dashboard/composables';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useMessageFormatter } from 'shared/composables/useMessageFormatter';
import Button from 'dashboard/components-next/button/Button.vue';
import GtiPage from 'dashboard/components/widgets/gti/pages/GtiPage.vue';
import AddCanned from '../settings/canned/AddCanned.vue';
import EditCanned from '../settings/canned/EditCanned.vue';
import { GTI_TABLE_CARD, GTI_TD, GTI_TH } from 'dashboard/helper/gtiPages';

const { t } = useI18n();
const store = useStore();
const { getPlainText } = useMessageFormatter();
const sortedResponses = useMapGetter('getSortedCannedResponses');

const search = ref('');
const showAdd = ref(false);
const showEdit = ref(false);
const showDelete = ref(false);
const current = ref({});

const records = computed(() => {
  const all = sortedResponses.value('asc');
  const query = search.value.trim();
  if (!query) return all;
  return picoSearch(all, query, [{ name: 'short_code', weight: 4 }, 'content']);
});

onMounted(() => store.dispatch('getCannedResponse'));

const openEdit = response => {
  current.value = response;
  showEdit.value = true;
};
const openDelete = response => {
  current.value = response;
  showDelete.value = true;
};
const confirmDelete = async () => {
  showDelete.value = false;
  try {
    await store.dispatch('deleteCannedResponse', current.value.id);
    useAlert(t('CANNED_MGMT.DELETE.API.SUCCESS_MESSAGE'));
  } catch (error) {
    useAlert(error?.message || t('CANNED_MGMT.DELETE.API.ERROR_MESSAGE'));
  }
};
</script>

<template>
  <GtiPage
    :title="t('GTI_PAGES.QUICK.TITLE')"
    :subtitle="t('GTI_PAGES.QUICK.SUBTITLE')"
  >
    <template #toolbar>
      <input
        v-model="search"
        type="search"
        class="!mb-0 max-w-xs !h-9 text-sm"
        :placeholder="t('GTI_PAGES.SEARCH')"
      />
      <Button
        icon="i-lucide-plus"
        size="sm"
        :label="t('GTI_PAGES.QUICK.ADD')"
        @click="showAdd = true"
      />
    </template>
    <div :class="GTI_TABLE_CARD">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th :class="GTI_TH">{{ t('GTI_PAGES.QUICK.SHORTCUT') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.QUICK.MESSAGE') }}</th>
            <th :class="GTI_TH" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="response in records" :key="response.id">
            <td :class="GTI_TD" class="whitespace-nowrap">
              <b class="text-n-brand">/{{ response.short_code }}</b>
            </td>
            <td :class="GTI_TD" class="max-w-0 w-full">
              <span
                class="block truncate"
                :title="getPlainText(response.content)"
                >{{ getPlainText(response.content) }}</span>
            </td>
            <td :class="GTI_TD">
              <div class="flex justify-end gap-1">
                <Button
                  v-tooltip.top="t('GTI_PAGES.EDIT')"
                  icon="i-lucide-pen"
                  size="xs"
                  color="slate"
                  variant="ghost"
                  @click="openEdit(response)"
                />
                <Button
                  v-tooltip.top="t('GTI_PAGES.DELETE')"
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="ruby"
                  variant="ghost"
                  @click="openDelete(response)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <woot-modal v-model:show="showAdd" :on-close="() => (showAdd = false)">
      <AddCanned :on-close="() => (showAdd = false)" />
    </woot-modal>
    <woot-modal v-model:show="showEdit" :on-close="() => (showEdit = false)">
      <EditCanned
        v-if="showEdit"
        :id="current.id"
        :edshort-code="current.short_code"
        :edcontent="current.content"
        :on-close="() => (showEdit = false)"
      />
    </woot-modal>
    <woot-delete-modal
      v-model:show="showDelete"
      :on-close="() => (showDelete = false)"
      :on-confirm="confirmDelete"
      :title="t('CANNED_MGMT.DELETE.CONFIRM.TITLE')"
      :message="t('CANNED_MGMT.DELETE.CONFIRM.MESSAGE')"
      :message-value="` ${current.short_code}?`"
      :confirm-text="t('CANNED_MGMT.DELETE.CONFIRM.YES')"
      :reject-text="t('CANNED_MGMT.DELETE.CONFIRM.NO')"
    />
  </GtiPage>
</template>
