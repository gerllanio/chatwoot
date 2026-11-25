<script setup>
// GTI "Work" top bar: navy band with the menu button, the GTI logo, the
// light/dark switch, alert volume, notifications and the signed-in user, as in
// the approved prototype.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { useSidebarResize } from 'dashboard/components-next/sidebar/provider';
import { LocalStorage } from 'shared/helpers/localStorage';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';
import { setColorTheme } from 'dashboard/helper/themeHelper';
import Avatar from 'dashboard/components-next/avatar/Avatar.vue';
import GtiVolumeControl from './GtiVolumeControl.vue';

const emit = defineEmits(['toggleMobileSidebar']);

const MOBILE_BREAKPOINT = 768;
const DARK_CLASS = 'dark';

const { t } = useI18n();
const { accountScopedRoute } = useAccount();
const { isAdmin } = useAdmin();
const { uiSettings } = useUISettings();
const { snapToCollapsed, snapToExpanded, COLLAPSED_THRESHOLD, DEFAULT_WIDTH } =
  useSidebarResize();
const currentUser = useMapGetter('getCurrentUser');
const unreadCount = useMapGetter('notifications/getUnreadCount');
const globalConfig = useMapGetter('globalConfig/get');

const userName = computed(
  () => currentUser.value?.available_name || currentUser.value?.name || ''
);
const userLabel = computed(() =>
  t('GTI.TOPBAR.USER_ROLE', {
    name: userName.value,
    role: isAdmin.value
      ? t('GTI.TOPBAR.ROLE_ADMIN')
      : t('GTI.TOPBAR.ROLE_AGENT'),
  })
);

const toggleSidebar = () => {
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    emit('toggleMobileSidebar');
    return;
  }
  const width = uiSettings.value.sidebar_width || DEFAULT_WIDTH;
  if (width < COLLAPSED_THRESHOLD) {
    snapToExpanded();
  } else {
    snapToCollapsed();
  }
};

const isDark = ref(document.body.classList.contains(DARK_CLASS));
const toggleTheme = () => {
  LocalStorage.set(
    LOCAL_STORAGE_KEYS.COLOR_SCHEME,
    isDark.value ? 'light' : 'dark'
  );
  setColorTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
  isDark.value = document.body.classList.contains(DARK_CLASS);
};
</script>

<template>
  <header
    class="flex items-center flex-shrink-0 h-14 gap-2 px-3 text-white border-b-[3px] bg-n-gti-navy border-n-gti-green"
  >
    <button
      type="button"
      class="flex items-center justify-center text-white rounded-md size-9 hover:bg-white/15"
      :aria-label="t('GTI.TOPBAR.MENU')"
      :title="t('GTI.TOPBAR.MENU')"
      @click="toggleSidebar"
    >
      <span class="i-lucide-menu size-5" />
    </button>
    <router-link
      :to="accountScopedRoute('home')"
      class="flex items-center gap-2 text-white"
    >
      <img :src="globalConfig.logoDark" alt="GTI" class="h-8" />
      <span class="text-lg font-bold">{{ t('GTI.TOPBAR.PRODUCT') }}</span>
      <span class="hidden text-xs opacity-75 sm:inline">
        {{ t('GTI.TOPBAR.TAGLINE') }}
      </span>
    </router-link>
    <span class="flex-1" />
    <button
      type="button"
      class="flex items-center justify-center text-white rounded-full size-8 hover:bg-white/15"
      :aria-label="
        isDark ? t('GTI.TOPBAR.LIGHT_MODE') : t('GTI.TOPBAR.DARK_MODE')
      "
      :title="isDark ? t('GTI.TOPBAR.LIGHT_MODE') : t('GTI.TOPBAR.DARK_MODE')"
      @click="toggleTheme"
    >
      <span :class="isDark ? 'i-lucide-sun' : 'i-lucide-moon'" class="size-5" />
    </button>
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
      <span
        class="flex items-center justify-center rounded-full ring-2 ring-n-gti-green bg-n-gti-green"
      >
        <Avatar
          :name="userName"
          :src="currentUser?.avatar_url"
          :size="26"
          rounded-full
        />
      </span>
      <span class="hidden text-sm sm:inline">{{ userLabel }}</span>
    </div>
  </header>
</template>
