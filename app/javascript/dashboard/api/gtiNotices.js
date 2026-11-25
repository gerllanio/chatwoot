/* global axios */
import ApiClient from './ApiClient';

// Asks the server to send the account's "ticket accepted" or "transfer" notice
// to the customer of a conversation (an empty notice sends nothing).
class GtiNoticesAPI extends ApiClient {
  constructor() {
    super('conversations', { accountScoped: true });
  }

  send(conversationId, kind) {
    return axios.post(`${this.url}/${conversationId}/gti_notices`, { kind });
  }
}

export default new GtiNoticesAPI();
