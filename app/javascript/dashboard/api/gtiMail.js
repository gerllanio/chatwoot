/* global axios */
import ApiClient from './ApiClient';

// GTI "Work" e-mail screen: live IMAP folders and messages of the Email inboxes.
class GtiMailAPI extends ApiClient {
  constructor() {
    super('gti_mail', { accountScoped: true });
  }

  mailboxes({ withUnread = false } = {}) {
    return axios.get(`${this.url}/mailboxes`, {
      params: withUnread ? { with_unread: true } : {},
    });
  }

  folders(inboxId) {
    return axios.get(`${this.url}/mailboxes/${inboxId}/folders`);
  }

  createFolder(inboxId, name) {
    return axios.post(`${this.url}/mailboxes/${inboxId}/folders`, { name });
  }

  messages(inboxId, { folder, beforeUid, query } = {}) {
    return axios.get(`${this.url}/mailboxes/${inboxId}/messages`, {
      params: { folder, before_uid: beforeUid, q: query || undefined },
    });
  }

  message(inboxId, folder, uid) {
    return axios.get(`${this.url}/mailboxes/${inboxId}/messages/${uid}`, {
      params: { folder },
    });
  }

  attachmentUrl(inboxId, folder, uid, index) {
    const query = new URLSearchParams({ folder }).toString();
    return `${this.url}/mailboxes/${inboxId}/messages/${uid}/attachments/${index}?${query}`;
  }

  downloadAttachment(inboxId, folder, uid, index) {
    return axios.get(this.attachmentUrl(inboxId, folder, uid, index), {
      responseType: 'blob',
    });
  }

  markSeen(inboxId, folder, uid, seen = true) {
    return axios.patch(
      `${this.url}/mailboxes/${inboxId}/messages/${uid}/seen`,
      { folder, seen }
    );
  }

  move(inboxId, folder, uid, target) {
    return axios.post(`${this.url}/mailboxes/${inboxId}/messages/${uid}/move`, {
      folder,
      target,
    });
  }

  remove(inboxId, folder, uid) {
    return axios.delete(`${this.url}/mailboxes/${inboxId}/messages/${uid}`, {
      params: { folder },
    });
  }

  toConversation(inboxId, folder, uid) {
    return axios.post(
      `${this.url}/mailboxes/${inboxId}/messages/${uid}/conversation`,
      { folder }
    );
  }

  send(inboxId, { to, cc, subject, body, inReplyTo, references, files = [] }) {
    const form = new FormData();
    form.append('to', to);
    if (cc) form.append('cc', cc);
    form.append('subject', subject || '');
    form.append('body', body || '');
    if (inReplyTo) form.append('in_reply_to', inReplyTo);
    if (references) form.append('references', references);
    files.forEach(file => form.append('attachments[]', file));
    return axios.post(`${this.url}/mailboxes/${inboxId}/send`, form);
  }
}

export default new GtiMailAPI();
