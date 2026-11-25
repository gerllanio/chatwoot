<script setup>
// GTI "Work" e-mail: a mail client over the account's Email inboxes, laid out like
// the approved prototype (boxes and folders, message list, reader).
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useAlert } from 'dashboard/composables';
import { useAdmin } from 'dashboard/composables/useAdmin';
import GtiMailAPI from 'dashboard/api/gtiMail';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import GtiMailboxTree from 'dashboard/components/widgets/gti/mail/GtiMailboxTree.vue';
import GtiMailList from 'dashboard/components/widgets/gti/mail/GtiMailList.vue';
import GtiMailReader from 'dashboard/components/widgets/gti/mail/GtiMailReader.vue';
import GtiMailCompose from 'dashboard/components/widgets/gti/mail/GtiMailCompose.vue';
import { conversationUrl, frontendURL } from 'dashboard/helper/URLHelper';
import {
  forwardDraft,
  fullDate,
  replyDraft,
  sortFolders,
} from 'dashboard/helper/gtiMail';

const VIEWS = { BOXES: 'boxes', LIST: 'list', READ: 'read' };
const INBOX = 'INBOX';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { isAdmin } = useAdmin();

const mailboxes = ref([]);
const foldersByInbox = reactive({});
const openIds = ref([]);
const loadingIds = ref([]);
const selected = ref(null);
const messages = ref([]);
const hasMore = ref(false);
const query = ref('');
const isLoadingList = ref(false);
const current = ref(null);
const isLoadingMessage = ref(false);
const isBusy = ref(false);
const isSending = ref(false);
const view = ref(VIEWS.BOXES);
const composeRef = ref(null);
const folderDialogRef = ref(null);
const newFolderName = ref('');
const newFolderInbox = ref(null);

const PAGE_SIZE = 50;

const errorMessage = error =>
  error?.response?.data?.error || t('GTI_MAIL.GENERIC_ERROR');

const currentMailbox = computed(() =>
  mailboxes.value.find(mailbox => mailbox.id === selected.value?.inboxId)
);
const currentFolders = computed(
  () => foldersByInbox[selected.value?.inboxId] || []
);
const currentFolderName = computed(
  () =>
    currentFolders.value.find(folder => folder.path === selected.value?.folder)
      ?.name ||
    selected.value?.folder ||
    ''
);

const loadFolders = async inboxId => {
  loadingIds.value = [...loadingIds.value, inboxId];
  try {
    const { data } = await GtiMailAPI.folders(inboxId);
    foldersByInbox[inboxId] = sortFolders(data.payload);
  } catch (error) {
    useAlert(errorMessage(error));
  } finally {
    loadingIds.value = loadingIds.value.filter(id => id !== inboxId);
  }
};

const loadMessages = async ({ append = false } = {}) => {
  if (!selected.value) return;
  isLoadingList.value = true;
  const beforeUid = append ? messages.value.at(-1)?.uid : undefined;
  try {
    const { data } = await GtiMailAPI.messages(selected.value.inboxId, {
      folder: selected.value.folder,
      beforeUid,
      query: query.value,
    });
    messages.value = append
      ? [...messages.value, ...data.payload]
      : data.payload;
    hasMore.value = data.payload.length === PAGE_SIZE;
  } catch (error) {
    if (!append) messages.value = [];
    hasMore.value = false;
    useAlert(errorMessage(error));
  } finally {
    isLoadingList.value = false;
  }
};

const selectFolder = ({ inboxId, folder }) => {
  selected.value = { inboxId, folder };
  current.value = null;
  query.value = '';
  view.value = VIEWS.LIST;
  loadMessages();
};

const toggleMailbox = async inboxId => {
  if (openIds.value.includes(inboxId)) {
    openIds.value = openIds.value.filter(id => id !== inboxId);
    return;
  }
  openIds.value = [...openIds.value, inboxId];
  const mailbox = mailboxes.value.find(item => item.id === inboxId);
  if (mailbox?.imap_enabled && !foldersByInbox[inboxId]) {
    await loadFolders(inboxId);
  }
};

