<script setup>
// GTI "Work" contact lists: the audiences of GTI campaigns.
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import GtiContactListsAPI from 'dashboard/api/gtiContactLists';
import Button from 'dashboard/components-next/button/Button.vue';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import Input from 'dashboard/components-next/input/Input.vue';

const { t } = useI18n();

const lists = ref([]);
const isLoading = ref(false);
const editing = ref(null);
const name = ref('');
const target = ref(null);
const formDialogRef = ref(null);
const deleteDialogRef = ref(null);

const canSave = computed(() => name.value.trim().length > 0);

const loadLists = async () => {
  isLoading.value = true;
  try {
    const { data } = await GtiContactListsAPI.get();
    lists.value = data.payload;
  } finally {
    isLoading.value = false;
  }
};

const openForm = list => {
  editing.value = list;
  name.value = list?.name || '';
  formDialogRef.value.open();
};

const saveList = async () => {
  if (!canSave.value) return;
  const payload = { gti_contact_list: { name: name.value.trim() } };
  if (editing.value) {
    await GtiContactListsAPI.update(editing.value.id, payload);
  } else {
    await GtiContactListsAPI.create(payload);
  }
  formDialogRef.value.close();
  useAlert(t('GTI_CAMPAIGNS.LISTS.SAVED'));
  await loadLists();
};

const askDelete = list => {
  target.value = list;
  deleteDialogRef.value.open();
};

const confirmDelete = async () => {
  await GtiContactListsAPI.delete(target.value.id);
  deleteDialogRef.value.close();
  useAlert(t('GTI_CAMPAIGNS.LISTS.DELETED'));
  await loadLists();
};

onMounted(loadLists);
</script>

<template>
  <div class="flex flex-col w-full h-full gap-5 p-6 overflow-y-auto">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="m-0 text-2xl font-semibold text-n-slate-12">
          {{ t('GTI_CAMPAIGNS.LISTS.TITLE') }}
        </h1>
        <p class="m-0 mt-1 text-sm text-n-slate-11">
          {{ t('GTI_CAMPAIGNS.LISTS.SUBTITLE') }}
        </p>
      </div>
      <Button
        :label="t('GTI_CAMPAIGNS.LISTS.NEW')"
        icon="i-lucide-plus"
        @click="openForm(null)"
      />
    </header>

    <p v-if="isLoading" class="m-0 text-sm text-n-slate-10">
      {{ t('GTI_CAMPAIGNS.LOADING') }}
    </p>
    <p v-else-if="!lists.length" class="m-0 text-sm text-n-slate-10">
      {{ t('GTI_CAMPAIGNS.LISTS.EMPTY') }}
    </p>
    <div
      v-else
      class="overflow-x-auto border rounded-xl border-n-weak bg-n-solid-1"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="text-n-slate-11">
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.LISTS.NAME') }}
            </th>
            <th class="px-4 py-3 font-medium text-start">
              {{ t('GTI_CAMPAIGNS.LISTS.COUNT') }}
            </th>
            <th class="px-4 py-3 font-medium text-end">
              {{ t('GTI_CAMPAIGNS.LISTS.ACTIONS') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="list in lists"
            :key="list.id"
            class="border-t border-n-weak text-n-slate-12"
          >
            <td class="px-4 py-3 font-medium">
              <router-link
                :to="{
                  name: 'gti_contact_list_items',
                  params: { listId: list.id },
                }"
                class="hover:underline text-n-slate-12"
              >
                {{ list.name }}
              </router-link>
            </td>
            <td class="px-4 py-3 tabular-nums">{{ list.items_count }}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <router-link
                  :to="{
                    name: 'gti_contact_list_items',
                    params: { listId: list.id },
                  }"
                >
                  <Button
                    v-tooltip.top="t('GTI_CAMPAIGNS.LISTS.OPEN')"
                    icon="i-lucide-users"
                    slate
                    faded
                    xs
                  />
                </router-link>
                <Button
                  v-tooltip.top="t('GTI_CAMPAIGNS.LISTS.RENAME')"
                  icon="i-lucide-pencil"
                  slate
                  faded
                  xs
                  @click="openForm(list)"
                />
                <Button
                  v-tooltip.top="t('GTI_CAMPAIGNS.LISTS.DELETE')"
                  icon="i-lucide-trash-2"
                  ruby
                  faded
                  xs
                  @click="askDelete(list)"
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
        editing ? t('GTI_CAMPAIGNS.LISTS.RENAME') : t('GTI_CAMPAIGNS.LISTS.NEW')
      "
      :confirm-button-label="
        editing
          ? t('GTI_CAMPAIGNS.LISTS.SAVE')
          : t('GTI_CAMPAIGNS.LISTS.CREATE')
      "
      :cancel-button-label="t('GTI_CAMPAIGNS.LISTS.CANCEL')"
      :disable-confirm-button="!canSave"
      @confirm="saveList"
    >
      <Input
        v-model="name"
        :label="t('GTI_CAMPAIGNS.LISTS.NAME')"
        :placeholder="t('GTI_CAMPAIGNS.LISTS.NAME_PLACEHOLDER')"
      />
    </Dialog>
    <Dialog
      ref="deleteDialogRef"
      type="alert"
      :title="t('GTI_CAMPAIGNS.LISTS.CONFIRM_DELETE_TITLE')"
      :description="
        t('GTI_CAMPAIGNS.LISTS.CONFIRM_DELETE_DESCRIPTION', {
          name: target?.name,
        })
      "
      :confirm-button-label="t('GTI_CAMPAIGNS.CONFIRM.YES')"
      :cancel-button-label="t('GTI_CAMPAIGNS.CONFIRM.NO')"
      @confirm="confirmDelete"
    />
  </div>
</template>
