import {
  GTI_QUEUE_PALETTE,
  gtiAvailabilityDot,
  gtiChannelTile,
  gtiConnectionLine,
  gtiContactCompany,
  gtiContactInbox,
  gtiTeamColor,
  gtiTruncate,
  gtiMenuTeamOrder,
  gtiQueueMenuText,
} from '../gtiPages';

describe('gtiTeamColor', () => {
  it('prefers the queue greeting color, then the team icon color', () => {
    expect(gtiTeamColor({ icon_color: '#111111' }, { color: '#222222' })).toBe(
      '#222222'
    );
    expect(gtiTeamColor({ icon_color: '#111111' }, null)).toBe('#111111');
  });

  it('falls back to the palette by position', () => {
    expect(gtiTeamColor({ icon_color: '' }, null, 1)).toBe(
      GTI_QUEUE_PALETTE[1]
    );
    expect(gtiTeamColor({}, {}, GTI_QUEUE_PALETTE.length)).toBe(
      GTI_QUEUE_PALETTE[0]
    );
  });
});

describe('gtiTruncate', () => {
  it('collapses spaces and cuts long text with an ellipsis', () => {
    expect(gtiTruncate('Olá\n  mundo', 20)).toBe('Olá mundo');
    expect(gtiTruncate('abcdefghij', 5)).toBe('abcd…');
    expect(gtiTruncate(null)).toBe('');
  });
});

describe('contact helpers', () => {
  it('reads the first contact inbox and the company name', () => {
    const contact = {
      contact_inboxes: [{ inbox: { id: 5, name: 'Fixo' } }],
      additional_attributes: { company_name: 'GSS' },
    };
    expect(gtiContactInbox(contact)).toEqual({ id: 5, name: 'Fixo' });
    expect(gtiContactCompany(contact)).toBe('GSS');
    expect(gtiContactInbox({})).toBeNull();
    expect(gtiContactCompany({})).toBe('');
  });
});

describe('gtiQueueMenuText', () => {
  const contact = { name: 'Maria Souza', time: '12:52:29' };

  it('fills the variables and numbers the queues with keycaps', () => {
    expect(
      gtiQueueMenuText(
        'Olá {{firstname}} ({{name}}), são {{hora}}.',
        [{ name: 'comercial 🛒' }, { name: 'suporte' }],
        contact
      )
    ).toBe(
      'Olá Maria (Maria Souza), são 12:52:29.\n\n1️⃣ - Comercial 🛒\n2️⃣ - Suporte'
    );
  });

  it('sends only the queues when there is no greeting', () => {
    expect(gtiQueueMenuText('', [{ name: 'suporte' }], contact)).toBe(
      '1️⃣ - Suporte'
    );
  });

  it('falls back to plain numbers after the tenth queue', () => {
    const teams = Array.from({ length: 11 }, (_, i) => ({ name: `f${i}` }));
    expect(gtiQueueMenuText('', teams, contact).split('\n')[10]).toBe(
      '11 - F10'
    );
  });
});

describe('gtiMenuTeamOrder', () => {
  const teams = [
    { id: 1, name: 'suporte' },
    { id: 2, name: 'comercial' },
    { id: 3, name: 'convenio' },
  ];

  it('puts the chosen queues first in menu order, then the rest by name', () => {
    expect(gtiMenuTeamOrder(teams, [3, 1]).map(team => team.id)).toEqual([
      3, 1, 2,
    ]);
    expect(gtiMenuTeamOrder(teams, []).map(team => team.id)).toEqual([2, 3, 1]);
  });
});

describe('status helpers', () => {
  it('colors the availability dot', () => {
    expect(gtiAvailabilityDot('online')).toBe('bg-n-teal-9');
    expect(gtiAvailabilityDot('offline')).toBe('bg-n-slate-8');
  });

  it('tells session connections apart from other channels', () => {
    expect(
      gtiConnectionLine({ provider_connection: { connection: 'close' } })
    ).toEqual({ state: 'disconnected', isSession: true });
    expect(gtiConnectionLine({ provider_connection: null })).toEqual({
      state: 'connected',
      isSession: false,
    });
  });

  it('gives each channel its tile color', () => {
    expect(gtiChannelTile('Channel::Whatsapp')).toBe('bg-[#25D366]');
    expect(gtiChannelTile('Channel::Api')).toBe('bg-n-slate-9');
  });
});
