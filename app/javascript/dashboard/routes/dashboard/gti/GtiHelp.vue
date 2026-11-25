<script setup>
// GTI "Work" help page: short how-tos for the team and the internal support contact.
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { setGtiClassicMode } from 'dashboard/helper/gtiMode';

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
</script>

<template>
  <div class="flex flex-col w-full h-full gap-6 p-6 overflow-y-auto">
    <header>
      <h1 class="m-0 text-2xl font-semibold text-n-slate-12">
        {{ t('GTI.HELP.TITLE') }}
      </h1>
      <p class="m-0 mt-1 text-sm text-n-slate-11">
        {{ t('GTI.HELP.SUBTITLE') }}
      </p>
    </header>
    <div class="grid gap-4 grid-cols-1 lg:grid-cols-[2fr_1fr] items-start">
      <section
        class="flex flex-col overflow-hidden border rounded-xl border-n-weak bg-n-solid-1"
      >
        <article
          v-for="topic in TOPICS"
          :key="topic"
          class="px-4 py-3 border-b border-n-weak last:border-b-0"
        >
          <h2 class="m-0 text-sm font-semibold text-n-slate-12">
            {{ t(`GTI.HELP.TOPICS.${topic}.TITLE`) }}
          </h2>
          <p class="m-0 mt-1 text-sm text-n-slate-11">
            {{ t(`GTI.HELP.TOPICS.${topic}.BODY`) }}
          </p>
        </article>
      </section>
      <aside
        class="flex flex-col gap-2 p-4 text-sm border rounded-xl border-n-weak bg-n-solid-1"
      >
        <h2 class="m-0 text-base font-semibold text-n-slate-12">
          {{ t('GTI.HELP.SUPPORT_TITLE') }}
        </h2>
        <p class="m-0 text-n-slate-11">{{ t('GTI.HELP.SUPPORT_BODY') }}</p>
        <p class="m-0 select-all text-n-slate-12">
          {{ t('GTI.HELP.SUPPORT_EMAIL') }}
        </p>
        <p class="m-0 text-xs text-n-slate-10">
          {{ t('GTI.SIDEBAR.VERSION', { version: globalConfig.appVersion }) }}
        </p>
        <button
          type="button"
          class="self-start p-0 mt-2 text-xs bg-transparent border-0 text-n-slate-10 hover:text-n-brand hover:underline"
          @click="setGtiClassicMode(true)"
        >
          {{ t('GTI.CLASSIC.ENTER') }}
        </button>
      </aside>
    </div>
  </div>
</template>