const bumpUnseen = (inboxId, folderPath, delta) => {
  const folder = foldersByInbox[inboxId]?.find(
    item => item.path === folderPath
  );
  if (folder) folder.unseen = Math.max(0, (folder.unseen || 0) + delta);
  const mailbox = mailboxes.value.find(item => item.id === inboxId);
  if (mailbox && folderPath === INBOX && mailbox.unread) {
    mailbox.unread = Math.max(0, mailbox.unread + delta);
  }
};

const openMessage = async uid => {
  const { inboxId, folder } = selected.value;
  view.value = VIEWS.READ;
  isLoadingMessage.value = true;
  try {
    const { data } = await GtiMailAPI.message(inboxId, folder, uid);
    current.value = data;
    const row = messages.value.find(message => message.uid === uid);
    if (row && !row.seen) {
      row.seen = true;
      bumpUnseen(inboxId, folder, -1);
      GtiMailAPI.markSeen(inboxId, folder, uid).catch(() => {});
    }
  } catch (error) {
    current.value = null;
    useAlert(errorMessage(error));
  } finally {
    isLoadingMessage.value = false;
  }
};

const removeCurrentFromList = () => {
  const uid = current.value?.uid;
  messages.value = messages.value.filter(message => message.uid !== uid);
  current.value = null;
  view.value = VIEWS.LIST;
};

const runAction = async (action, successKey) => {
  isBusy.value = true;
  try {
    await action();
    if (successKey) useAlert(t(successKey));
    return true;
  } catch (error) {
    useAlert(errorMessage(error));
    return false;
  } finally {
    isBusy.value = false;
  }
};

const onMove = async target => {
  const { inboxId, folder } = selected.value;
  const done = await runAction(
    () => GtiMailAPI.move(inboxId, folder, current.value.uid, target),
    'GTI_MAIL.MOVED'
  );
  if (done) {
    removeCurrentFromList();
    loadFolders(inboxId);
  }
};

const onDelete = async () => {
  const { inboxId, folder } = selected.value;
  const done = await runAction(
    () => GtiMailAPI.remove(inboxId, folder, current.value.uid),
    'GTI_MAIL.DELETED'
  );
  if (done) {
    removeCurrentFromList();
    loadFolders(inboxId);
  }
};

const onToConversation = async () => {
  const { inboxId, folder } = selected.value;
  isBusy.value = true;
  try {
    const { data } = await GtiMailAPI.toConversation(
      inboxId,
      folder,
      current.value.uid
    );
    useAlert(t('GTI_MAIL.CONVERTED'));
    router.push(
      frontendURL(
        conversationUrl({
          accountId: route.params.accountId,
          id: data.conversation_id,
        })
      )
    );
  } catch (error) {
    useAlert(errorMessage(error));
  } finally {
    isBusy.value = false;
  }
};

const quoteHeader = message =>
  t('GTI_MAIL.QUOTE_HEADER', {
    name: message.from_name || message.from_email,
    date: fullDate(message.date),
  });

const onCompose = () => composeRef.value?.open();
const onReply = () =>
  composeRef.value?.open({
    inboxId: selected.value.inboxId,
    ...replyDraft(current.value, quoteHeader(current.value)),
  });
const onForward = () =>
  composeRef.value?.open({
    inboxId: selected.value.inboxId,
    ...forwardDraft(current.value, quoteHeader(current.value)),
  });

const onSend = async draft => {
  isSending.value = true;
  try {
    await GtiMailAPI.send(draft.inboxId, draft);
    useAlert(t('GTI_MAIL.SENT'));
    composeRef.value?.close();
  } catch (error) {
    useAlert(errorMessage(error));
  } finally {
    isSending.value = false;
  }
};

const onDownload = async file => {
  const { inboxId, folder } = selected.value;
  try {
    const { data } = await GtiMailAPI.downloadAttachment(
      inboxId,
      folder,
      current.value.uid,
      file.index
    );
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename || 'anexo';
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    useAlert(errorMessage(error));
  }
};

const askNewFolder = inboxId => {
  newFolderInbox.value = inboxId;
  newFolderName.value = '';
  folderDialogRef.value?.open();
};

const createFolder = async () => {
  const name = newFolderName.value.trim();
  if (!name) return;
  const done = await runAction(async () => {
    const { data } = await GtiMailAPI.createFolder(newFolderInbox.value, name);
    foldersByInbox[newFolderInbox.value] = sortFolders(data.payload);
  }, 'GTI_MAIL.FOLDER_CREATED');
  if (done) folderDialogRef.value?.close();
};

