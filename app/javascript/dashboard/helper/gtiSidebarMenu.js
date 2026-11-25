// GTI "Work" sidebar: reorganises the menu Chatwoot builds into the flat,
// Ticketz-style order the GTI team works with. It only reorders and renames
// entries that already exist, so every route, permission check and unread
// badge keeps coming from upstream's own menu definition.

const PROMOTED_SETTINGS = {
  canned: 'Settings Canned Responses',
  labels: 'Settings Labels',
  inboxes: 'Settings Inboxes',
  teams: 'Settings Teams',
  agents: 'Settings Agents',
  integrations: 'Settings Integrations',
};

const findByName = (items, name) => items.find(item => item.name === name);

const promoteSettingsChild = (settingsChildren, name, overrides) => {
  const child = findByName(settingsChildren, name);
  if (!child) {
    return null;
  }
  return { ...child, ...overrides };
};

const renamed = (item, overrides) => {
  if (!item) {
    return null;
  }
  return { ...item, ...overrides };
};

// Every conversation list page: the flat "Atendimentos" entry stays
// highlighted on all of them (queues, labels, inboxes, mentions...).
const CONVERSATION_ROUTES = [
  'home',
  'inbox_conversation',
  'inbox_dashboard',
  'conversation_through_inbox',
  'label_conversations',
  'conversations_through_label',
  'team_conversations',
  'conversations_through_team',
  'folder_conversations',
  'conversations_through_folders',
  'conversation_mentions',
  'conversation_through_mentions',
  'conversation_unattended',
  'conversation_through_unattended',
  'conversation_participating',
  'conversation_through_participating',
];

// "Atendimentos" is a plain link in the prototype: the queue, inbox and label
// filters live in the ticket list header instead of a long tree here.
const flatConversations = (conversation, t) => {
  if (!conversation) {
    return null;
  }
  const { children = [], ...item } = conversation;
  const home = findByName(children, 'All');
  return {
    ...item,
    label: t('GTI.SIDEBAR.TICKETS'),
    icon: 'i-material-symbols-chat',
    to: home?.to,
    activeOn: CONVERSATION_ROUTES,
  };
};

// GTI pages that replace an upstream list (Usuários, Filas, Conexões…): the
// entry keeps its place and label but opens the GTI page, with no sub-items.
const withGtiPage = (item, pageRoutes) => {
  const route = pageRoutes[item.name];
  if (!route) return item;
  return { ...item, to: route, children: undefined, activeOn: undefined };
};

