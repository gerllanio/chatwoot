<script setup>
// Left column of the e-mail screen: every e-mail box, expandable into its folders.
import { useI18n } from 'vue-i18n';
import Button from 'dashboard/components-next/button/Button.vue';
import { folderIcon } from 'dashboard/helper/gtiMail';

defineProps({
  mailboxes: { type: Array, required: true },
  foldersByInbox: { type: Object, required: true },
  openIds: { type: Array, required: true },
  selected: { type: Object, default: null },
  loadingIds: { type: Array, default: () => [] },
});

const emit = defineEmits(['toggle', 'select', 'newFolder', 'compose', 'add']);
const { t } = useI18n();

const isSelected = (selected, inboxId, folder) =>
  selected?.inboxId === inboxId && selected?.folder === folder.path;
</script>

<template>
  <nav class="flex flex-col h-full overflow-y-auto bg-n-solid-1">
    <div class="p-3">
      <Button
        class="justify-center w-full"
        icon="i-lucide-pen-line"
        :label="t('GTI_MAIL.COMPOSE')"
        @click="emit('compose')"
      />
    </div>
    <div
      v-for="mailbox in mailboxes"
      :key="mailbox.id"
      class="border-b border-n-weak"
    >
      <button
        type="button"
        class="flex items-center w-full gap-2 px-3 py-2.5 text-sm font-semibold text-start text-n-slate-12 hover:bg-n-alpha-1"
        :title="mailbox.email"
        @click="emit('toggle', mailbox.id)"
      >
        <span
          class="i-lucide-chevron-right size-4 shrink-0 text-n-slate-10 transition-transform"
          :class="{ 'rotate-90': openIds.includes(mailbox.id) }"
        />
        <span class="rounded-full size-2 shrink-0 bg-n-brand" />
        <span class="flex-1 min-w-0 truncate">{{ mailbox.email }}</span>
        <span
          v-if="loadingIds.includes(mailbox.id)"
          class="i-lucide-loader-circle size-4 animate-spin text-n-slate-10"
        />
        <b v-else-if="mailbox.unread" class="text-xs text-n-gti-blue">
          {{ mailbox.unread }}
        </b>
      </button>
      <p
        v-if="openIds.includes(mailbox.id) && !mailbox.imap_enabled"
        class="px-3 pb-3 m-0 text-xs text-n-slate-10"
      >
        {{ t('GTI_MAIL.IMAP_DISABLED') }}
      </p>
      <template
        v-else-if="openIds.includes(mailbox.id) && foldersByInbox[mailbox.id]"
      >
        <button
          v-for="folder in foldersByInbox[mailbox.id]"
          :key="folder.path"
          type="button"
          class="flex items-center w-full gap-2.5 py-1.5 text-sm ps-8 pe-3 text-start hover:bg-n-alpha-1"
          :class="
            isSelected(selected, mailbox.id, folder)
              ? 'bg-n-brand/10 text-n-brand font-semibold'
              : 'text-n-slate-12'
          "
          @click="emit('select', { inboxId: mailbox.id, folder: folder.path })"
        >
          <span
            class="size-4 shrink-0"
            :class="[
              folderIcon(folder),
              isSelected(selected, mailbox.id, folder)
                ? 'text-n-brand'
                : 'text-n-slate-10',
            ]"
          />
          <span class="flex-1 min-w-0 truncate">{{ folder.name }}</span>
          <b v-if="folder.unseen" class="text-xs text-n-gti-blue">
            {{ folder.unseen }}
          </b>
        </button>
        <button
          type="button"
          class="flex items-center w-full gap-2.5 py-1.5 text-sm ps-8 pe-3 text-start text-n-slate-10 hover:bg-n-alpha-1"
          @click="emit('newFolder', mailbox.id)"
        >
          <span class="i-lucide-plus size-4 shrink-0" />
          {{ t('GTI_MAIL.NEW_FOLDER') }}
        </button>
      </template>
    </div>
    <div class="p-3">
      <Button
        class="justify-center w-full"
        icon="i-lucide-plus"
        size="sm"
        color="slate"
        variant="outline"
        :label="t('GTI_MAIL.ADD_MAILBOX')"
        @click="emit('add')"
      />
    </div>
  </nav>
</template>
