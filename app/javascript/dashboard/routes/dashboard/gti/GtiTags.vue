<script setup>
// GTI "Tags": the prototype's tag table (color chip, name, description),
// reusing Chatwoot's label dialogs.
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { picoSearch } from '@chatwoot/pico-search';
import { useAlert } from 'dashboard/composables';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import Button from 'dashboard/components-next/button/Button.vue';
import GtiPage from 'dashboard/components/widgets/gti/pages/GtiPage.vue';
import AddLabel from '../settings/labels/AddLabel.vue';
import EditLabel from '../settings/labels/EditLabel.vue';
import { GTI_TABLE_CARD, GTI_TD, GTI_TH } from 'dashboard/helper/gtiPages';

const { t } = useI18n();
const store = useStore();
const labels = useMapGetter('labels/getLabels');

const search = ref('');
const showAdd = ref(false);
const showEdit = ref(false);
const showDelete = ref(false);
const current = ref({});

const records = computed(() => {
  const query = search.value.trim();
  if (!query) return labels.value;
  return picoSearch(labels.value, query, [
    { name: 'title', weight: 4 },
    'description',
  ]);
});

onMounted(() => store.dispatch('labels/get'));

const openEdit = label => {
  current.value = label;
  showEdit.value = true;
};
const openDelete = label => {
  current.value = label;
  showDelete.value = true;
};
const confirmDelete = async () => {
  showDelete.value = false;
  try {
    await store.dispatch('labels/delete', current.value.id);
    useAlert(t('LABEL_MGMT.DELETE.API.SUCCESS_MESSAGE'));
  } catch (error) {
    useAlert(error?.message || t('LABEL_MGMT.DELETE.API.ERROR_MESSAGE'));
  }
};
</script>

<template>
  <GtiPage
    :title="t('GTI_PAGES.TAGS.TITLE')"
    :subtitle="t('GTI_PAGES.TAGS.SUBTITLE')"
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
        :label="t('GTI_PAGES.TAGS.ADD')"
        @click="showAdd = true"
      />
    </template>
    <div :class="GTI_TABLE_CARD">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th :class="GTI_TH">{{ t('GTI_PAGES.TAGS.TAG') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.TAGS.DESCRIPTION') }}</th>
            <th :class="GTI_TH">{{ t('GTI_PAGES.TAGS.SIDEBAR') }}</th>
            <th :class="GTI_TH" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="label in records" :key="label.id">
            <td :class="GTI_TD">
              <span
                class="px-[0.4375rem] py-px text-[0.65625rem] font-semibold text-white rounded whitespace-nowrap"
                :style="{ backgroundColor: label.color }"
              >
                {{ label.title }}
              </span>
            </td>
            <td :class="GTI_TD" class="text-n-slate-11">
              {{ label.description || '—' }}
            </td>
            <td :class="GTI_TD" class="text-n-slate-11">
              {{
                label.show_on_sidebar ? t('GTI_PAGES.YES') : t('GTI_PAGES.NO')
              }}
            </td>
            <td :class="GTI_TD">
              <div class="flex justify-end gap-1">
                <Button
                  v-tooltip.top="t('GTI_PAGES.EDIT')"
                  icon="i-lucide-pen"
                  size="xs"
                  color="slate"
                  variant="ghost"
                  @click="openEdit(label)"
                />
                <Button
                  v-tooltip.top="t('GTI_PAGES.DELETE')"
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="ruby"
                  variant="ghost"
                  @click="openDelete(label)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <woot-modal v-model:show="showAdd" :on-close="() => (showAdd = false)">
      <AddLabel @close="showAdd = false" />
    </woot-modal>
    <woot-modal v-model:show="showEdit" :on-close="() => (showEdit = false)">
      <EditLabel
        v-if="showEdit"
        :selected-response="current"
        @close="showEdit = false"
      />
    </woot-modal>
    <woot-delete-modal
      v-model:show="showDelete"
      :on-close="() => (showDelete = false)"
      :on-confirm="confirmDelete"
      :title="t('LABEL_MGMT.DELETE.CONFIRM.TITLE')"
      :message="t('LABEL_MGMT.DELETE.CONFIRM.MESSAGE')"
      :message-value="` ${current.title}?`"
      :confirm-text="t('LABEL_MGMT.DELETE.CONFIRM.YES')"
      :reject-text="t('LABEL_MGMT.DELETE.CONFIRM.NO')"
    />
  </GtiPage>
</template>
