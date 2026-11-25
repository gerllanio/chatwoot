/* global axios */
import ApiClient from './ApiClient';

// The GTI contacts table shows each contact's channel, so it asks for the
// contact inboxes that upstream's list leaves out.
class GtiContactsListAPI extends ApiClient {
  constructor() {
    super('contacts', { accountScoped: true });
  }

  list(page, search = '') {
    const params = { page, sort: 'name', include_contact_inboxes: true };
    if (search) {
      return axios.get(`${this.url}/search`, {
        params: { ...params, q: search },
      });
    }
    return axios.get(this.url, { params });
  }
}

export default new GtiContactsListAPI();
