<script setup>
// One Kanban column: colored header with a count, compact cards that can be
// dragged to another column and clicked to open the conversation.
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  title: { type: String, required: true },
  cards: { type: Array, required: true },
  // Tailwind classes for the header bar and the count pill (stage columns).
  barClass: { type: String, default: 'border-n-slate-9' },
  pillClass: { type: String, default: 'bg-n-slate-9' },
  // A queue color coming from the data, used instead of the classes above.
  color: { type: String, default: null },
  droppable: { type: Boolean, default: false },
  tv: { type: Boolean, default: false },
});

const emit = defineEmits(['drop', 'open']);
const { t } = useI18n();
const isOver = ref(false);

const DRAG_TYPE = 'text/plain';

const onDragStart = (event, card) => {
  event.dataTransfer.setData(DRAG_TYPE, String(card.id));
  event.dataTransfer.effectAllowed = 'move';
};

const onDragOver = event => {
  if (!props.droppable) return;
  event.preventDefault();
  isOver.value = true;
};

const onDrop = event => {
  isOver.value = false;
  if (!props.droppable) return;
  const id = Number(event.dataTransfer.getData(DRAG_TYPE));
  if (id) emit('drop', id);
};
</script>

<template>
  <section
    class="flex flex-col flex-none overflow-hidden border rounded-xl bg-n-alpha-1 border-n-weak"
    :class="[tv ? 'w-[22rem]' : 'w-64', { 'ring-2 ring-n-brand': isOver }]"
    @dragover="onDragOver"
    @dragleave="isOver = false"
    @drop="onDrop"
  >
    <h3
      class="flex items-center justify-between gap-2 px-3 m-0 font-semibold border-b-[3px] text-n-slate-12"
      :class="[tv ? 'py-3 text-xl' : 'py-2.5 text-sm', color ? '' : barClass]"
      :style="color ? { borderBottomColor: color } : null"
    >
      <span class="truncate">{{ title }}</span>
      <span
        class="px-2 font-bold text-white rounded-full tabular-nums"
        :class="[
          tv ? 'text-base' : 'text-xs leading-5',
          color ? '' : pillClass,
        ]"
        :style="color ? { backgroundColor: color } : null"
      >
        {{ cards.length }}
      </span>
    </h3>
    <div
      class="flex flex-col flex-1 gap-2 p-2 overflow-y-auto"
      :class="tv ? 'min-h-24' : 'min-h-16'"
    >
      <p
        v-if="!cards.length"
        class="px-1 py-3 m-0 text-center text-n-slate-10"
        :class="tv ? 'text-base' : 'text-xs'"
      >
        {{ t('GTI_KANBAN.EMPTY') }}
      </p>
      <button
        v-for="card in cards"
        :key="card.id"
        type="button"
        :draggable="droppable"
        class="flex flex-col gap-0.5 p-2.5 text-start border rounded-lg shadow-sm bg-n-solid-1 border-n-weak hover:border-n-strong"
        :class="droppable ? 'cursor-grab active:cursor-grabbing' : ''"
        @dragstart="onDragStart($event, card)"
        @click="emit('open', card.id)"
      >
        <span class="flex items-center justify-between w-full gap-2">
          <b
            class="truncate text-n-slate-12"
            :class="tv ? 'text-lg' : 'text-sm'"
          >
            {{ card.name }}
          </b>
          <span
            class="font-semibold whitespace-nowrap tabular-nums"
            :class="[
              tv ? 'text-base' : 'text-xs',
              card.late ? 'text-n-ruby-11 animate-pulse' : 'text-n-slate-11',
            ]"
          >
            {{ card.time }}
          </span>
        </span>
        <small
          class="truncate text-n-slate-11"
          :class="tv ? 'text-sm' : 'text-xs'"
        >
          {{ card.details }}
        </small>
      </button>
    </div>
  </section>
</template>
