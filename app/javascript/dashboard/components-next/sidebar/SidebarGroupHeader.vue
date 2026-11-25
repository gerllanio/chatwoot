<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store.js';
import Icon from 'next/icon/Icon.vue';
import { useGtiClassicMode } from 'dashboard/helper/gtiMode';

const props = defineProps({
  to: { type: [Object, String], default: '' },
  label: { type: String, default: '' },
  icon: { type: [String, Object], default: '' },
  expandable: { type: Boolean, default: false },
  isExpanded: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  hasActiveChild: { type: Boolean, default: false },
  getterKeys: { type: Object, default: () => ({}) },
  gtiCount: { type: Number, default: 0 },
  gtiCountTone: { type: String, default: 'blue' },
});

const emit = defineEmits(['toggle']);

// GTI "Work": the active page is highlighted in green with a bar on the
// leading edge, as in the prototype.
const gtiClassicMode = useGtiClassicMode();
// Prototype .nav: full-width rows (10px 18px, 14px gap, 14px text) with a
// 3px leading bar on the active one.
const gtiItemClass = computed(() => {
  const base =
    '!h-auto !gap-3.5 !rounded-none !py-2.5 !px-[1.125rem] border-s-[3px] text-sm';
  if (props.isActive || props.hasActiveChild) {
    return `${base} border-n-brand bg-n-brand/10 text-n-brand font-semibold`;
  }
  return `${base} border-transparent text-n-slate-12 hover:bg-n-slate-2`;
});
const GTI_COUNT_TONES = {
  red: 'bg-n-ruby-9',
  blue: 'bg-n-gti-blue',
};
const gtiCountClass = computed(
  () => GTI_COUNT_TONES[props.gtiCountTone] || GTI_COUNT_TONES.blue
);

const router = useRouter();
const showBadge = useMapGetter(props.getterKeys.badge);
const dynamicCount = useMapGetter(props.getterKeys.count);
const count = computed(() =>
  dynamicCount.value > 99 ? '99+' : dynamicCount.value
);

// A real link so Cmd/Ctrl-click opens it in a new tab; a plain click keeps
// the in-app toggle instead of following the href.
const href = computed(() => (props.to ? router.resolve(props.to).href : null));

const onClick = event => {
  if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  emit('toggle');
};
</script>

<template>
  <component
    :is="to ? 'a' : 'div'"
    class="flex items-center gap-2 px-1.5 py-1 rounded-lg h-8 min-w-0"
    role="button"
    draggable="false"
    :href="href"
    :title="label"
    :class="
      gtiClassicMode
        ? {
            'text-n-slate-12 bg-n-alpha-2 font-medium':
              isActive && !hasActiveChild,
            'text-n-slate-12 font-medium': hasActiveChild,
            'text-n-slate-11 hover:bg-n-alpha-2': !isActive && !hasActiveChild,
          }
        : gtiItemClass
    "
    @click.stop="onClick"
  >
    <div v-if="icon" class="relative flex items-center gap-2">
      <Icon
        v-if="icon"
        :icon="icon"
        :class="gtiClassicMode ? 'size-4' : 'size-5'"
      />
      <span
        v-if="showBadge"
        class="size-2 -top-px ltr:-right-px rtl:-left-px bg-n-brand absolute rounded-full border border-n-solid-2"
      />
    </div>
    <div
      class="flex items-center gap-1.5 flex-grow justify-between min-w-0 flex-1"
    >
      <span
        class="truncate"
        :class="
          gtiClassicMode
            ? {
                'text-body-main': !isActive,
                'font-medium text-sm': isActive || hasActiveChild,
              }
            : 'text-sm'
        "
      >
        {{ label }}
      </span>
      <span
        v-if="gtiCount && !gtiClassicMode"
        class="inline-grid h-[1.125rem] min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-semibold leading-3 text-white flex-shrink-0"
        :class="gtiCountClass"
      >
        {{ gtiCount > 99 ? '99+' : gtiCount }}
      </span>
      <span
        v-if="dynamicCount && !expandable && gtiClassicMode"
        class="inline-grid h-5 min-w-5 place-items-center rounded-full bg-n-slate-4 px-1 text-xxs font-medium leading-3 text-n-slate-12 dark:bg-n-slate-5 flex-shrink-0"
      >
        {{ count }}
      </span>
    </div>
    <span
      v-if="expandable"
      v-show="isExpanded"
      class="i-lucide-chevron-up size-3"
      @click.stop.prevent="emit('toggle')"
    />
  </component>
</template>
