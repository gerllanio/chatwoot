import { formatWait, isLate, waitingSeconds } from '../gtiMonitor';

const NOW = 10_000;

describe('gtiMonitor', () => {
  it('measures the wait from waiting_since, or from creation when it is not set', () => {
    expect(waitingSeconds({ waiting_since: 9_400 }, NOW)).toBe(600);
    expect(waitingSeconds({ waiting_since: 0, created_at: 9_880 }, NOW)).toBe(
      120
    );
  });

  it('formats waits like the Ticketz panel', () => {
    expect(formatWait(59)).toBe('0 min');
    expect(formatWait(14 * 60)).toBe('14 min');
    expect(formatWait(75 * 60)).toBe('1h15');
  });

  it('flags customers waiting ten minutes or more', () => {
    expect(isLate(9 * 60 + 59)).toBe(false);
    expect(isLate(10 * 60)).toBe(true);
  });
});
