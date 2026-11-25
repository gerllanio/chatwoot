<script setup>
// GTI "Work" top bar: navy band with the GTI logo, alert volume,
// notifications and the signed-in user, as in the approved prototype.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import Avatar from 'dashboard/components-next/avatar/Avatar.vue';
import GtiVolumeControl from './GtiVolumeControl.vue';

const { t } = useI18n();
const { accountScopedRoute } = useAccount();
const currentUser = useMapGetter('getCurrentUser');
const unreadCount = useMapGetter('notifications/getUnreadCount');

const userName = computed(
  () => currentUser.value?.available_name || currentUser.value?.name || ''
);
</script>

<template>
  <header
    class="flex items-center flex-shrink-0 h-12 gap-3 px-3 text-white border-b-[3px] bg-gti-navy border-gti-green"
  >
    <router-link
      :to="accountScopedRoute('home')"
      class="flex items-center gap-2 text-white"
    >
      <img src="/brand-assets/logo_dark.svg" alt="GTI" class="h-7" />
      <span class="text-base font-bold">{{ t('GTI.TOPBAR.PRODUCT') }}</span>
      <span class="hidden text-xs opacity-75 sm:inline">
        {{ t('GTI.TOPBAR.TAGLINE') }}
      </span>
    </router-link>
    <span class="flex-1" />
    <div class="[&_button]:!text-white">
      <GtiVolumeControl />
    </div>
    <router-link
      :to="accountScopedRoute('inbox_view')"
      class="relative flex items-center justify-center text-white rounded-full size-8 hover:bg-white/15"
      :aria-label="t('GTI.TOPBAR.NOTIFICATIONS')"
    >
      <span class="i-lucide-bell size-5" />
      <span
        v-if="unreadCount"
        class="absolute top-0 end-0 px-1 text-[0.625rem] font-bold leading-4 rounded-full bg-n-ruby-9"
      >
        {{ unreadCount }}
      </span>
    </router-link>
    <div
      class="flex items-center gap-2 py-1 ps-1 pe-3 rounded-full bg-white/10"
    >
      <Avatar
        :name="userName"
        :src="currentUser?.avatar_url"
        :size="24"
        rounded-full
      />
      <span class="hidden text-sm sm:inline">{{ userName }}</span>
    </div>
  </header>
</template>
