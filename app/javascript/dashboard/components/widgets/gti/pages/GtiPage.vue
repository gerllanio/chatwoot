<script setup>
// Prototype page frame for the GTI list pages: title, muted subtitle, a
// toolbar row and the page body.
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
});
</script>

<template>
  <div
    class="flex flex-col w-full h-full p-[1.375rem] overflow-y-auto bg-n-background"
  >
    <h2 class="m-0 mb-1 text-xl font-semibold text-n-slate-12">
      {{ title }}
    </h2>
    <p v-if="subtitle" class="m-0 mb-[1.125rem] text-sm text-n-slate-11">
      {{ subtitle }}
    </p>
    <div v-if="$slots.toolbar" class="flex flex-wrap items-center gap-2 pb-3">
      <slot name="toolbar" />
    </div>
    <slot />
  </div>
</template>
