import {
  GTI_SEARCH_SECTIONS,
  gtiConversationChannel,
  gtiSearchMatches,
  gtiSearchRows,
  gtiSplitConversations,
} from '../gtiSearch';

describe('gtiSearchMatches', () => {
  it('ignores accents and case', () => {
    expect(gtiSearchMatches('joao', 'João Silva')).toBe(true);
    expect(gtiSearchMatches('SILVA', null, 'joão silva')).toBe(true);
  });

  it('does not match a blank term', () => {
    expect(gtiSearchMatches('  ', 'anything')).toBe(false);
  });
});

describe('gtiConversationChannel', () => {
  it('tells WhatsApp from Instagram', () => {
    expect(gtiConversationChannel({ channel_type: 'Channel::Whatsapp' })).toBe(
      'whatsapp'
    );
    expect(gtiConversationChannel({ channel_type: 'Channel::Instagram' })).toBe(
      'instagram'
    );
    expect(
      gtiConversationChannel({
        channel_type: 'Channel::FacebookPage',
        instagram_id: '17841',
      })
    ).toBe('instagram');
    expect(
      gtiConversationChannel({ channel_type: 'Channel::FacebookPage' })
    ).toBeNull();
    expect(
      gtiConversationChannel({ channel_type: 'Channel::Email' })
    ).toBeNull();
  });
});

describe('gtiSplitConversations', () => {
  it('uses the store inbox to spot an Instagram Facebook page', () => {
    const conversations = [
      { id: 1, inbox: { id: 5, channel_type: 'Channel::Whatsapp' } },
      { id: 2, inbox: { id: 7, channel_type: 'Channel::FacebookPage' } },
      { id: 3, inbox: { id: 9, channel_type: 'Channel::Email' } },
    ];
    const inboxesById = {
      7: { id: 7, channel_type: 'Channel::FacebookPage', instagram_id: 'x' },
    };

    const groups = gtiSplitConversations(conversations, inboxesById);

    expect(groups.whatsapp.map(c => c.id)).toEqual([1]);
    expect(groups.instagram.map(c => c.id)).toEqual([2]);
  });
});

describe('gtiSearchRows', () => {
  it('lists rows in the fixed section order, contacts first', () => {
    expect(GTI_SEARCH_SECTIONS[0]).toBe('contacts');
    const rows = gtiSearchRows({
      labels: [{ id: 'l' }],
      contacts: [{ id: 'c' }],
      tasks: [{ id: 't' }],
    });

    expect(rows.map(row => row.section)).toEqual([
      'contacts',
      'tasks',
      'labels',
    ]);
  });
});
