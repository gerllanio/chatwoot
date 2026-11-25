import { applyGtiNameSignature, gtiNameSignature } from '../gtiSignature';

describe('gtiNameSignature', () => {
  it('prefers the display name and makes it bold', () => {
    expect(
      gtiNameSignature({ name: 'Kaue Silva', display_name: '🙋🏻‍♂️Kaue' })
    ).toBe('*🙋🏻‍♂️Kaue:*');
    expect(gtiNameSignature({ name: 'Kaue Silva' })).toBe('*Kaue Silva:*');
    expect(gtiNameSignature({})).toBe('');
  });
});

describe('applyGtiNameSignature', () => {
  it('puts the signature on the first line', () => {
    expect(applyGtiNameSignature('Bom dia!', '*Kaue:*')).toBe(
      '*Kaue:*\nBom dia!'
    );
  });

  it('sends only the signature when the text is empty (attachments)', () => {
    expect(applyGtiNameSignature('', '*Kaue:*')).toBe('*Kaue:*');
  });

  it('leaves the message alone without a signature', () => {
    expect(applyGtiNameSignature('Oi', '')).toBe('Oi');
  });
});
