<script setup>
// GTI "Work" messages API page: the Ticketz "API" screen rebuilt for Work, with the
// documentation, the tokens per connection and the two send tests.
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useMapGetter } from 'dashboard/composables/store';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { dynamicTime } from 'shared/helpers/timeHelper';
import GtiApiTokensAPI from 'dashboard/api/gtiApiTokens';
import Button from 'dashboard/components-next/button/Button.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import Select from 'dashboard/components-next/select/Select.vue';
import {
  GTI_MEDIA_FORM_EXAMPLE,
  GTI_MEDIA_HEADERS_EXAMPLE,
  GTI_TEXT_BODY_EXAMPLE,
  GTI_TEXT_HEADERS_EXAMPLE,
  gtiMessagesApiEndpoints,
  sendGtiTestMessage,
} from 'dashboard/helper/gtiMessagesApi';

const WHATSAPP_CHANNEL = 'Channel::Whatsapp';
const CONFIRM_WINDOW_MS = 4000;
const HTTP_METHOD = 'POST';
const MASK_HEAD = 6;
const MASK_TAIL = 4;

const maskToken = token =>
  `${token.slice(0, MASK_HEAD)}…${token.slice(-MASK_TAIL)}`;
const withColon = label => `${label}:`;

const { t } = useI18n();
const store = useStore();
const inboxes = useMapGetter('inboxes/getInboxes');

const origin = window.location.origin;
const endpoints = gtiMessagesApiEndpoints(origin);

const tokens = ref([]);
const newName = ref('');
const newInboxId = ref('');
const isSaving = ref(false);
const pendingConfirm = ref(null);

const textTest = ref({ tokenId: '', number: '', body: '', isSending: false });
const mediaTest = ref({
  tokenId: '',
  number: '',
  body: '',
  file: null,
  isSending: false,
});

const whatsappInboxOptions = computed(() =>
  inboxes.value
    .filter(inbox => inbox.channel_type === WHATSAPP_CHANNEL)
    .map(inbox => ({ value: inbox.id, label: inbox.name }))
);

const tokenOptions = computed(() =>
  tokens.value.map(token => ({
    value: token.id,
    label: `${token.name} · ${token.inbox_name}`,
  }))
);

const docSections = computed(() => [
  {
    key: 'text',
    title: t('GTI_MESSAGES_API.TEXT.TITLE'),
    info: t('GTI_MESSAGES_API.TEXT.INFO'),
    headers: GTI_TEXT_HEADERS_EXAMPLE,
    bodyLabel: t('GTI_MESSAGES_API.FIELDS.BODY'),
    body: GTI_TEXT_BODY_EXAMPLE,
  },
  {
    key: 'media',
    title: t('GTI_MESSAGES_API.MEDIA.TITLE'),
    info: t('GTI_MESSAGES_API.MEDIA.INFO'),
    headers: GTI_MEDIA_HEADERS_EXAMPLE,
    bodyLabel: t('GTI_MESSAGES_API.FIELDS.FORM_DATA'),
    body: GTI_MEDIA_FORM_EXAMPLE,
  },
]);

const fetchTokens = async () => {
  const { data } = await GtiApiTokensAPI.get();
  tokens.value = data.payload;
};

const tokenById = id => tokens.value.find(token => token.id === id);

const createToken = async () => {
  if (!newName.value.trim() || !newInboxId.value) {
    return;
  }
  isSaving.value = true;
  try {
    await GtiApiTokensAPI.create({
      gti_api_token: { name: newName.value.trim(), inbox_id: newInboxId.value },
    });
    newName.value = '';
    newInboxId.value = '';
    await fetchTokens();
    useAlert(t('GTI_MESSAGES_API.TOKENS.CREATED'));
  } catch {
    useAlert(t('GTI_MESSAGES_API.TOKENS.ERROR'));
  } finally {
    isSaving.value = false;
  }
};

const copyToken = async token => {
  await copyTextToClipboard(token.token);
  useAlert(t('GTI_MESSAGES_API.TOKENS.COPIED'));
};

