<script setup>
// GTI "Conexões": one card per channel, as in the prototype, with its live
// state. "Novo QR" opens the inbox settings straight into WhatsApp pairing.
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import Button from 'dashboard/components-next/button/Button.vue';
import ChannelIcon from 'next/icon/ChannelIcon.vue';
import GtiPage from 'dashboard/components/widgets/gti/pages/GtiPage.vue';
import { getInboxIdentifier } from 'dashboard/helper/inbox';
import { requestPairing } from 'dashboard/helper/whatsappPairingRequest';
import { gtiChannelTile, gtiConnectionLine } from 'dashboard/helper/gtiPages';

const STATE_DOT = {
  connected: 'bg-n-teal-9',
  connecting: 'bg-n-amber-9 animate-pulse',
  disconnected: 'bg-n-amber-9',
};

const { t } = useI18n();
const store = useStore();
const route = useRoute();
const router = useRouter();
const inboxes = useMapGetter('inboxes/getInboxes');

const cards = computed(() =>
  inboxes.value.map(inbox => ({
    inbox,
    identifier: getInboxIdentifier(inbox),
    ...gtiConnectionLine(inbox),
  }))
);

onMounted(() => store.dispatch('inboxes/get'));

const openSettings = inbox =>
  router.push({
    name: 'settings_inbox_show',
    params: { accountId: route.params.accountId, inboxId: inbox.id },
  });

const newQr = inbox => {
  requestPairing(inbox.id);
  openSettings(inbox);
};

const addConnection = () =>
  router.push({
    name: 'settings_inbox_new',
    params: { accountId: route.params.accountId },
  });

const stateLabel = card =>
  t(`GTI_PAGES.CONNECTIONS.STATE.${card.state.toUpperCase()}`);
const kindLabel = card =>
  card.isSession
    ? t('GTI_PAGES.CONNECTIONS.KIND_QR')
    : t('GTI_PAGES.CONNECTIONS.KIND_CHANNEL');
</script>

<template>
  <GtiPage
    :title="t('GTI_PAGES.CONNECTIONS.TITLE')"
    :subtitle="t('GTI_PAGES.CONNECTIONS.SUBTITLE')"
  >
    <template #toolbar>
      <Button
        icon="i-lucide-plus"
        size="sm"
        :label="t('GTI_PAGES.CONNECTIONS.ADD')"
        @click="addConnection"
      />
    </template>
    <div class="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
      <div
        v-for="card in cards"
        :key="card.inbox.id"
        class="flex flex-col gap-2.5 p-4 border rounded-[0.625rem] border-n-weak bg-n-solid-1 shadow-sm"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="flex items-center justify-center text-white rounded-[0.625rem] size-10 shrink-0"
            :class="gtiChannelTile(card.inbox.channel_type)"
          >
            <ChannelIcon :inbox="card.inbox" class="size-5" />
          </div>
          <div class="min-w-0">
            <b class="block text-sm truncate text-n-slate-12">{{
              card.inbox.name
            }}</b>
            <span class="block text-xs truncate text-n-slate-11">
              {{ card.identifier || '—' }}
            </span>
          </div>
        </div>
        <span class="inline-flex items-center gap-1.5 text-xs text-n-slate-12">
          <span class="rounded-full size-2" :class="STATE_DOT[card.state]" />
          {{ stateLabel(card) }} · {{ kindLabel(card) }}
        </span>
        <div class="flex gap-1.5 mt-auto">
          <Button
            size="xs"
            color="slate"
            variant="faded"
            :label="t('GTI_PAGES.CONNECTIONS.CONFIGURE')"
            @click="openSettings(card.inbox)"
          />
          <Button
            v-if="card.isSession"
            size="xs"
            :color="card.state === 'connected' ? 'slate' : 'teal'"
            :variant="card.state === 'connected' ? 'faded' : 'solid'"
            :label="t('GTI_PAGES.CONNECTIONS.NEW_QR')"
            @click="newQr(card.inbox)"
          />
        </div>
      </div>
    </div>
  </GtiPage>
</template>
