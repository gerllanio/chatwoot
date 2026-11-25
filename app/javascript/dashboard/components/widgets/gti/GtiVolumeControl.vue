<script setup>
// Volume of the new-message alert for this device, plus the WhatsApp-style
// "(N)" counter in the browser tab title.
import { computed, ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { vOnClickOutside } from '@vueuse/components';
import { useMapGetter } from 'dashboard/composables/store';
import Switch from 'dashboard/components-next/switch/Switch.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import DashboardAudioNotificationHelper from 'dashboard/helper/AudioAlerts/DashboardAudioNotificationHelper';
import {
  getGtiAlertVolume,
  gtiTitleWithCount,
  isGtiAlertMuted,
  setGtiAlertMuted,
  setGtiAlertVolume,
} from 'dashboard/helper/gtiNotificationPrefs';

const PERCENT = 100;

const { t } = useI18n();
const unreadCount = useMapGetter('notifications/getUnreadCount');

const isOpen = ref(false);
const volumePercent = ref(Math.round(getGtiAlertVolume() * PERCENT));
const muted = ref(isGtiAlertMuted());

const isSilent = computed(() => muted.value || volumePercent.value === 0);
const volumeIcon = computed(() =>
  isSilent.value
    ? 'i-material-symbols-volume-off'
    : 'i-material-symbols-volume-up'
);

const onVolumeInput = event => {
  volumePercent.value = Number(event.target.value);
  setGtiAlertVolume(volumePercent.value / PERCENT);
  if (muted.value && volumePercent.value > 0) {
    muted.value = false;
    setGtiAlertMuted(false);
  }
};

const onMutedChange = () => {
  setGtiAlertMuted(muted.value);
};

const testSound = () => {
  if (!DashboardAudioNotificationHelper.audioConfig.audio) {
    DashboardAudioNotificationHelper.intializeAudio();
  }
  DashboardAudioNotificationHelper.playAudioAlert();
};

watchEffect(() => {
  document.title = gtiTitleWithCount(document.title, unreadCount.value || 0);
});
</script>

<template>
  <div v-on-click-outside="() => (isOpen = false)" class="relative">
    <Button
      v-tooltip.top="t('GTI.VOLUME.TITLE')"
      :icon="volumeIcon"
      size="xs"
      color="slate"
      variant="ghost"
      :aria-label="t('GTI.VOLUME.TITLE')"
      @click="isOpen = !isOpen"
    />
    <div
      v-if="isOpen"
      class="absolute z-50 flex flex-col gap-3 p-3 mb-2 text-sm border rounded-lg shadow-lg bottom-full start-0 w-64 bg-n-solid-1 border-n-weak"
    >
      <p class="m-0 font-semibold text-n-slate-12">
        {{ t('GTI.VOLUME.TITLE') }}
      </p>
      <label class="flex items-center gap-2 text-n-slate-11">
        <span :class="volumeIcon" class="flex-shrink-0 size-4" />
        <input
          :value="volumePercent"
          type="range"
          min="0"
          max="100"
          step="5"
          class="flex-1 accent-n-brand"
          :aria-label="t('GTI.VOLUME.TITLE')"
          @input="onVolumeInput"
          @change="testSound"
        />
        <span class="w-10 text-xs text-end tabular-nums">
          {{ isSilent ? t('GTI.VOLUME.MUTED') : `${volumePercent}%` }}
        </span>
      </label>
      <label class="flex items-center justify-between text-n-slate-11">
        {{ t('GTI.VOLUME.MUTE') }}
        <Switch v-model="muted" @change="onMutedChange" />
      </label>
      <Button
        :label="t('GTI.VOLUME.TEST')"
        size="xs"
        variant="faded"
        @click="testSound"
      />
      <router-link
        :to="{ name: 'profile_settings_index' }"
        class="text-xs text-n-brand hover:underline"
        @click="isOpen = false"
      >
        {{ t('GTI.VOLUME.DEVICE_NOTIFICATIONS') }}
      </router-link>
    </div>
  </div>
</template>