// Regenerating or deleting breaks the integrations using the token, so the first
// click only arms the action and a second click within a few seconds runs it.
const isArmed = (action, token) =>
  pendingConfirm.value?.action === action &&
  pendingConfirm.value?.id === token.id;

const armOrRun = async (action, token, run, confirmMessage) => {
  if (!isArmed(action, token)) {
    pendingConfirm.value = { action, id: token.id };
    useAlert(confirmMessage);
    setTimeout(() => {
      if (isArmed(action, token)) {
        pendingConfirm.value = null;
      }
    }, CONFIRM_WINDOW_MS);
    return;
  }
  pendingConfirm.value = null;
  await run();
  await fetchTokens();
};

const regenerateToken = token =>
  armOrRun(
    'regenerate',
    token,
    async () => {
      await GtiApiTokensAPI.regenerate(token.id);
      useAlert(t('GTI_MESSAGES_API.TOKENS.REGENERATED'));
    },
    t('GTI_MESSAGES_API.TOKENS.REGENERATE_CONFIRM')
  );

const deleteToken = token =>
  armOrRun(
    'delete',
    token,
    async () => {
      await GtiApiTokensAPI.delete(token.id);
      useAlert(t('GTI_MESSAGES_API.TOKENS.DELETED'));
    },
    t('GTI_MESSAGES_API.TOKENS.DELETE_CONFIRM')
  );

const runTest = async (test, withFile) => {
  const token = tokenById(test.tokenId);
  if (!token || !test.number) {
    return;
  }
  test.isSending = true;
  try {
    await sendGtiTestMessage({
      origin,
      token: token.token,
      number: test.number,
      body: test.body,
      file: withFile ? test.file : null,
    });
    useAlert(t('GTI_MESSAGES_API.TEST.SUCCESS'));
    await fetchTokens();
  } catch (error) {
    useAlert(t('GTI_MESSAGES_API.TEST.ERROR', { error: error.message }));
  } finally {
    test.isSending = false;
  }
};

const onFileChange = event => {
  mediaTest.value.file = event.target.files?.[0] || null;
};

onMounted(() => {
  store.dispatch('inboxes/get');
  fetchTokens();
});
</script>

