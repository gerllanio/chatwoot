import { buildGtiMenu } from '../gtiSidebarMenu';

const t = key => key;

const upstreamMenu = () => [
  { name: 'Inbox', label: 'Inbox', to: '/inbox' },
  {
    name: 'Conversation',
    label: 'Conversations',
    children: [{ name: 'All', to: '/all' }],
  },
  { name: 'InternalChat', label: 'Internal chat', to: '/chat' },
  { name: 'Kanban', label: 'Kanban', to: '/kanban' },
  { name: 'Contacts', label: 'Contacts', children: [] },
  { name: 'Companies', label: 'Companies', children: [] },
  { name: 'Reports', label: 'Reports', children: [] },
  { name: 'Campaigns', label: 'Campaigns', children: [] },
  {
    name: 'Settings',
    label: 'Settings',
    children: [
      { name: 'Settings Account Settings', to: '/account' },
      { name: 'Settings Agents', to: '/agents' },
      { name: 'Settings Teams', to: '/teams' },
      { name: 'Settings Inboxes', to: '/inboxes' },
      { name: 'Settings Labels', to: '/labels' },
      { name: 'Settings Canned Responses', to: '/canned' },
      { name: 'Settings Integrations', to: '/integrations' },
    ],
  },
];

describe('buildGtiMenu', () => {
  it('puts the attendance items first, in the GTI order', () => {
    const names = buildGtiMenu(upstreamMenu(), t).map(item => item.name);

    expect(names.slice(0, 6)).toEqual([
      'Conversation',
      'Kanban',
      'Gti Quick Replies',
      'Contacts',
      'Gti Tags',
      'InternalChat',
    ]);
  });

  it('promotes settings pages to top-level entries that keep their routes', () => {
    const menu = buildGtiMenu(upstreamMenu(), t);
    const connections = menu.find(item => item.name === 'Gti Connections');
    const queues = menu.find(item => item.name === 'Gti Queues');

    expect(connections).toMatchObject({
      to: '/inboxes',
      label: 'GTI.SIDEBAR.CONNECTIONS',
    });
    expect(queues).toMatchObject({ to: '/teams', label: 'GTI.SIDEBAR.QUEUES' });
  });

  it('keeps only the non-promoted pages inside Settings', () => {
    const settings = buildGtiMenu(upstreamMenu(), t).find(
      item => item.name === 'Settings'
    );

    expect(settings.children.map(child => child.name)).toEqual([
      'Settings Account Settings',
    ]);
  });

  it('keeps menu entries upstream adds later', () => {
    const menu = buildGtiMenu(
      [...upstreamMenu(), { name: 'Brand New', to: '/new' }],
      t
    );

    expect(menu.at(-1).name).toBe('Brand New');
  });

  it('skips entries that upstream does not offer on this install', () => {
    const menu = buildGtiMenu(
      upstreamMenu().filter(item => item.name !== 'Kanban'),
      t
    );

    expect(menu.some(item => item.name === 'Kanban')).toBe(false);
  });

  it('adds the TV monitor right after Kanban when its route is given', () => {
    const names = buildGtiMenu(upstreamMenu(), t, {
      monitorRoute: '/monitor',
    }).map(item => item.name);

    expect(names.indexOf('Gti Monitor')).toBe(names.indexOf('Kanban') + 1);
  });

  it('opens the admin group with the panel and its section heading', () => {
    const menu = buildGtiMenu(upstreamMenu(), t, { panelRoute: '/panel' });
    const panelIndex = menu.findIndex(item => item.name === 'Gti Panel');

    expect(menu[panelIndex]).toMatchObject({
      to: '/panel',
      sectionLabel: 'GTI.SIDEBAR.ADMIN_SECTION',
    });
    expect(menu[panelIndex + 1].name).toBe('Reports');
    expect(menu.filter(item => item.sectionLabel)).toHaveLength(1);
  });

  it('puts the admin heading on Reports when there is no panel route', () => {
    const reports = buildGtiMenu(upstreamMenu(), t).find(
      item => item.name === 'Reports'
    );

    expect(reports.sectionLabel).toBe('GTI.SIDEBAR.ADMIN_SECTION');
  });

  it('turns "Atendimentos" into a plain link to the conversation list', () => {
    const tickets = buildGtiMenu(upstreamMenu(), t).find(
      item => item.name === 'Conversation'
    );

    expect(tickets.children).toBeUndefined();
    expect(tickets.to).toBe('/all');
    expect(tickets.activeOn).toContain('conversation_through_inbox');
  });

  it('replaces upstream campaigns with the GTI ones', () => {
    const names = buildGtiMenu(upstreamMenu(), t, {
      campaignsRoute: '/gti/campaigns',
    }).map(item => item.name);

    expect(names).not.toContain('Campaigns');
    expect(names).toContain('Gti Campaigns');
  });

  it('leaves notifications to the top bar bell', () => {
    const names = buildGtiMenu(upstreamMenu(), t).map(item => item.name);

    expect(names).not.toContain('Inbox');
  });

  it('points Kanban at the GTI board when its route is given', () => {
    const menu = buildGtiMenu(upstreamMenu(), t, {
      kanbanRoute: '/gti-kanban',
    });
    const kanban = menu.find(item => item.name === 'Kanban');

    expect(kanban.to).toBe('/gti-kanban');
    expect(menu.filter(item => item.name === 'Kanban')).toHaveLength(1);
  });

  it('opens the GTI page in place of an upstream list, without sub-items', () => {
    const menu = buildGtiMenu(upstreamMenu(), t, {
      pageRoutes: { 'Gti Users': '/gti/users', Contacts: '/gti/contacts' },
    });

    expect(menu.find(item => item.name === 'Gti Users').to).toBe('/gti/users');
    const contacts = menu.find(item => item.name === 'Contacts');
    expect(contacts.to).toBe('/gti/contacts');
    expect(contacts.children).toBeUndefined();
  });
});
