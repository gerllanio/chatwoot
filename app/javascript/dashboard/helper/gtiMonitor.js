// Data shaping for the GTI "Work" TV monitor: who is waiting in each queue
// (Chatwoot team) and for how long.

export const LATE_AFTER_SECONDS = 10 * 60;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

// waiting_since is 0 when the customer is not waiting on us; fall back to the
// conversation creation so a brand new conversation still shows a wait.
export const waitingSeconds = (conversation, nowSeconds) => {
  const since = conversation.waiting_since || conversation.created_at || 0;
  return Math.max(0, nowSeconds - since);
};

export const formatWait = seconds => {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = String(minutes % MINUTES_PER_HOUR).padStart(2, '0');
  return `${hours}h${rest}`;
};

export const isLate = seconds => seconds >= LATE_AFTER_SECONDS;

// One column per team, plus "no queue" when someone is waiting outside any
// team. Customers are sorted by who has waited the longest.
export const groupWaitingByTeam = (
  conversations,
  teams,
  nowSeconds,
  noTeamLabel
) => {
  const columns = teams.map(team => ({
    id: team.id,
    name: team.name,
    waiting: [],
  }));
  const noTeam = { id: null, name: noTeamLabel, waiting: [] };

  conversations.forEach(conversation => {
    const entry = {
      id: conversation.id,
      name: conversation.meta?.sender?.name || '',
      seconds: waitingSeconds(conversation, nowSeconds),
    };
    const column = columns.find(
      item => item.id === conversation.meta?.team?.id
    );
    (column || noTeam).waiting.push(entry);
  });

  const all = noTeam.waiting.length ? [...columns, noTeam] : columns;
  all.forEach(column =>
    column.waiting.sort((first, second) => second.seconds - first.seconds)
  );
  return all;
};

export const longestWait = columns =>
  columns.reduce(
    (longest, column) =>
      Math.max(longest, ...column.waiting.map(entry => entry.seconds)),
    0
  );
