<script setup>
// GTI "Work" settings, Horários tab: Ticketz-style weekly rules (days chips plus
// an opening interval) written to the working hours and time zone of every
// WhatsApp inbox of the company.
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import Select from 'dashboard/components-next/select/Select.vue';
import { timeZoneOptions } from 'dashboard/routes/dashboard/settings/inbox/helpers/businessHour';
import {
  GTI_WEEK_DAYS,
  isValidRule,
  rulesFromWorkingHours,
  workingHoursFromRules,
} from 'dashboard/helper/gtiSettings';

const props = defineProps({
  whatsappInboxes: { type: Array, required: true },
});

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
const NEW_RULE = { days: [], from: '08:00', to: '18:00' };

const { t } = useI18n();
const store = useStore();

const timezone = ref(DEFAULT_TIMEZONE);
const rules = ref([]);
const isSaving = ref(false);

const timezones = timeZoneOptions();
const hasWhatsapp = computed(() => props.whatsappInboxes.length > 0);
const dayLabels = computed(() => ({
  0: t('GTI_SETTINGS.DAYS.0'),
  1: t('GTI_SETTINGS.DAYS.1'),
  2: t('GTI_SETTINGS.DAYS.2'),
  3: t('GTI_SETTINGS.DAYS.3'),
  4: t('GTI_SETTINGS.DAYS.4'),
  5: t('GTI_SETTINGS.DAYS.5'),
  6: t('GTI_SETTINGS.DAYS.6'),
}));

watch(
  () => props.whatsappInboxes,
  inboxes => {
    const [first] = inboxes;
    timezone.value = first?.timezone || DEFAULT_TIMEZONE;
    rules.value = rulesFromWorkingHours(first?.working_hours || []);
  },
  { immediate: true }
);

const toggleDay = (rule, day) => {
  rule.days = rule.days.includes(day)
    ? rule.days.filter(item => item !== day)
    : [...rule.days, day];
};

const addRule = () => {
  rules.value.push({ ...NEW_RULE, days: [] });
};

const removeRule = index => {
  rules.value.splice(index, 1);
};

const save = async () => {
  if (!rules.value.every(isValidRule)) {
    useAlert(t('GTI_SETTINGS.HOURS.INVALID_RULE'));
    return;
  }
  isSaving.value = true;
  try {
    const workingHours = workingHoursFromRules(rules.value);
    await Promise.all(
      props.whatsappInboxes.map(inbox =>
        store.dispatch('inboxes/updateInbox', {
          id: inbox.id,
          formData: false,
          timezone: timezone.value,
          working_hours: workingHours,
        })
      )
    );
    useAlert(t('GTI_SETTINGS.SAVED'));
  } catch (error) {
    useAlert(t('GTI_SETTINGS.SAVE_FAILED'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <form class="flex flex-col gap-6" @submit.prevent="save">
    <p
      v-if="!hasWhatsapp"
      class="px-4 py-3 m-0 text-sm rounded-lg bg-n-amber-3 text-n-amber-11"
    >
      {{ t('GTI_SETTINGS.NO_WHATSAPP') }}
    </p>

    <label class="flex flex-col gap-1 text-sm text-n-slate-11">
      {{ t('GTI_SETTINGS.HOURS.TIMEZONE') }}
      <Select
        v-model="timezone"
        :options="timezones"
        :disabled="!hasWhatsapp"
      />
    </label>

    <section class="flex flex-col gap-3">
      <h2
        class="flex items-center gap-2 m-0 text-lg font-semibold text-n-slate-12"
      >
        <span class="i-lucide-clock size-5" />
        {{ t('GTI_SETTINGS.HOURS.WEEKLY_TITLE') }}
      </h2>
      <p class="m-0 text-sm text-n-slate-11">
        {{ t('GTI_SETTINGS.HOURS.WEEKLY_DESCRIPTION') }}
        {{ t('GTI_SETTINGS.HOURS.ONE_INTERVAL') }}
      </p>

      <div
        v-for="(rule, index) in rules"
        :key="index"
        class="flex flex-col gap-3 p-4 border rounded-xl border-n-weak bg-n-solid-1"
      >
        <div class="flex items-center justify-between">
          <b class="text-sm text-n-slate-12">
            {{ t('GTI_SETTINGS.HOURS.RULE', { n: index + 1 }) }}
          </b>
          <Button
            v-tooltip.left="t('GTI_SETTINGS.HOURS.REMOVE_RULE')"
            icon="i-lucide-trash-2"
            color="ruby"
            variant="ghost"
            size="sm"
            type="button"
            :aria-label="t('GTI_SETTINGS.HOURS.REMOVE_RULE')"
            @click="removeRule(index)"
          />
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-sm text-n-slate-11">
            {{ t('GTI_SETTINGS.HOURS.DAYS') }}
          </span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="day in GTI_WEEK_DAYS"
              :key="day"
              type="button"
              class="px-3 py-1 text-sm rounded-full border transition-colors"
              :class="
                rule.days.includes(day)
                  ? 'bg-n-gti-navy text-white border-n-gti-navy'
                  : 'bg-n-alpha-2 text-n-slate-11 border-n-weak hover:bg-n-alpha-3'
              "
              :aria-pressed="rule.days.includes(day)"
              @click="toggleDay(rule, day)"
            >
              {{ dayLabels[day] }}
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <label class="flex flex-col gap-1 text-xs text-n-slate-11">
            {{ t('GTI_SETTINGS.HOURS.FROM') }}
            <input
              v-model="rule.from"
              type="time"
              class="!mb-0 px-3 py-2 text-sm rounded-lg bg-n-surface-1 outline outline-1 -outline-offset-1 outline-n-weak"
            />
          </label>
          <span class="pb-2 text-sm text-n-slate-11">
            {{ t('GTI_SETTINGS.HOURS.UNTIL') }}
          </span>
          <label class="flex flex-col gap-1 text-xs text-n-slate-11">
            {{ t('GTI_SETTINGS.HOURS.TO') }}
            <input
              v-model="rule.to"
              type="time"
              class="!mb-0 px-3 py-2 text-sm rounded-lg bg-n-surface-1 outline outline-1 -outline-offset-1 outline-n-weak"
            />
          </label>
        </div>
      </div>

      <Button
        type="button"
        icon="i-lucide-plus"
        :label="t('GTI_SETTINGS.HOURS.ADD_RULE')"
        color="slate"
        variant="outline"
        :disabled="!hasWhatsapp"
        @click="addRule"
      />
    </section>

    <div class="flex justify-end">
      <Button
        type="submit"
        :label="t('GTI_SETTINGS.SAVE')"
        :is-loading="isSaving"
        :disabled="isSaving || !hasWhatsapp"
      />
    </div>
  </form>
</template>
