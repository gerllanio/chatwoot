<script setup>
// GTI "Integrações": the prototype's card grid. The Ticketz-compatible
// messages API comes first, then Chatwoot's own integrations.
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useBranding } from 'shared/composables/useBranding';
import Button from 'dashboard/components-next/button/Button.vue';
import GtiPage from 'dashboard/components/widgets/gti/pages/GtiPage.vue';
import { frontendURL } from 'dashboard/helper/URLHelper';

// Upstream ships these logos as SVG; the rest are PNG.
const SVG_LOGOS = ['stripe'];

const { t } = useI18n();
const store = useStore();
const route = useRoute();
const { replaceInstallationName } = useBranding();
const integrations = useMapGetter('integrations/getAppIntegrations');

const cards = computed(() =>
  integrations.value.map(item => ({
    ...item,
    logo: `/dashboard/images/integrations/${item.id}.${
      SVG_LOGOS.includes(item.id) ? 'svg' : 'png'
    }`,
  }))
);

onMounted(() => store.dispatch('integrations/get'));

// Same address upstream's integration cards open.
const routeFor = id =>
  frontendURL(`accounts/${route.params.accountId}/settings/integrations/${id}`);
</script>

<template>
  <GtiPage
    :title="t('GTI_PAGES.INTEGRATIONS.TITLE')"
    :subtitle="t('GTI_PAGES.INTEGRATIONS.SUBTITLE')"
  >
    <div class="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
      <div
        class="flex flex-col gap-2.5 p-4 border rounded-[0.625rem] border-n-weak bg-n-solid-1 shadow-sm"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="flex items-center justify-center rounded-[0.625rem] size-10 shrink-0 bg-n-brand text-white"
          >
            <span class="i-lucide-code-xml size-5" />
          </div>
          <b class="text-sm text-n-slate-12">{{
            t('GTI_MESSAGES_API.CARD.NAME')
          }}</b>
        </div>
        <span class="text-[0.8125rem] text-n-slate-11">
          {{ t('GTI_MESSAGES_API.CARD.DESCRIPTION') }}
        </span>
        <span class="inline-flex items-center gap-1.5 text-xs text-n-slate-12">
          <span class="rounded-full size-2 bg-n-teal-9" />
          {{ t('GTI_PAGES.INTEGRATIONS.ACTIVE') }}
        </span>
        <router-link
          class="mt-auto"
          :to="{
            name: 'gti_messages_api',
            params: { accountId: route.params.accountId },
          }"
        >
          <Button
            size="xs"
            color="slate"
            variant="faded"
            :label="t('GTI_PAGES.CONNECTIONS.CONFIGURE')"
          />
        </router-link>
      </div>
      <div
        v-for="card in cards"
        :key="card.id"
        class="flex flex-col gap-2.5 p-4 border rounded-[0.625rem] border-n-weak bg-n-solid-1 shadow-sm"
      >
        <div class="flex items-center gap-2.5">
          <img
            :src="card.logo"
            :alt="card.name"
            class="object-contain p-1.5 rounded-[0.625rem] size-10 shrink-0 bg-n-alpha-2"
          />
          <b class="text-sm text-n-slate-12">{{ card.name }}</b>
        </div>
        <span class="text-[0.8125rem] text-n-slate-11 line-clamp-3">
          {{ replaceInstallationName(card.description) }}
        </span>
        <span class="inline-flex items-center gap-1.5 text-xs text-n-slate-12">
          <span
            class="rounded-full size-2"
            :class="card.enabled ? 'bg-n-teal-9' : 'bg-n-slate-8'"
          />
          {{
            card.enabled
              ? t('GTI_PAGES.INTEGRATIONS.ACTIVE')
              : t('GTI_PAGES.INTEGRATIONS.INACTIVE')
          }}
        </span>
        <router-link class="mt-auto" :to="routeFor(card.id)">
          <Button
            size="xs"
            color="slate"
            variant="faded"
            :label="t('GTI_PAGES.CONNECTIONS.CONFIGURE')"
          />
        </router-link>
      </div>
    </div>
  </GtiPage>
</template>
