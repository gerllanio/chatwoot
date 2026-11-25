import {
  describeTaskDue,
  GTI_TASK_DUE_DAYS,
  isTaskOverdue,
  toDatetimeLocal,
} from '../gtiTasks';

const seconds = date => Math.floor(date.getTime() / 1000);
const now = new Date(2026, 10, 25, 9, 0);

describe('describeTaskDue', () => {
  it('names today, tomorrow and yesterday', () => {
    expect(
      describeTaskDue(seconds(new Date(2026, 10, 25, 11, 0)), now)
    ).toEqual({ day: GTI_TASK_DUE_DAYS.TODAY, time: '11:00', date: '25/11' });
    expect(
      describeTaskDue(seconds(new Date(2026, 10, 26, 10, 5)), now).day
    ).toBe(GTI_TASK_DUE_DAYS.TOMORROW);
    expect(
      describeTaskDue(seconds(new Date(2026, 10, 24, 23, 59)), now).day
    ).toBe(GTI_TASK_DUE_DAYS.YESTERDAY);
  });

  it('falls back to the date for other days', () => {
    expect(
      describeTaskDue(seconds(new Date(2026, 11, 3, 14, 30)), now)
    ).toEqual({ day: null, time: '14:30', date: '03/12' });
  });
});

describe('isTaskOverdue', () => {
  const past = seconds(new Date(2026, 10, 24, 8, 0));

  it('flags a pending task whose due date has passed', () => {
    expect(isTaskOverdue({ due_at: past }, now.getTime())).toBe(true);
  });

  it('does not flag done tasks or tasks without a due date', () => {
    expect(
      isTaskOverdue({ due_at: past, completed_at: past }, now.getTime())
    ).toBe(false);
    expect(isTaskOverdue({ due_at: null }, now.getTime())).toBe(false);
  });
});

describe('toDatetimeLocal', () => {
  it('formats a timestamp for a datetime-local input', () => {
    expect(toDatetimeLocal(seconds(new Date(2026, 0, 5, 7, 3)))).toBe(
      '2026-01-05T07:03'
    );
    expect(toDatetimeLocal(null)).toBe('');
  });
});
