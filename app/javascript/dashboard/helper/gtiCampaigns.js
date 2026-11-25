// GTI "Work" campaigns (Ticketz style): status presentation and the form payload.

export const GTI_CAMPAIGN_MESSAGE_SLOTS = 5;
export const GTI_CAMPAIGN_DEFAULT_INTERVAL = { min: 20, max: 40 };

export const GTI_CAMPAIGN_STATUS_CLASSES = {
  inactive: 'bg-n-slate-3 text-n-slate-11',
  scheduled: 'bg-n-blue-3 text-n-blue-11',
  in_progress: 'bg-n-amber-3 text-n-amber-11',
  cancelled: 'bg-n-ruby-3 text-n-ruby-11',
  finished: 'bg-n-teal-3 text-n-teal-11',
};

export const emptyCampaignForm = () => ({
  name: '',
  inboxId: '',
  contactListId: '',
  scheduledAt: '',
  messages: Array(GTI_CAMPAIGN_MESSAGE_SLOTS).fill(''),
  minInterval: GTI_CAMPAIGN_DEFAULT_INTERVAL.min,
  maxInterval: GTI_CAMPAIGN_DEFAULT_INTERVAL.max,
  media: null,
  removeMedia: false,
});

const pad = value => String(value).padStart(2, '0');

// Seconds since epoch -> value for <input type="datetime-local"> in local time.
export const toDateTimeLocal = seconds => {
  if (!seconds) return '';
  const date = new Date(seconds * 1000);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const campaignToForm = campaign => ({
  ...emptyCampaignForm(),
  name: campaign.name,
  inboxId: campaign.inbox?.id ?? '',
  contactListId: campaign.contact_list?.id ?? '',
  scheduledAt: toDateTimeLocal(campaign.scheduled_at),
  messages: Array.from(
    { length: GTI_CAMPAIGN_MESSAGE_SLOTS },
    (_, index) => campaign.messages?.[index] ?? ''
  ),
  minInterval: campaign.min_interval_seconds,
  maxInterval: campaign.max_interval_seconds,
});

// Multipart payload, so an attachment can go with the texts. Blank variations are
// dropped; the API needs at least one.
export const buildCampaignFormData = form => {
  const data = new FormData();
  data.append('gti_campaign[name]', form.name.trim());
  data.append('gti_campaign[inbox_id]', form.inboxId);
  data.append('gti_campaign[gti_contact_list_id]', form.contactListId);
  data.append(
    'gti_campaign[scheduled_at]',
    form.scheduledAt ? new Date(form.scheduledAt).toISOString() : ''
  );
  data.append('gti_campaign[min_interval_seconds]', form.minInterval);
  data.append('gti_campaign[max_interval_seconds]', form.maxInterval);
  form.messages
    .map(message => message.trim())
    .filter(Boolean)
    .forEach(message => data.append('gti_campaign[messages][]', message));
  if (form.media) data.append('gti_campaign[media]', form.media);
  if (form.removeMedia) data.append('remove_media', 'true');
  return data;
};

export const isCampaignEditable = campaign =>
  ['inactive', 'scheduled'].includes(campaign.status);

export const campaignProgress = ({ shippings }) => {
  if (!shippings?.total) return 0;
  return Math.round(
    ((shippings.delivered + shippings.failed) / shippings.total) * 100
  );
};
