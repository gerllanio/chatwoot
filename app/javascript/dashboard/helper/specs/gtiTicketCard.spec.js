import {
  gtiAvatarColor,
  gtiCardTime,
  gtiChannelBadge,
  gtiChannelName,
  gtiInitials,
  gtiLooksLikePhone,
  gtiNormalizePhone,
  isGtiReplyBlocked,
  gtiTeamColor,
  gtiWaitText,
} from '../gtiTicketCard';

describe('gtiTicketCard', () => {
  it('gives each channel its prototype badge', () => {
    expect(gtiChannelBadge('Channel::Whatsapp')).toEqual({
      bg: 'bg-n-gti-wa',
      icon: 'i-ri-whatsapp-fill',
    });
    expect(gtiChannelBadge('Channel::Unknown').bg).toBe('bg-n-slate-9');
    expect(gtiChannelName('Channel::Email')).toBe('E-mail');
  });

  it('makes initials from the first two words, skipping emoji', () => {
    expect(gtiInitials('Marcos Andrade Silva')).toBe('MA');
    expect(gtiInitials('🙋 Kaue')).toBe('K');
    expect(gtiInitials('')).toBe('?');
  });

  it('keeps a stable avatar colour per contact', () => {
    expect(gtiAvatarColor(3)).toBe('bg-n-gti-av3');
    expect(gtiAvatarColor(13)).toBe('bg-n-gti-av3');
  });

  it('shows the hour for today and the day for older cards', () => {
    const now = new Date(2026, 10, 25, 21, 0);
    const today = new Date(2026, 10, 25, 20, 59).getTime() / 1000;
    const before = new Date(2026, 10, 3, 9, 0).getTime() / 1000;
    expect(gtiCardTime(today, now)).toBe('20:59');
    expect(gtiCardTime(before, now)).toBe('03/11');
    expect(gtiCardTime(null, now)).toBe('');
  });

  it('writes the wait in minutes, then hours', () => {
    const now = 10_000_000_000;
    expect(gtiWaitText(now / 1000 - 12 * 60, now)).toBe('12 min');
    expect(gtiWaitText(now / 1000 - 65 * 60, now)).toBe('1h05');
  });

  it('prefers the GTI queue colour over the team icon colour', () => {
    expect(gtiTeamColor({ gti_color: '#111111', icon_color: '#222' })).toBe(
      '#111111'
    );
    expect(gtiTeamColor({ icon_color: '#222' })).toBe('#222');
    expect(gtiTeamColor(null)).toBe('');
  });

  it('blocks the composer while the ticket waits or after it is resolved', () => {
    expect(isGtiReplyBlocked({ id: 1, status: 'open', meta: {} })).toBe(true);
    expect(
      isGtiReplyBlocked({
        id: 1,
        status: 'open',
        meta: { assignee: { id: 2 } },
      })
    ).toBe(false);
    expect(isGtiReplyBlocked({ id: 1, status: 'resolved', meta: {} })).toBe(
      true
    );
    expect(isGtiReplyBlocked({ id: 1, status: 'pending', meta: {} })).toBe(
      false
    );
    expect(isGtiReplyBlocked({})).toBe(false);
  });

  it('normalises a typed phone to E.164, assuming Brazil', () => {
    expect(gtiNormalizePhone('(11) 98765-4321')).toBe('+5511987654321');
    expect(gtiNormalizePhone('+55 98 98811-2201')).toBe('+5598988112201');
    expect(gtiNormalizePhone('5511987654321')).toBe('+5511987654321');
    expect(gtiNormalizePhone('')).toBe('');
    expect(gtiLooksLikePhone('(98) 9 0000-0000')).toBe(true);
    expect(gtiLooksLikePhone('Maria')).toBe(false);
  });
});
