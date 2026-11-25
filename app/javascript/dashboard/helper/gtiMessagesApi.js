// GTI "Work": Ticketz-compatible messages API. The paths and payloads shown on the
// documentation page and used by its send test live here so both stay in sync.

export const GTI_MESSAGES_API_PATHS = {
  TICKETZ: '/backend/api/messages/send',
  SHORT: '/api/messages/send',
};

export const gtiMessagesApiEndpoints = origin => ({
  main: `${origin}${GTI_MESSAGES_API_PATHS.TICKETZ}`,
  alternative: `${origin}${GTI_MESSAGES_API_PATHS.SHORT}`,
});

export const GTI_TEXT_BODY_EXAMPLE = JSON.stringify({
  number: '5511999999999',
  body: 'Sua mensagem',
  saveOnTicket: true,
  linkPreview: true,
});

export const GTI_TEXT_HEADERS_EXAMPLE =
  'Authorization ("Bearer " + token) e Content-Type (application/json)';

export const GTI_MEDIA_HEADERS_EXAMPLE =
  'Authorization ("Bearer " + token) e Content-Type (multipart/form-data)';

export const GTI_MEDIA_FORM_EXAMPLE =
  'number: 5511999999999, body: legenda opcional, medias: arquivo';

// Builds the request the send test fires: JSON for text, multipart when a file is
// attached, exactly like n8n and Primata call it.
export const buildGtiSendRequest = ({ token, number, body, file }) => {
  const headers = { Authorization: `Bearer ${token}` };
  if (file) {
    const form = new FormData();
    form.append('number', number);
    if (body) {
      form.append('body', body);
    }
    form.append('medias', file);
    return { method: 'POST', headers, body: form };
  }
  return {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number, body }),
  };
};

export const sendGtiTestMessage = async ({ origin, ...payload }) => {
  const response = await fetch(
    gtiMessagesApiEndpoints(origin).main,
    buildGtiSendRequest(payload)
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || String(response.status));
  }
  return data;
};
