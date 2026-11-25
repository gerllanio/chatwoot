// GTI "Work" queue greeting: what the team form uploads and which preview it shows.

export const GTI_GREETING_VARIABLES = [
  '{{firstname}}',
  '{{name}}',
  '{{queue}}',
];

export const GTI_GREETING_MEDIA_ACCEPT = 'image/*,audio/*';

export const greetingMediaKind = contentType => {
  const kind = String(contentType || '').split('/')[0];
  return ['image', 'audio'].includes(kind) ? kind : null;
};

export const buildGreetingFormData = ({
  color,
  greetingMessage,
  outOfHoursMessage,
  file,
}) => {
  const formData = new FormData();
  formData.append('gti_setting[color]', color || '');
  formData.append('gti_setting[greeting_message]', greetingMessage || '');
  formData.append('gti_setting[out_of_hours_message]', outOfHoursMessage || '');
  if (file) {
    formData.append('gti_setting[greeting_media]', file);
  }
  return formData;
};
