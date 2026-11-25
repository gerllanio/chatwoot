<script setup>
// "Saudação da fila" on the team edit page: color, greeting text, an image or
// an audio (uploaded or recorded here) and the out-of-hours message, sent to
// the customer when a WhatsApp conversation enters this queue.
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import GtiTeamSettingsAPI from 'dashboard/api/gtiTeamSettings';
import Button from 'dashboard/components-next/button/Button.vue';
import TextArea from 'dashboard/components-next/textarea/TextArea.vue';
import AudioRecorder from 'dashboard/components/widgets/WootWriter/AudioRecorder.vue';
import {
  GTI_GREETING_MEDIA_ACCEPT,
  GTI_GREETING_VARIABLES,
  buildGreetingFormData,
  greetingMediaKind,
} from 'dashboard/helper/gtiTeamGreeting';

const props = defineProps({
  teamId: { type: [Number, String], required: true },
});

const MESSAGE_MAX_LENGTH = 4096;
const DEFAULT_COLOR = '#00a656';
const RECORD_FORMAT = 'audio/ogg';

const { t } = useI18n();

const color = ref(DEFAULT_COLOR);
const greetingMessage = ref('');
const outOfHoursMessage = ref('');
const savedMedia = ref(null);
const pendingFile = ref(null);
const pendingUrl = ref(null);
const isRecording = ref(false);
const isSaving = ref(false);
const fileInput = ref(null);
const recorderRef = ref(null);

const variablesHelp = GTI_GREETING_VARIABLES.join(' ');

const preview = computed(() => {
  if (pendingFile.value) {
    return {
      kind: greetingMediaKind(pendingFile.value.type),
      url: pendingUrl.value,
      name: pendingFile.value.name,
    };
  }
  if (savedMedia.value) {
    return {
      kind: savedMedia.value.kind,
      url: savedMedia.value.url,
      name: savedMedia.value.filename,
    };
  }
  return null;
});

const applySetting = data => {
  color.value = data.color || DEFAULT_COLOR;
  greetingMessage.value = data.greeting_message || '';
  outOfHoursMessage.value = data.out_of_hours_message || '';
  savedMedia.value = data.media;
};

const clearPending = () => {
  if (pendingUrl.value) {
    URL.revokeObjectURL(pendingUrl.value);
  }
  pendingFile.value = null;
  pendingUrl.value = null;
};

const setPending = file => {
  clearPending();
  pendingFile.value = file;
  pendingUrl.value = URL.createObjectURL(file);
};

const onFileChosen = event => {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) {
    return;
  }
  if (!greetingMediaKind(file.type)) {
    useAlert(t('GTI_TEAM_SETTINGS.MEDIA.INVALID'));
    return;
  }
  setPending(file);
};

const stopRecording = () => {
  recorderRef.value?.stopRecording();
};

const onRecordFinished = ({ file }) => {
  isRecording.value = false;
  setPending(file);
};

const onRecordError = () => {
  isRecording.value = false;
  useAlert(t('GTI_TEAM_SETTINGS.MEDIA.RECORD_ERROR'));
};

const removeMedia = async () => {
  if (pendingFile.value) {
    clearPending();
    return;
  }
  try {
    const { data } = await GtiTeamSettingsAPI.removeMedia(props.teamId);
    applySetting(data);
  } catch (error) {
    useAlert(t('GTI_TEAM_SETTINGS.API.ERROR'));
  }
};

const save = async () => {
  isSaving.value = true;
  try {
    const { data } = await GtiTeamSettingsAPI.update(
      props.teamId,
      buildGreetingFormData({
        color: color.value,
        greetingMessage: greetingMessage.value,
        outOfHoursMessage: outOfHoursMessage.value,
        file: pendingFile.value,
      })
    );
    clearPending();
    applySetting(data);
    useAlert(t('GTI_TEAM_SETTINGS.API.SUCCESS'));
  } catch (error) {
    useAlert(t('GTI_TEAM_SETTINGS.API.ERROR'));
  } finally {
    isSaving.value = false;
  }
};

onMounted(async () => {
  try {
    const { data } = await GtiTeamSettingsAPI.get(props.teamId);
    applySetting(data);
  } catch (error) {
    useAlert(t('GTI_TEAM_SETTINGS.API.ERROR'));
  }
});

