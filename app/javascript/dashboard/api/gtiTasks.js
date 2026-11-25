/* global axios */
import ApiClient from './ApiClient';

class GtiTasksAPI extends ApiClient {
  constructor() {
    super('gti_tasks', { accountScoped: true });
  }

  list({ status, assignee } = {}) {
    return axios.get(this.url, { params: { status, assignee } });
  }
}

export default new GtiTasksAPI();
