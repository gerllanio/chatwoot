/* global axios */
import ApiClient from './ApiClient';

// GTI "Work" queue greeting of a team (color, greeting, image/audio, out-of-hours).
class GtiTeamSettingsAPI extends ApiClient {
  constructor() {
    super('teams', { accountScoped: true });
  }

  get(teamId) {
    return axios.get(`${this.url}/${teamId}/gti_settings`);
  }

  update(teamId, formData) {
    return axios.patch(`${this.url}/${teamId}/gti_settings`, formData);
  }

  removeMedia(teamId) {
    return axios.delete(`${this.url}/${teamId}/gti_settings/media`);
  }
}

export default new GtiTeamSettingsAPI();
