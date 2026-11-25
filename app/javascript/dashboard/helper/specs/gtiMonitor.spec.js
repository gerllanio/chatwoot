import {
  formatWait,
  groupWaitingByTeam,
  isLate,
  longestWait,
  waitingSeconds,
} from '../gtiMonitor';

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

  it('groups waiting customers by queue, longest wait first', () => {
    const teams = [
      { id: 1, name: 'Suporte' },
      { id: 2, name: 'Financeiro' },
    ];
    const conversations = [
      {
        id: 11,
        waiting_since: 9_900,
        meta: { sender: { name: 'Ana' }, team: { id: 1 } },
      },
      {
        id: 12,
        waiting_since: 9_000,
        meta: { sender: { name: 'Bruno' }, team: { id: 1 } },
      },
      { id: 13, waiting_since: 9_500, meta: { sender: { name: 'Carla' } } },
    ];

    const columns = groupWaitingByTeam(conversations, teams, NOW, 'Sem fila');

    expect(
      columns.map(column => [column.name, column.waiting.map(w => w.name)])
    ).toEqual([
      ['Suporte', ['Bruno', 'Ana']],
      ['Financeiro', []],
      ['Sem fila', ['Carla']],
    ]);
    expect(longestWait(columns)).toBe(1_000);
  });

  it('leaves out the "no queue" column when everyone has a queue', () => {
    const columns = groupWaitingByTeam(
      [{ id: 1, waiting_since: NOW, meta: { team: { id: 5 } } }],
      [{ id: 5, name: 'Comercial' }],
      NOW,
      'Sem fila'
    );

    expect(columns.map(column => column.name)).toEqual(['Comercial']);
  });
});
