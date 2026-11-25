import {
  buildGtiSendRequest,
  gtiMessagesApiEndpoints,
} from '../gtiMessagesApi';

describe('gtiMessagesApiEndpoints', () => {
  it('offers the Ticketz path first so integrations only change the host', () => {
    expect(gtiMessagesApiEndpoints('https://work.gti.net.br')).toEqual({
      main: 'https://work.gti.net.br/backend/api/messages/send',
      alternative: 'https://work.gti.net.br/api/messages/send',
    });
  });
});

describe('buildGtiSendRequest', () => {
  it('sends text as JSON with the bearer token', () => {
    const request = buildGtiSendRequest({
      token: 'abc',
      number: '5511999990000',
      body: 'Oi',
    });

    expect(request.headers).toEqual({
      Authorization: 'Bearer abc',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(request.body)).toEqual({
      number: '5511999990000',
      body: 'Oi',
    });
  });

  it('sends a file as multipart under medias, with the body as caption', () => {
    const file = new File(['x'], 'nota.pdf', { type: 'application/pdf' });
    const request = buildGtiSendRequest({
      token: 'abc',
      number: '5511999990000',
      body: 'Segue a nota',
      file,
    });

    expect(request.headers).toEqual({ Authorization: 'Bearer abc' });
    expect(request.body.get('medias')).toBeInstanceOf(File);
    expect(request.body.get('body')).toBe('Segue a nota');
  });
});
