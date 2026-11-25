<script setup>
// Recipients of one GTI contact list: search, add, edit, remove and CSV import.
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useAlert } from 'dashboard/composables';
import { debounce } from '@chatwoot/utils';
import GtiContactListsAPI from 'dashboard/api/gtiContactLists';
import Button from 'dashboard/components-next/button/Button.vue';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import Input from 'dashboard/components-next/input/Input.vue';

const SEARCH_DEBOUNCE_MS = 300;

const { t } = useI18n();
const route = useRoute();
const listId = computed(() => Number(route.params.listId));

const list = ref(null);
const items = ref([]);
const meta = ref({ count: 0, page: 1, per_page: 100 });
const search = ref('');
const page = ref(1);
const isImporting = ref(false);
const editing = ref(null);
const form = ref({ name: '', number: '', email: '' });
const fileInputRef = ref(null);
const formDialogRef = ref(null);

const pages = computed(() =>
  Math.max(1, Math.ceil(meta.value.count / meta.value.per_page))
);
const canSave = computed(
  () => form.value.number.replace(/\D/g, '').length >= 8
);

const loadList = async () => {
  const { data } = await GtiContactListsAPI.show(listId.value);
  list.value = data;
};

const loadItems = async () => {
  const { data } = await GtiContactListsAPI.items(listId.value, {
    q: search.value || undefined,
    page: page.value,
  });
  items.value = data.payload;
  meta.value = data.meta;
};

const reload = async () => {
  await Promise.all([loadList(), loadItems()]);
};

const openForm = item => {
  editing.value = item;
  form.value = {
    name: item?.name || '',
    number: item?.number || '',
    email: item?.email || '',
  };
  formDialogRef.value.open();
};

const saveItem = async () => {
  if (!canSave.value) return;
  try {
    if (editing.value) {
      await GtiContactListsAPI.updateItem(
        listId.value,
        editing.value.id,
        form.value
      );
    } else {
      await GtiContactListsAPI.createItem(listId.value, form.value);
    }
    formDialogRef.value.close();
    useAlert(t('GTI_CAMPAIGNS.ITEMS.SAVED'));
    await reload();
  } catch {
    useAlert(t('GTI_CAMPAIGNS.ALERTS.ERROR'));
  }
};

const removeItem = async item => {
  await GtiContactListsAPI.deleteItem(listId.value, item.id);
  useAlert(t('GTI_CAMPAIGNS.ITEMS.DELETED'));
  await reload();
};

const onImport = async event => {
  const [file] = event.target.files;
  if (!file) return;
  isImporting.value = true;
  try {
    const { data } = await GtiContactListsAPI.importCsv(listId.value, file);
    useAlert(t('GTI_CAMPAIGNS.ITEMS.IMPORTED', data));
    await reload();
  } catch {
    useAlert(t('GTI_CAMPAIGNS.ALERTS.ERROR'));
  } finally {
    isImporting.value = false;
    event.target.value = '';
  }
};

const searchItems = debounce(
  () => {
    page.value = 1;
    loadItems();
  },
  SEARCH_DEBOUNCE_MS,
  false
);

watch(search, searchItems);
watch(page, loadItems);
onMounted(reload);
</script>

<template>
  <div class="flex flex-col w-full h-full gap-5 p-6 overflow-y-auto">
    <router-link
      :to="{ name: 'gti_contact_lists' }"
      class="flex items-center gap-1 text-sm text-n-slate-11 hover:text-n-slate-12"
    >
      <span class="i-lucide-arrow-left size-4" />
      {{ t('GTI_CAMPAIGNS.ITEMS.BACK') }}
    </router-link>
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="m-0 text-2xl font-semibold text-n-slate-12">
          {{ list?.name }}
        </h1>
        <p class="m-0 mt-1 text-sm text-n-slate-11">
          {{
            t('GTI_CAMPAIGNS.ITEMS.COUNT', { count: list?.items_count ?? 0 })
          }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv,text/csv"
          class="hidden"
          @change="onImport"
        />
        <Button
          :label="t('GTI_CAMPAIGNS.ITEMS.IMPORT')"
          icon="i-lucide-upload"
          slate
          faded
          :is-loading="isImporting"
          @click="fileInputRef.click()"
        />
        <Button
          :label="t('GTI_CAMPAIGNS.ITEMS.ADD')"
          icon="i-lucide-plus"
          @click="openForm(null)"
        />
      </div>
    </header>

    <Input
      v-model="search"
      type="search"
      :placeholder="t('GTI_CAMPAIGNS.ITEMS.SEARCH')"
      class="max-w-sm"
    />

    <p v-if="!items.length" class="m-0 text-sm text-n-slate-10">
      {{ t('GTI_CAMPAIGNS.ITEMS.EMPTY') }}
    </p>
    <div
      v-else
      class="overflow-x-auto border rounded-xl border-n-weak bg-n-solid-1"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="text-n-slate-11">
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.ITEMS.NAME') }}
            </th>
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.ITEMS.NUMBER') }}
            </th>
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.ITEMS.EMAIL') }}
            </th>
            <th class="px-4 py-3 font-medium text-end">
              {{ t('GTI_CAMPAIGNS.ITEMS.ACTIONS') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            class="border-t border-n-weak text-n-slate-12"
          >
            <td class="px-4 py-2">{{ item.name || '—' }}</td>
            <td class="px-4 py-2 tabular-nums">{{ item.number }}</td>
            <td class="px-4 py-2">{{ item.email || '—' }}</td>
            <td class="px-4 py-2">
              <div class="flex justify-end gap-1">
                <Button
                  v-tooltip.top="t('GTI_CAMPAIGNS.ITEMS.EDIT')"
                  icon="i-lucide-pencil"
                  slate
                  faded
                  xs
                  @click="openForm(item)"
                />
                <Button
                  v-tooltip.top="t('GTI_CAMPAIGNS.ITEMS.DELETE')"
                  icon="i-lucide-trash-2"
                  ruby
                  faded
                  xs
                  @click="removeItem(item)"
                />
              </div>
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

    <Dialog
      ref="formDialogRef"
      :title="
        editing ? t('GTI_CAMPAIGNS.ITEMS.EDIT') : t('GTI_CAMPAIGNS.ITEMS.ADD')
      "
      :confirm-button-label="t('GTI_CAMPAIGNS.ITEMS.SAVE')"
      :cancel-button-label="t('GTI_CAMPAIGNS.ITEMS.CANCEL')"
      :disable-confirm-button="!canSave"
      @confirm="saveItem"
    >
      <div class="flex flex-col gap-3">
        <Input v-model="form.name" :label="t('GTI_CAMPAIGNS.ITEMS.NAME')" />
        <Input
          v-model="form.number"
          :label="t('GTI_CAMPAIGNS.ITEMS.NUMBER')"
          :placeholder="t('GTI_CAMPAIGNS.ITEMS.NUMBER_PLACEHOLDER')"
        />
        <Input
          v-model="form.email"
          type="email"
          :label="t('GTI_CAMPAIGNS.ITEMS.EMAIL')"
        />
      </div>
    </Dialog>
  </div>
</template>
