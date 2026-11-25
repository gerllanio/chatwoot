/* global axios */
import ApiClient from './ApiClient';

class GtiContactListsAPI extends ApiClient {
  constructor() {
    super('gti_contact_lists', { accountScoped: true });
  }

  importCsv(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${this.url}/${id}/import`, formData);
  }

  items(id, { q, page } = {}) {
    return axios.get(`${this.url}/${id}/items`, { params: { q, page } });
  }

  createItem(id, item) {
    return axios.post(`${this.url}/${id}/items`, { item });
  }

  updateItem(id, itemId, item) {
    return axios.patch(`${this.url}/${id}/items/${itemId}`, { item });
  }

  deleteItem(id, itemId) {
    return axios.delete(`${this.url}/${id}/items/${itemId}`);
  }
}

export default new GtiContactListsAPI();
