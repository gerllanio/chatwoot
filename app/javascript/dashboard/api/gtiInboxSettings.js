/* global axios */
import ApiClient from './ApiClient';

// GTI "Work" connection menu of a WhatsApp inbox: greeting + numbered queues.
class GtiInboxSettingsAPI extends ApiClient {
  constructor() {
    super('inboxes', { accountScoped: true });
  }

  get(inboxId) {
    return axios.get(`${this.url}/${inboxId}/gti_settings`);
  }

  update(inboxId, setting) {
    return axios.patch(`${this.url}/${inboxId}/gti_settings`, {
      gti_setting: setting,
    });
  }
}

export default new GtiInboxSettingsAPI();
