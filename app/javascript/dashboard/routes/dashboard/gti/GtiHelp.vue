<script setup>
// GTI "Work" help page: short how-tos for the team and the internal support contact.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { setGtiClassicMode } from 'dashboard/helper/gtiMode';
import GtiPage from 'dashboard/components/widgets/gti/pages/GtiPage.vue';

const TOPICS = [
  'ACCEPT',
  'PEEK',
  'TRANSFER',
  'QUICK_REPLIES',
  'NOTES',
  'HISTORY',
  'AUDIO',
  'WHATSAPP_QR',
];

const { t } = useI18n();
const globalConfig = useMapGetter('globalConfig/get');
const inboxes = useMapGetter('inboxes/getInboxes');

// The support WhatsApp is the company's first WhatsApp connection.
const supportWhatsapp = computed(
  () =>
    inboxes.value.find(inbox => inbox.channel_type === 'Channel::Whatsapp')
      ?.phone_number || '—'
);
</script>

<template>
  <GtiPage :title="t('GTI.HELP.TITLE')" :subtitle="t('GTI.HELP.SUBTITLE')">
    <div
      class="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] items-start"
    >
      <section
        class="flex flex-col overflow-hidden border rounded-[0.625rem] border-n-weak bg-n-solid-1 shadow-sm"
      >
        <article
          v-for="topic in TOPICS"
          :key="topic"
          class="px-4 py-3 border-b border-n-weak last:border-b-0"
        >
          <b class="block mb-0.5 text-sm text-n-slate-12">
            {{ t(`GTI.HELP.TOPICS.${topic}.TITLE`) }}
          </b>
          <span class="text-[0.8125rem] text-n-slate-11">
            {{ t(`GTI.HELP.TOPICS.${topic}.BODY`) }}
          </span>
        </article>
      </section>
      <aside
        class="flex flex-col p-4 border rounded-[0.625rem] border-n-weak bg-n-solid-1 shadow-sm"
      >
        <b class="text-sm text-n-slate-12">{{ t('GTI.HELP.SUPPORT_TITLE') }}</b>
        <p class="m-0 mt-1.5 mb-3 text-sm text-n-slate-11">
          {{ t('GTI.HELP.SUPPORT_BODY') }}
        </p>
        <div class="flex justify-between gap-2.5 py-0.5 text-[0.8125rem]">
          <span class="text-n-slate-11">{{
            t('GTI_PAGES.HELP.WHATSAPP')
          }}</span>
          <span class="select-all text-n-slate-12">{{ supportWhatsapp }}</span>
        </div>
        <div class="flex justify-between gap-2.5 py-0.5 text-[0.8125rem]">
          <span class="text-n-slate-11">{{ t('GTI_PAGES.HELP.EMAIL') }}</span>
          <span class="select-all text-n-slate-12">
            {{ t('GTI.HELP.SUPPORT_EMAIL') }}
          </span>
        </div>
        <div class="flex justify-between gap-2.5 py-0.5 text-[0.8125rem]">
          <span class="text-n-slate-11">{{ t('GTI_PAGES.HELP.VERSION') }}</span>
          <span class="text-n-slate-12">
            {{ t('GTI.SIDEBAR.VERSION', { version: globalConfig.appVersion }) }}
          </span>
        </div>
        <button
          type="button"
          class="self-start p-0 mt-3 text-xs bg-transparent border-0 text-n-slate-10 hover:text-n-brand hover:underline"
          @click="setGtiClassicMode(true)"
        >
          {{ t('GTI.CLASSIC.ENTER') }}
        </button>
      </aside>
    </div>
  </GtiPage>
</template>
