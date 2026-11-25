<script setup>
// GTI "Work" Configurações: the Ticketz settings screen (Opções / Horários) for
// the company, wired to the Chatwoot settings that drive each behavior.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import GtiSettingsOptions from 'dashboard/components/widgets/gti/settings/GtiSettingsOptions.vue';
import GtiSettingsHours from 'dashboard/components/widgets/gti/settings/GtiSettingsHours.vue';
import { isWhatsappInbox } from 'dashboard/helper/gtiSettings';

const TABS = { OPTIONS: 'options', HOURS: 'hours' };

const { t } = useI18n();
const inboxes = useMapGetter('inboxes/getInboxes');
const activeTab = ref(TABS.OPTIONS);

const whatsappInboxes = computed(() => inboxes.value.filter(isWhatsappInbox));
const tabs = computed(() => [
  { key: TABS.OPTIONS, label: t('GTI_SETTINGS.TABS.OPTIONS') },
  { key: TABS.HOURS, label: t('GTI_SETTINGS.TABS.HOURS') },
]);
</script>

<template>
  <div class="w-full h-full overflow-y-auto bg-n-surface-1">
    <div class="flex flex-col w-full max-w-5xl gap-6 px-6 py-6 mx-auto">
      <h1 class="m-0 text-2xl font-medium text-n-slate-12">
        {{ t('GTI_SETTINGS.TITLE') }}
      </h1>
      <div class="flex flex-col gap-6 md:flex-row">
        <nav
          class="flex gap-1 md:flex-col md:w-40 md:shrink-0 md:border-e md:border-n-weak"
        >
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="px-4 py-2 text-sm font-medium tracking-wide uppercase text-start border-b-2 md:border-b-0 md:border-e-2 md:-me-px"
            :class="
              activeTab === tab.key
                ? 'text-n-brand border-n-brand'
                : 'text-n-slate-11 border-transparent hover:text-n-slate-12'
            "
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </nav>
        <div class="flex-1 min-w-0">
          <GtiSettingsOptions
            v-if="activeTab === TABS.OPTIONS"
            :whatsapp-inboxes="whatsappInboxes"
          />
          <GtiSettingsHours v-else :whatsapp-inboxes="whatsappInboxes" />
        </div>
      </div>
    </div>
  </div>
</template>