onUnmounted(clearPending);
</script>

<template>
  <section
    class="flex flex-col w-full gap-4 p-4 mt-6 border rounded-xl border-n-weak"
  >
    <header>
      <h3 class="m-0 text-base font-semibold text-n-slate-12">
        {{ t('GTI_TEAM_SETTINGS.TITLE') }}
      </h3>
      <p class="m-0 mt-1 text-sm text-n-slate-11">
        {{ t('GTI_TEAM_SETTINGS.DESCRIPTION') }}
      </p>
    </header>

    <label class="flex items-center gap-3 text-sm text-n-slate-12">
      <input
        v-model="color"
        type="color"
        class="!w-10 !h-8 !p-0 !m-0 border rounded cursor-pointer border-n-weak"
      />
      {{ t('GTI_TEAM_SETTINGS.COLOR') }}
    </label>

    <div class="flex flex-col gap-1">
      <TextArea
        v-model="greetingMessage"
        :label="t('GTI_TEAM_SETTINGS.GREETING')"
        :placeholder="t('GTI_TEAM_SETTINGS.GREETING_PLACEHOLDER')"
        :max-length="MESSAGE_MAX_LENGTH"
        auto-height
      />
      <span class="text-xs text-n-slate-11">
        {{ t('GTI_TEAM_SETTINGS.VARIABLES', { variables: variablesHelp }) }}
      </span>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium text-n-slate-12">
        {{ t('GTI_TEAM_SETTINGS.MEDIA.LABEL') }}
      </span>
      <p class="m-0 text-xs text-n-slate-11">
        {{ t('GTI_TEAM_SETTINGS.MEDIA.HELP') }}
      </p>

      <div v-if="preview" class="flex flex-wrap items-center gap-3">
        <img
          v-if="preview.kind === 'image'"
          :src="preview.url"
          :alt="preview.name"
          class="object-cover rounded-lg max-h-40 max-w-60"
        />
        <audio
          v-else-if="preview.kind === 'audio'"
          :src="preview.url"
          controls
          class="max-w-full"
        />
        <Button
          :label="t('GTI_TEAM_SETTINGS.MEDIA.REMOVE')"
          icon="i-lucide-trash-2"
          color="ruby"
          variant="faded"
          size="sm"
          @click="removeMedia"
        />
      </div>

      <div v-if="isRecording" class="flex flex-col gap-2">
        <AudioRecorder
          ref="recorderRef"
          :audio-record-format="RECORD_FORMAT"
          @finish-record="onRecordFinished"
          @record-error="onRecordError"
        />
        <Button
          :label="t('GTI_TEAM_SETTINGS.MEDIA.STOP')"
          icon="i-lucide-square"
          color="ruby"
          size="sm"
          class="self-start"
          @click="stopRecording"
        />
      </div>

      <div v-else class="flex flex-wrap gap-2">
        <Button
          :label="t('GTI_TEAM_SETTINGS.MEDIA.UPLOAD')"
          icon="i-lucide-upload"
          color="slate"
          variant="faded"
          size="sm"
          @click="fileInput?.click()"
        />
        <Button
          :label="t('GTI_TEAM_SETTINGS.MEDIA.RECORD')"
          icon="i-lucide-mic"
          color="slate"
          variant="faded"
          size="sm"
          @click="isRecording = true"
        />
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          :accept="GTI_GREETING_MEDIA_ACCEPT"
          @change="onFileChosen"
        />
      </div>
    </div>

    <TextArea
      v-model="outOfHoursMessage"
      :label="t('GTI_TEAM_SETTINGS.OUT_OF_HOURS')"
      :placeholder="t('GTI_TEAM_SETTINGS.OUT_OF_HOURS_PLACEHOLDER')"
      :max-length="MESSAGE_MAX_LENGTH"
      auto-height
    />
    <span class="-mt-3 text-xs text-n-slate-11">
      {{ t('GTI_TEAM_SETTINGS.OUT_OF_HOURS_HELP') }}
    </span>

    <Button
      :label="t('GTI_TEAM_SETTINGS.SAVE')"
      :is-loading="isSaving"
      :disabled="isRecording"
      class="self-start"
      @click="save"
    />
  </section>
</template>
