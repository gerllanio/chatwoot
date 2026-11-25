// GTI "Work" Kanban: sorts conversations into the Ticketz-style stages (or
// queues) and turns a card dropped on another column into the actions that
// actually move the conversation there.
import wootConstants from 'dashboard/constants/globals';

const { STATUS_TYPE } = wootConstants;
const OUTGOING_MESSAGE = 1;
const SECONDS_PER_MILLISECOND = 1000;

export const KANBAN_STAGES = {
  NEW: 'new',
  ATTENDING: 'attending',
  WAITING_CUSTOMER: 'waiting_customer',
  RESOLVED: 'resolved',
};

export const KANBAN_STAGE_ORDER = [
  KANBAN_STAGES.NEW,
  KANBAN_STAGES.ATTENDING,
  KANBAN_STAGES.WAITING_CUSTOMER,
  KANBAN_STAGES.RESOLVED,
];

export const startOfTodaySeconds = (now = new Date()) => {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return Math.floor(midnight.getTime() / SECONDS_PER_MILLISECOND);
};

// Novo: nobody on it yet. Em atendimento: an agent has it and the customer
// spoke last. Aguardando cliente: the agent answered last, or it was set
// pending. Resolvido: closed today. Anything else (snoozed, resolved on an
// earlier day) stays off the board.
export const kanbanStage = (conversation, todayStart) => {
  const { status } = conversation;
  if (status === STATUS_TYPE.RESOLVED) {
    return conversation.timestamp >= todayStart ? KANBAN_STAGES.RESOLVED : null;
  }
  if (status === STATUS_TYPE.PENDING) {
    return KANBAN_STAGES.WAITING_CUSTOMER;
  }
  if (status !== STATUS_TYPE.OPEN) {
    return null;
  }
  if (!conversation.meta?.assignee) {
    return KANBAN_STAGES.NEW;
  }
  const lastType = conversation.last_non_activity_message?.message_type;
  return lastType === OUTGOING_MESSAGE
    ? KANBAN_STAGES.WAITING_CUSTOMER
    : KANBAN_STAGES.ATTENDING;
};

export const groupByStage = (conversations, todayStart) => {
  const groups = Object.fromEntries(
    KANBAN_STAGE_ORDER.map(stage => [stage, []])
  );
  conversations.forEach(conversation => {
    const stage = kanbanStage(conversation, todayStart);
    if (stage) {
      groups[stage].push(conversation);
    }
  });
  return groups;
};

// One column per queue with everything still in progress; a "no queue"
// column only when something sits outside every team.
export const groupByTeam = (conversations, teams, noTeamLabel) => {
  const columns = teams.map(team => ({
    id: team.id,
    name: team.name,
    color: team.icon_color || null,
    conversations: [],
  }));
  const noTeam = {
    id: null,
    name: noTeamLabel,
    color: null,
    conversations: [],
  };

  conversations
    .filter(conversation => conversation.status !== STATUS_TYPE.RESOLVED)
    .forEach(conversation => {
      const column = columns.find(
        item => item.id === conversation.meta?.team?.id
      );
      (column || noTeam).conversations.push(conversation);
    });

  return noTeam.conversations.length ? [...columns, noTeam] : columns;
};

// What dropping a card on a stage means. Each entry is one API call, in order.
export const dropActions = (conversation, targetStage, currentUserId) => {
  const actions = [];
  const assigneeId = conversation.meta?.assignee?.id ?? null;
  const ensureOpen = () => {
    if (conversation.status !== STATUS_TYPE.OPEN) {
      actions.push({ type: 'status', status: STATUS_TYPE.OPEN });
    }
  };

  if (targetStage === KANBAN_STAGES.NEW) {
    ensureOpen();
    if (assigneeId) {
      actions.push({ type: 'assign', agentId: null });
    }
  } else if (targetStage === KANBAN_STAGES.ATTENDING) {
    ensureOpen();
    if (assigneeId !== currentUserId) {
      actions.push({ type: 'assign', agentId: currentUserId });
    }
  } else if (
    targetStage === KANBAN_STAGES.WAITING_CUSTOMER &&
    conversation.status !== STATUS_TYPE.PENDING
  ) {
    actions.push({ type: 'status', status: STATUS_TYPE.PENDING });
  } else if (
    targetStage === KANBAN_STAGES.RESOLVED &&
    conversation.status !== STATUS_TYPE.RESOLVED
  ) {
    actions.push({ type: 'status', status: STATUS_TYPE.RESOLVED });
  }
  return actions;
};
