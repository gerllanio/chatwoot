// Wait-time helpers for the GTI "Work" Kanban TV mode and the Painel: how
// long a customer has been waiting and when that counts as late.

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