export const buildGtiMenu = (
  upstreamItems,
  t,
  {
    monitorRoute,
    kanbanRoute,
    mailRoute,
    helpRoute,
    tasksRoute,
    panelRoute,
    campaignsRoute,
    settingsRoute,
    pageRoutes = {},
  } = {}
) => {
  const settings = findByName(upstreamItems, 'Settings');
  const settingsChildren = settings?.children || [];
  const promotedNames = Object.values(PROMOTED_SETTINGS);
  const remainingSettings = renamed(settings, {
    label: settingsRoute
      ? t('GTI.SIDEBAR.ADVANCED_SETTINGS')
      : t('GTI.SIDEBAR.SETTINGS'),
    children: settingsChildren.filter(
      child => !promotedNames.includes(child.name)
    ),
  });

  const attendanceItems = [
    flatConversations(findByName(upstreamItems, 'Conversation'), t),
    mailRoute
      ? {
          name: 'Gti Mail',
          label: t('GTI.SIDEBAR.MAIL'),
          icon: 'i-material-symbols-mail',
          to: mailRoute,
        }
      : null,
    tasksRoute
      ? {
          name: 'Gti Tasks',
          label: t('GTI.SIDEBAR.TASKS'),
          icon: 'i-material-symbols-assignment-turned-in',
          to: tasksRoute,
        }
      : null,
    // Notifications live in the top bar's bell, as in the prototype.
    // GTI's own board (stages, queues and TV mode) replaces fazer.ai's funnels.
    kanbanRoute
      ? {
          name: 'Kanban',
          label: t('GTI.SIDEBAR.KANBAN'),
          icon: 'i-material-symbols-view-kanban',
          to: kanbanRoute,
        }
      : renamed(findByName(upstreamItems, 'Kanban'), {
          label: t('GTI.SIDEBAR.KANBAN'),
        }),
    monitorRoute
      ? {
          name: 'Gti Monitor',
          label: t('GTI.SIDEBAR.MONITOR'),
          icon: 'i-material-symbols-monitor',
          to: monitorRoute,
        }
      : null,
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.canned, {
      name: 'Gti Quick Replies',
      label: t('GTI.SIDEBAR.QUICK_REPLIES'),
      icon: 'i-material-symbols-bolt',
    }),
    renamed(findByName(upstreamItems, 'Contacts'), {
      icon: 'i-material-symbols-group',
      label: t('GTI.SIDEBAR.CONTACTS'),
    }),
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.labels, {
      name: 'Gti Tags',
      label: t('GTI.SIDEBAR.TAGS'),
      icon: 'i-material-symbols-sell',
    }),
    renamed(findByName(upstreamItems, 'InternalChat'), {
      label: t('GTI.SIDEBAR.INTERNAL_CHAT'),
      icon: 'i-material-symbols-forum',
    }),
    findByName(upstreamItems, 'Calls'),
    helpRoute
      ? {
          name: 'Gti Help',
          label: t('GTI.SIDEBAR.HELP'),
          icon: 'i-material-symbols-help-outline',
          to: helpRoute,
        }
      : null,
  ];

  const adminItems = [
    panelRoute
      ? {
          name: 'Gti Panel',
          label: t('GTI.SIDEBAR.PANEL'),
          icon: 'i-material-symbols-dashboard',
          to: panelRoute,
        }
      : null,
    renamed(findByName(upstreamItems, 'Reports'), {
      icon: 'i-material-symbols-bar-chart',
      label: t('GTI.SIDEBAR.REPORTS'),
    }),
    // Ticketz-style campaigns replace upstream's, which need WhatsApp Cloud templates.
    campaignsRoute
      ? {
          name: 'Gti Campaigns',
          label: t('GTI.SIDEBAR.CAMPAIGNS'),
          icon: 'i-material-symbols-campaign',
          to: campaignsRoute,
        }
      : renamed(findByName(upstreamItems, 'Campaigns'), {
          icon: 'i-material-symbols-campaign',
          label: t('GTI.SIDEBAR.CAMPAIGNS'),
        }),
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.inboxes, {
      name: 'Gti Connections',
      label: t('GTI.SIDEBAR.CONNECTIONS'),
      icon: 'i-material-symbols-link',
    }),
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.teams, {
      name: 'Gti Queues',
      label: t('GTI.SIDEBAR.QUEUES'),
      icon: 'i-material-symbols-sort',
    }),
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.agents, {
      name: 'Gti Users',
      label: t('GTI.SIDEBAR.USERS'),
      icon: 'i-material-symbols-person',
    }),
    renamed(findByName(upstreamItems, 'Companies'), {
      icon: 'i-material-symbols-domain',
      label: t('GTI.SIDEBAR.COMPANIES'),
    }),
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.integrations, {
      name: 'Gti Integrations',
      label: t('GTI.SIDEBAR.INTEGRATIONS'),
      icon: 'i-material-symbols-extension',
    }),
    findByName(upstreamItems, 'Captain'),
    findByName(upstreamItems, 'Portals'),
    settingsRoute
      ? {
          name: 'Gti Settings',
          label: t('GTI.SIDEBAR.SETTINGS'),
          icon: 'i-material-symbols-settings',
          to: settingsRoute,
        }
      : null,
    remainingSettings,
  ];

  const known = [
    'Conversation',
    'Inbox',
    'Kanban',
    'Contacts',
    'InternalChat',
    'Calls',
    'Reports',
    'Campaigns',
    'Companies',
    'Captain',
    'Portals',
    'Settings',
  ];
  // Anything upstream adds later still shows up, just after our own order.
  const newUpstreamItems = upstreamItems.filter(
    item => !known.includes(item.name)
  );

  // The first admin entry carries the "Administração" heading the sidebar
  // draws above it.
  const visibleAdminItems = adminItems.filter(Boolean);
  if (visibleAdminItems.length) {
    visibleAdminItems[0] = {
      ...visibleAdminItems[0],
      sectionLabel: t('GTI.SIDEBAR.ADMIN_SECTION'),
    };
  }

  return [
    ...attendanceItems.filter(Boolean),
    ...visibleAdminItems,
    ...newUpstreamItems,
  ].map(item => withGtiPage(item, pageRoutes));
};