const onSearch = value => {
  query.value = value;
  loadMessages();
};

const onAddMailbox = () =>
  router.push({
    name: 'settings_inboxes_page_channel',
    params: { accountId: route.params.accountId, sub_page: 'email' },
  });

onMounted(async () => {
  try {
    const { data } = await GtiMailAPI.mailboxes({ withUnread: true });
    mailboxes.value = data.payload;
  } catch (error) {
    useAlert(errorMessage(error));
    return;
  }
  const first = mailboxes.value.find(mailbox => mailbox.imap_enabled);
  if (!first) return;
  await toggleMailbox(first.id);
  if (foldersByInbox[first.id])
    selectFolder({ inboxId: first.id, folder: INBOX });
});
</script>

<template>
  <div class="flex w-full h-full min-h-0 bg-n-background">
    <div
      v-if="!mailboxes.length"
      class="flex flex-col items-center justify-center flex-1 gap-3 p-6 text-sm text-center text-n-slate-11"
    >
      <span class="i-lucide-mail size-14 opacity-30" />
      <b class="text-base text-n-slate-12">{{ t('GTI_MAIL.EMPTY_TITLE') }}</b>
      <p class="max-w-md m-0">
        {{ isAdmin ? t('GTI_MAIL.EMPTY_ADMIN') : t('GTI_MAIL.EMPTY_AGENT') }}
      </p>
      <button
        v-if="isAdmin"
        type="button"
        class="px-4 py-2 font-medium text-white rounded-lg bg-n-brand"
        @click="onAddMailbox"
      >
        {{ t('GTI_MAIL.ADD_MAILBOX') }}
      </button>
    </div>
    <template v-else>
      <div
        class="w-full border-e md:w-60 md:flex-none border-n-weak"
        :class="view === VIEWS.BOXES ? 'block' : 'hidden md:block'"
      >
        <GtiMailboxTree
          :mailboxes="mailboxes"
          :folders-by-inbox="foldersByInbox"
          :open-ids="openIds"
          :loading-ids="loadingIds"
          :selected="selected"
          @toggle="toggleMailbox"
          @select="selectFolder"
          @new-folder="askNewFolder"
          @compose="onCompose"
          @add="onAddMailbox"
        />
      </div>
      <div
        class="w-full min-w-0 border-e md:w-[21rem] md:flex-none border-n-weak"
        :class="view === VIEWS.LIST ? 'block' : 'hidden md:block'"
      >
        <GtiMailList
          v-if="selected"
          :title="currentFolderName"
          :subtitle="currentMailbox?.email || ''"
          :messages="messages"
          :selected-uid="current?.uid ?? null"
          :is-loading="isLoadingList"
          :has-more="hasMore"
          :query="query"
          @open="openMessage"
          @more="loadMessages({ append: true })"
          @search="onSearch"
          @refresh="loadMessages()"
          @back="view = VIEWS.BOXES"
        />
      </div>
      <div
        class="flex-1 min-w-0"
        :class="view === VIEWS.READ ? 'block' : 'hidden md:block'"
      >
        <GtiMailReader
          :message="current"
          :is-loading="isLoadingMessage"
          :is-busy="isBusy"
          :folders="currentFolders"
          :current-folder="selected?.folder || ''"
          @reply="onReply"
          @forward="onForward"
          @to-conversation="onToConversation"
          @move="onMove"
          @delete="onDelete"
          @download="onDownload"
          @back="view = VIEWS.LIST"
        />
      </div>
    </template>
    <GtiMailCompose
      ref="composeRef"
      :mailboxes="mailboxes"
      :is-sending="isSending"
      @send="onSend"
    />
    <Dialog
      ref="folderDialogRef"
      :title="t('GTI_MAIL.NEW_FOLDER')"
      :confirm-button-label="t('GTI_MAIL.CREATE')"
      :disable-confirm-button="!newFolderName.trim() || isBusy"
      @confirm="createFolder"
    >
      <input
        v-model="newFolderName"
        type="text"
        class="!mb-0"
        :placeholder="t('GTI_MAIL.FOLDER_NAME')"
        @keyup.enter="createFolder"
      />
    </Dialog>
  </div>
</template>
