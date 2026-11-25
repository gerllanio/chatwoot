import {
  GTI_LIST_SECTIONS,
  GTI_TICKET_TABS,
  buildGtiTicketTabs,
  gtiSectionOfTab,
  filtersToGtiTab,
  gtiTabToFilters,
  isGtiActiveConversation,
} from '../gtiTicketTabs';

const t = key => key;
const everyone = ['me', 'unassigned', 'all'];

describe('gtiTabToFilters', () => {
  it('lists my open conversations on "Atendendo"', () => {
    expect(
      gtiTabToFilters(GTI_TICKET_TABS.ATTENDING, {
        showAll: false,
        allowedAssignees: everyone,
      })
    ).toEqual({ assignee: 'me', status: 'open' });
  });

  it('lists everyone\'s open conversations on "Atendendo" with "Ver todos"', () => {
    expect(
      gtiTabToFilters(GTI_TICKET_TABS.ATTENDING, {
        showAll: true,
        allowedAssignees: everyone,
      })
    ).toEqual({ assignee: 'all', status: 'open' });
  });

  it('ignores "Ver todos" for an agent who cannot see all conversations', () => {
    expect(
      gtiTabToFilters(GTI_TICKET_TABS.ATTENDING, {
        showAll: true,
        allowedAssignees: ['me', 'unassigned'],
      })
    ).toEqual({ assignee: 'me', status: 'open' });
  });

  it('lists unassigned open conversations on "Aguardando"', () => {
    expect(
      gtiTabToFilters(GTI_TICKET_TABS.WAITING, {
        showAll: false,
        allowedAssignees: everyone,
      })
    ).toEqual({ assignee: 'unassigned', status: 'open' });
  });

  it('lists only my resolved conversations for an agent without "all"', () => {
    expect(
      gtiTabToFilters(GTI_TICKET_TABS.RESOLVED, {
        showAll: false,
        allowedAssignees: ['me'],
      })
    ).toEqual({ assignee: 'me', status: 'resolved' });
  });
});

describe('filtersToGtiTab', () => {
  it('maps the list filters back to the active tab', () => {
    expect(filtersToGtiTab({ assignee: 'all', status: 'resolved' })).toBe(
      GTI_TICKET_TABS.RESOLVED
    );
    expect(filtersToGtiTab({ assignee: 'unassigned', status: 'open' })).toBe(
      GTI_TICKET_TABS.WAITING
    );
    expect(filtersToGtiTab({ assignee: 'all', status: 'open' })).toBe(
      GTI_TICKET_TABS.ATTENDING
    );
  });
});

describe('gtiSectionOfTab', () => {
  it('puts "Atendendo" and "Aguardando" under "Abertos"', () => {
    expect(gtiSectionOfTab(GTI_TICKET_TABS.ATTENDING)).toBe(
      GTI_LIST_SECTIONS.OPEN
    );
    expect(gtiSectionOfTab(GTI_TICKET_TABS.WAITING)).toBe(
      GTI_LIST_SECTIONS.OPEN
    );
    expect(gtiSectionOfTab(GTI_TICKET_TABS.RESOLVED)).toBe(
      GTI_LIST_SECTIONS.RESOLVED
    );
  });
});

describe('buildGtiTicketTabs', () => {
  const stats = { mineCount: 4, unAssignedCount: 7, allCount: 15 };

  it('counts my conversations on "Atendendo" and the queue on "Aguardando"', () => {
    const tabs = buildGtiTicketTabs({
      allowedAssignees: everyone,
      stats,
      showAll: false,
      t,
    });

    expect(tabs.map(tab => [tab.key, tab.count])).toEqual([
      ['attending', 4],
      ['waiting', 7],
    ]);
  });

  it('counts every assigned conversation on "Atendendo" with "Ver todos"', () => {
    const tabs = buildGtiTicketTabs({
      allowedAssignees: everyone,
      stats,
      showAll: true,
      t,
    });

    expect(tabs[0].count).toBe(8);
  });

  it('hides "Aguardando" from agents who cannot see unassigned conversations', () => {
    const tabs = buildGtiTicketTabs({
      allowedAssignees: ['me'],
      stats,
      showAll: false,
      t,
    });

    expect(tabs.map(tab => tab.key)).toEqual(['attending']);
  });
});

describe('isGtiActiveConversation', () => {
  it('is true for conversations still in progress, assigned or not', () => {
    expect(isGtiActiveConversation({ status: 'open', meta: {} })).toBe(true);
    expect(
      isGtiActiveConversation({ status: 'open', meta: { assignee: { id: 1 } } })
    ).toBe(true);
    expect(isGtiActiveConversation({ status: 'pending', meta: {} })).toBe(true);
    expect(isGtiActiveConversation({ status: 'resolved', meta: {} })).toBe(
      false
    );
  });
});
