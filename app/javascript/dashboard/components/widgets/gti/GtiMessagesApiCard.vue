<script setup>
// Integrations card for the GTI Ticketz-compatible messages API.
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import Button from 'dashboard/components-next/button/Button.vue';

const { t } = useI18n();
const { accountScopedRoute } = useAccount();
</script>

<template>
  <div
    class="flex flex-col flex-1 p-4 m-px outline outline-n-container outline-1 bg-n-card rounded-xl"
  >
    <div
      class="flex items-center justify-center mb-2 rounded-md size-12 bg-n-brand/10 text-n-brand"
    >
      <span class="i-lucide-code-xml size-6" />
    </div>
    <div class="flex items-center justify-between mb-2 font-medium">
      <span class="text-heading-3 text-n-slate-12">
        {{ t('GTI_MESSAGES_API.CARD.NAME') }}
      </span>
      <router-link :to="accountScopedRoute('gti_messages_api')">
        <Button
          :label="t('GTI_MESSAGES_API.CARD.OPEN')"
          icon="i-woot-settings"
          link
          xs
        />
      </router-link>
    </div>
    <p class="m-0 text-n-slate-11 text-body-main">
      {{ t('GTI_MESSAGES_API.CARD.DESCRIPTION') }}
    </p>
  </div>
</template>
