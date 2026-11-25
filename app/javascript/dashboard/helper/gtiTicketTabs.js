// GTI "Work" ticket tabs (Ticketz style). Each tab is just a pair of the
// filters Chatwoot's conversation list already understands: who the
// conversation is assigned to and its status.

import wootConstants from 'dashboard/constants/globals';

const { ASSIGNEE_TYPE, STATUS_TYPE } = wootConstants;

export const GTI_TICKET_TABS = {
  ATTENDING: 'attending',
  WAITING: 'waiting',
  RESOLVED: 'resolved',
};

export const gtiTabToFilters = (tab, { showAll, allowedAssignees }) => {
  const canSeeAll = allowedAssignees.includes(ASSIGNEE_TYPE.ALL);

  if (tab === GTI_TICKET_TABS.WAITING) {
    return { assignee: ASSIGNEE_TYPE.UNASSIGNED, status: STATUS_TYPE.OPEN };
  }
  if (tab === GTI_TICKET_TABS.RESOLVED) {
    return {
      assignee: canSeeAll ? ASSIGNEE_TYPE.ALL : ASSIGNEE_TYPE.ME,
      status: STATUS_TYPE.RESOLVED,
    };
  }
  return {
    assignee: showAll && canSeeAll ? ASSIGNEE_TYPE.ALL : ASSIGNEE_TYPE.ME,
    status: STATUS_TYPE.OPEN,
  };
};

export const filtersToGtiTab = ({ assignee, status }) => {
  if (status === STATUS_TYPE.RESOLVED) {
    return GTI_TICKET_TABS.RESOLVED;
  }
  if (assignee === ASSIGNEE_TYPE.UNASSIGNED) {
    return GTI_TICKET_TABS.WAITING;
  }
  return GTI_TICKET_TABS.ATTENDING;
};

// Counts come from the conversation stats of the status being listed, so they
// are only meaningful on the open tabs.
export const buildGtiTicketTabs = ({ allowedAssignees, stats, status, t }) => {
  const showCounts = status === STATUS_TYPE.OPEN;
  const tabs = [
    {
      key: GTI_TICKET_TABS.ATTENDING,
      name: t('GTI.TICKETS.ATTENDING'),
      count: showCounts ? stats.mineCount || 0 : null,
    },
  ];

  if (allowedAssignees.includes(ASSIGNEE_TYPE.UNASSIGNED)) {
    tabs.push({
      key: GTI_TICKET_TABS.WAITING,
      name: t('GTI.TICKETS.WAITING'),
      count: showCounts ? stats.unAssignedCount || 0 : null,
    });
  }

  tabs.push({
    key: GTI_TICKET_TABS.RESOLVED,
    name: t('GTI.TICKETS.RESOLVED'),
    count: null,
  });

  return tabs;
};

// A waiting conversation is open and nobody took it yet.
export const isGtiWaitingConversation = chat =>
  chat.status === STATUS_TYPE.OPEN && !chat.meta?.assignee;
