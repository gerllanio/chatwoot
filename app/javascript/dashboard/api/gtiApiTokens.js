/* global axios */
import ApiClient from './ApiClient';

class GtiApiTokensAPI extends ApiClient {
  constructor() {
    super('gti_api_tokens', { accountScoped: true });
  }

  regenerate(id) {
    return axios.post(`${this.url}/${id}/regenerate`);
  }
}

export default new GtiApiTokensAPI();
