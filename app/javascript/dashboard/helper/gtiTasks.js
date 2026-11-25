// GTI "Work" tasks: how a due date reads in the list ("Hoje 11:00",
// "Amanhã 10:00", "Ontem", "25/11 14:30") and the form's datetime-local value.

const MS_PER_SECOND = 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const GTI_TASK_DUE_DAYS = {
  YESTERDAY: 'YESTERDAY',
  TODAY: 'TODAY',
  TOMORROW: 'TOMORROW',
};

const pad = value => String(value).padStart(2, '0');

const startOfDay = date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const describeTaskDue = (dueAtSeconds, now = new Date()) => {
  const due = new Date(dueAtSeconds * MS_PER_SECOND);
  const dayOffset = Math.round(
    (startOfDay(due) - startOfDay(now)) / MS_PER_DAY
  );
  const day = {
    [-1]: GTI_TASK_DUE_DAYS.YESTERDAY,
    0: GTI_TASK_DUE_DAYS.TODAY,
    1: GTI_TASK_DUE_DAYS.TOMORROW,
  }[dayOffset];
  return {
    day: day || null,
    time: `${pad(due.getHours())}:${pad(due.getMinutes())}`,
    date: `${pad(due.getDate())}/${pad(due.getMonth() + 1)}`,
  };
};

export const isTaskOverdue = (task, now = Date.now()) =>
  !task.completed_at &&
  Boolean(task.due_at) &&
  task.due_at * MS_PER_SECOND < now;

export const toDatetimeLocal = dueAtSeconds => {
  if (!dueAtSeconds) return '';
  const date = new Date(dueAtSeconds * MS_PER_SECOND);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const GTI_TASK_PRIORITY_CLASSES = {
  high: 'bg-n-gti-prio-high',
  medium: 'bg-n-gti-prio-medium',
  low: 'bg-n-gti-prio-low',
};
