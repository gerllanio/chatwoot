import { buildGreetingFormData, greetingMediaKind } from '../gtiTeamGreeting';

describe('greetingMediaKind', () => {
  it('accepts images and audios only', () => {
    expect(greetingMediaKind('image/png')).toBe('image');
    expect(greetingMediaKind('audio/ogg;codecs=opus')).toBe('audio');
    expect(greetingMediaKind('application/pdf')).toBeNull();
    expect(greetingMediaKind(undefined)).toBeNull();
  });
});

describe('buildGreetingFormData', () => {
  it('sends the texts and color, and the file only when there is one', () => {
    const withoutFile = buildGreetingFormData({
      color: '#00a656',
      greetingMessage: 'Olá {{firstname}}',
      outOfHoursMessage: '',
    });
    expect(withoutFile.get('gti_setting[color]')).toBe('#00a656');
    expect(withoutFile.get('gti_setting[greeting_message]')).toBe(
      'Olá {{firstname}}'
    );
    expect(withoutFile.has('gti_setting[greeting_media]')).toBe(false);

    const file = new File(['x'], 'saudacao.ogg', { type: 'audio/ogg' });
    const withFile = buildGreetingFormData({ file });
    expect(withFile.get('gti_setting[greeting_media]')).toBeInstanceOf(File);
  });
});
