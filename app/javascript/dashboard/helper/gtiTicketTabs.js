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

// The list column has two levels, as in the prototype: "Abertos" (with the
// "Atendendo" / "Aguardando" sub-tabs) and "Resolvidos"; "Busca" just opens
// the search page.
export const GTI_LIST_SECTIONS = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  SEARCH: 'search',
};

export const gtiSectionOfTab = tab =>
  tab === GTI_TICKET_TABS.RESOLVED
    ? GTI_LIST_SECTIONS.RESOLVED
    : GTI_LIST_SECTIONS.OPEN;

// Sub-tabs of "Abertos". "Atendendo" counts my conversations, or every
// assigned one when "Ver todos" is on.
export const buildGtiTicketTabs = ({ allowedAssignees, stats, showAll, t }) => {
  const canSeeAll = allowedAssignees.includes(ASSIGNEE_TYPE.ALL);
  const attendingCount =
    showAll && canSeeAll
      ? (stats.allCount || 0) - (stats.unAssignedCount || 0)
      : stats.mineCount || 0;
  const tabs = [
    {
      key: GTI_TICKET_TABS.ATTENDING,
      name: t('GTI.TICKETS.ATTENDING'),
      count: attendingCount,
    },
  ];

  if (allowedAssignees.includes(ASSIGNEE_TYPE.UNASSIGNED)) {
    tabs.push({
      key: GTI_TICKET_TABS.WAITING,
      name: t('GTI.TICKETS.WAITING'),
      count: stats.unAssignedCount || 0,
    });
  }

  return tabs;
};

// A waiting conversation is open and nobody took it yet.
export const isGtiWaitingConversation = chat =>
  chat.status === STATUS_TYPE.OPEN && !chat.meta?.assignee;
