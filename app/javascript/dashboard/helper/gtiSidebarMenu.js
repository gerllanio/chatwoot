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

export const buildGtiMenu = (
  upstreamItems,
  t,
  { monitorRoute, helpRoute, tasksRoute, panelRoute } = {}
) => {
  const settings = findByName(upstreamItems, 'Settings');
  const settingsChildren = settings?.children || [];
  const promotedNames = Object.values(PROMOTED_SETTINGS);
  const remainingSettings = renamed(settings, {
    label: t('GTI.SIDEBAR.SETTINGS'),
    children: settingsChildren.filter(
      child => !promotedNames.includes(child.name)
    ),
  });

  const attendanceItems = [
    renamed(findByName(upstreamItems, 'Conversation'), {
      label: t('GTI.SIDEBAR.TICKETS'),
      icon: 'i-lucide-messages-square',
    }),
    tasksRoute
      ? {
          name: 'Gti Tasks',
          label: t('GTI.SIDEBAR.TASKS'),
          icon: 'i-lucide-list-checks',
          to: tasksRoute,
        }
      : null,
    renamed(findByName(upstreamItems, 'Inbox'), {
      label: t('GTI.SIDEBAR.NOTIFICATIONS'),
      icon: 'i-lucide-bell',
    }),
    renamed(findByName(upstreamItems, 'Kanban'), {
      label: t('GTI.SIDEBAR.KANBAN'),
    }),
    monitorRoute
      ? {
          name: 'Gti Monitor',
          label: t('GTI.SIDEBAR.MONITOR'),
          icon: 'i-lucide-monitor',
          to: monitorRoute,
        }
      : null,
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.canned, {
      name: 'Gti Quick Replies',
      label: t('GTI.SIDEBAR.QUICK_REPLIES'),
      icon: 'i-lucide-zap',
    }),
    renamed(findByName(upstreamItems, 'Contacts'), {
      label: t('GTI.SIDEBAR.CONTACTS'),
    }),
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.labels, {
      name: 'Gti Tags',
      label: t('GTI.SIDEBAR.TAGS'),
      icon: 'i-lucide-tag',
    }),
    renamed(findByName(upstreamItems, 'InternalChat'), {
      label: t('GTI.SIDEBAR.INTERNAL_CHAT'),
      icon: 'i-lucide-message-square-more',
    }),
    findByName(upstreamItems, 'Calls'),
    helpRoute
      ? {
          name: 'Gti Help',
          label: t('GTI.SIDEBAR.HELP'),
          icon: 'i-lucide-circle-help',
          to: helpRoute,
        }
      : null,
  ];

  const adminItems = [
    panelRoute
      ? {
          name: 'Gti Panel',
          label: t('GTI.SIDEBAR.PANEL'),
          icon: 'i-lucide-layout-dashboard',
          to: panelRoute,
        }
      : null,
    renamed(findByName(upstreamItems, 'Reports'), {
      label: t('GTI.SIDEBAR.REPORTS'),
    }),
    renamed(findByName(upstreamItems, 'Campaigns'), {
      label: t('GTI.SIDEBAR.CAMPAIGNS'),
    }),
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.inboxes, {
      name: 'Gti Connections',
      label: t('GTI.SIDEBAR.CONNECTIONS'),
      icon: 'i-lucide-link',
    }),
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.teams, {
      name: 'Gti Queues',
      label: t('GTI.SIDEBAR.QUEUES'),
      icon: 'i-lucide-list-ordered',
    }),
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.agents, {
      name: 'Gti Users',
      label: t('GTI.SIDEBAR.USERS'),
      icon: 'i-lucide-users',
    }),
    renamed(findByName(upstreamItems, 'Companies'), {
      label: t('GTI.SIDEBAR.COMPANIES'),
    }),
    promoteSettingsChild(settingsChildren, PROMOTED_SETTINGS.integrations, {
      name: 'Gti Integrations',
      label: t('GTI.SIDEBAR.INTEGRATIONS'),
      icon: 'i-lucide-blocks',
    }),
    findByName(upstreamItems, 'Captain'),
    findByName(upstreamItems, 'Portals'),
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
  ];
};