<template>
  <div class="flex flex-col w-full h-full overflow-y-auto bg-n-background">
    <div class="flex flex-col w-full max-w-5xl gap-6 px-6 py-6 mx-auto">
      <header>
        <h1 class="m-0 text-2xl font-semibold text-n-slate-12">
          {{ t('GTI_MESSAGES_API.TITLE') }}
        </h1>
        <p class="m-0 mt-1 text-sm text-n-slate-11">
          {{ t('GTI_MESSAGES_API.SUBTITLE') }}
        </p>
      </header>

      <section class="flex flex-col gap-2">
        <h2 class="m-0 text-lg font-semibold text-n-slate-12">
          {{ t('GTI_MESSAGES_API.METHODS.TITLE') }}
        </h2>
        <ol class="m-0 text-sm ps-5 text-n-slate-12">
          <li>{{ t('GTI_MESSAGES_API.METHODS.TEXT') }}</li>
          <li>{{ t('GTI_MESSAGES_API.METHODS.MEDIA') }}</li>
        </ol>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="m-0 text-lg font-semibold text-n-slate-12">
          {{ t('GTI_MESSAGES_API.INSTRUCTIONS.TITLE') }}
        </h2>
        <ul class="flex flex-col gap-1 m-0 text-sm ps-5 text-n-slate-12">
          <li>{{ t('GTI_MESSAGES_API.INSTRUCTIONS.TOKEN') }}</li>
          <li>
            {{ t('GTI_MESSAGES_API.INSTRUCTIONS.NUMBER') }}
            <ul class="mt-1 ps-5">
              <li>{{ t('GTI_MESSAGES_API.INSTRUCTIONS.NUMBER_PHONE') }}</li>
              <li>{{ t('GTI_MESSAGES_API.INSTRUCTIONS.NUMBER_JID') }}</li>
            </ul>
          </li>
          <li>{{ t('GTI_MESSAGES_API.INSTRUCTIONS.SAVE_ON_TICKET') }}</li>
        </ul>
      </section>

      <section
        class="flex flex-col gap-3 p-4 border rounded-xl border-n-weak bg-n-solid-1"
      >
        <div>
          <h2 class="m-0 text-lg font-semibold text-n-slate-12">
            {{ t('GTI_MESSAGES_API.TOKENS.TITLE') }}
          </h2>
          <p class="m-0 mt-1 text-sm text-n-slate-11">
            {{ t('GTI_MESSAGES_API.TOKENS.DESCRIPTION') }}
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-2">
          <Input
            v-model="newName"
            class="flex-1 min-w-48"
            :label="t('GTI_MESSAGES_API.TOKENS.NAME')"
            :placeholder="t('GTI_MESSAGES_API.TOKENS.NAME_PLACEHOLDER')"
          />
          <Select
            v-model="newInboxId"
            class="min-w-48"
            :options="whatsappInboxOptions"
            :placeholder="t('GTI_MESSAGES_API.TOKENS.SELECT_CONNECTION')"
          />
          <Button
            :label="t('GTI_MESSAGES_API.TOKENS.CREATE')"
            icon="i-lucide-plus"
            :is-loading="isSaving"
            :disabled="!newName.trim() || !newInboxId"
            @click="createToken"
          />
        </div>
        <p v-if="!tokens.length" class="m-0 text-sm text-n-slate-10">
          {{ t('GTI_MESSAGES_API.TOKENS.EMPTY') }}
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-start text-n-slate-11">
                <th class="py-2 font-medium text-start">
                  {{ t('GTI_MESSAGES_API.TOKENS.NAME') }}
                </th>
                <th class="py-2 font-medium text-start">
                  {{ t('GTI_MESSAGES_API.TOKENS.CONNECTION') }}
                </th>
                <th class="py-2 font-medium text-start">
                  {{ t('GTI_MESSAGES_API.TOKENS.TOKEN') }}
                </th>
                <th class="py-2 font-medium text-start">
                  {{ t('GTI_MESSAGES_API.TOKENS.LAST_USED') }}
                </th>
                <th class="py-2 font-medium text-end">
                  {{ t('GTI_MESSAGES_API.TOKENS.ACTIONS') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="token in tokens"
                :key="token.id"
                class="border-t border-n-weak text-n-slate-12"
              >
                <td class="py-2 pe-3">{{ token.name }}</td>
                <td class="py-2 pe-3">{{ token.inbox_name }}</td>
                <td class="py-2 font-mono text-xs pe-3 text-n-slate-11">
                  {{ maskToken(token.token) }}
                </td>
                <td class="py-2 pe-3 text-n-slate-11">
                  {{
                    token.last_used_at
                      ? dynamicTime(token.last_used_at)
                      : t('GTI_MESSAGES_API.TOKENS.NEVER')
                  }}
                </td>
                <td class="py-2">
                  <div class="flex justify-end gap-1">
                    <Button
                      v-tooltip="t('GTI_MESSAGES_API.TOKENS.COPY')"
                      icon="i-lucide-copy"
                      slate
                      xs
                      ghost
                      @click="copyToken(token)"
                    />
                    <Button
                      v-tooltip="t('GTI_MESSAGES_API.TOKENS.REGENERATE')"
                      icon="i-lucide-refresh-cw"
                      :color="isArmed('regenerate', token) ? 'amber' : 'slate'"
                      xs
                      ghost
                      @click="regenerateToken(token)"
                    />
                    <Button
                      v-tooltip="t('GTI_MESSAGES_API.TOKENS.DELETE')"
                      icon="i-lucide-trash-2"
                      :color="isArmed('delete', token) ? 'ruby' : 'slate'"
                      xs
                      ghost
                      @click="deleteToken(token)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        v-for="section in docSections"
        :key="section.key"
        class="grid gap-4 md:grid-cols-2"
      >
        <div class="flex flex-col min-w-0 gap-2">
          <h2 class="m-0 text-lg font-semibold text-n-slate-12">
            {{ section.title }}
          </h2>
          <p class="m-0 text-sm text-n-slate-11">{{ section.info }}</p>
          <dl class="grid gap-1 m-0 text-sm text-n-slate-12">
            <div>
              <dt class="inline font-semibold">
                {{ withColon(t('GTI_MESSAGES_API.FIELDS.ENDPOINT')) }}
              </dt>
              <dd class="inline m-0 break-all ms-1">{{ endpoints.main }}</dd>
            </div>
            <div>
              <dt class="inline font-semibold">
                {{ withColon(t('GTI_MESSAGES_API.FIELDS.ALT_ENDPOINT')) }}
              </dt>
              <dd class="inline m-0 break-all ms-1">
                {{ endpoints.alternative }}
              </dd>
            </div>
            <div>
              <dt class="inline font-semibold">
                {{ withColon(t('GTI_MESSAGES_API.FIELDS.METHOD')) }}
              </dt>
              <dd class="inline m-0 ms-1">{{ HTTP_METHOD }}</dd>
            </div>
            <div>
              <dt class="inline font-semibold">
                {{ withColon(t('GTI_MESSAGES_API.FIELDS.HEADERS')) }}
              </dt>
              <dd class="inline m-0 ms-1">{{ section.headers }}</dd>
            </div>
            <div>
              <dt class="inline font-semibold">
                {{ withColon(section.bodyLabel) }}
              </dt>
              <dd class="inline m-0 font-mono text-xs break-all ms-1">
                {{ section.body }}
              </dd>
            </div>
          </dl>
        </div>

        <form
          class="flex flex-col gap-2 p-4 border rounded-xl border-n-weak bg-n-solid-1"
          @submit.prevent="
            section.key === 'text'
              ? runTest(textTest, false)
              : runTest(mediaTest, true)
          "
        >
          <h3 class="m-0 text-sm font-semibold text-n-slate-12">
            {{ t('GTI_MESSAGES_API.TEST.TITLE') }}
          </h3>
          <template v-if="section.key === 'text'">
            <Select
              v-model="textTest.tokenId"
              :options="tokenOptions"
              :placeholder="t('GTI_MESSAGES_API.TEST.SELECT_TOKEN')"
            />
            <Input
              v-model="textTest.number"
              :placeholder="t('GTI_MESSAGES_API.TEST.NUMBER_PLACEHOLDER')"
              :label="t('GTI_MESSAGES_API.TEST.NUMBER')"
            />
            <Input
              v-model="textTest.body"
              :label="t('GTI_MESSAGES_API.TEST.MESSAGE')"
            />
            <Button
              type="submit"
              class="self-end"
              :label="t('GTI_MESSAGES_API.TEST.SEND')"
              icon="i-lucide-send"
              :is-loading="textTest.isSending"
              :disabled="
                !textTest.tokenId || !textTest.number || !textTest.body
              "
            />
          </template>
          <template v-else>
            <Select
              v-model="mediaTest.tokenId"
              :options="tokenOptions"
              :placeholder="t('GTI_MESSAGES_API.TEST.SELECT_TOKEN')"
            />
            <Input
              v-model="mediaTest.number"
              :placeholder="t('GTI_MESSAGES_API.TEST.NUMBER_PLACEHOLDER')"
              :label="t('GTI_MESSAGES_API.TEST.NUMBER')"
            />
            <Input
              v-model="mediaTest.body"
              :label="t('GTI_MESSAGES_API.TEST.CAPTION')"
            />
            <label class="flex flex-col gap-1 text-sm text-n-slate-12">
              {{ t('GTI_MESSAGES_API.TEST.FILE') }}
              <input
                type="file"
                class="text-sm text-n-slate-11"
                @change="onFileChange"
              />
            </label>
            <Button
              type="submit"
              class="self-end"
              :label="t('GTI_MESSAGES_API.TEST.SEND')"
              icon="i-lucide-send"
              :is-loading="mediaTest.isSending"
              :disabled="
                !mediaTest.tokenId || !mediaTest.number || !mediaTest.file
              "
            />
          </template>
        </form>
      </section>
    </div>
  </div>
</template>
