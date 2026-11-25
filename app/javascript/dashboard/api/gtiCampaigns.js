/* global axios */
import ApiClient from './ApiClient';

class GtiCampaignsAPI extends ApiClient {
  constructor() {
    super('gti_campaigns', { accountScoped: true });
  }

  cancel(id) {
    return axios.post(`${this.url}/${id}/cancel`);
  }

  restart(id) {
    return axios.post(`${this.url}/${id}/restart`);
  }

  report(id, { status, page } = {}) {
    return axios.get(`${this.url}/${id}/report`, { params: { status, page } });
  }
}

export default new GtiCampaignsAPI();
