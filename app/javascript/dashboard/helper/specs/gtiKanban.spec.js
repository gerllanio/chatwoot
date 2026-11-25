import {
  KANBAN_STAGES,
  dropActions,
  groupByStage,
  groupByTeam,
  kanbanStage,
  startOfTodaySeconds,
} from '../gtiKanban';

const TODAY = 1_000_000;
const agent = { id: 7, name: 'Kaue' };
const conversation = overrides => ({
  id: 1,
  status: 'open',
  timestamp: TODAY + 10,
  meta: { assignee: null, team: null },
  last_non_activity_message: null,
  ...overrides,
});

describe('kanbanStage', () => {
  it('puts unassigned open conversations in Novo', () => {
    expect(kanbanStage(conversation({}), TODAY)).toBe(KANBAN_STAGES.NEW);
  });

  it('splits assigned conversations by who spoke last', () => {
    const customerLast = conversation({
      meta: { assignee: agent },
      last_non_activity_message: { message_type: 0 },
    });
    const agentLast = conversation({
      meta: { assignee: agent },
      last_non_activity_message: { message_type: 1 },
    });

    expect(kanbanStage(customerLast, TODAY)).toBe(KANBAN_STAGES.ATTENDING);
    expect(kanbanStage(agentLast, TODAY)).toBe(KANBAN_STAGES.WAITING_CUSTOMER);
  });

  it('treats pending as waiting for the customer', () => {
    expect(kanbanStage(conversation({ status: 'pending' }), TODAY)).toBe(
      KANBAN_STAGES.WAITING_CUSTOMER
    );
  });

  it('only shows conversations resolved today', () => {
    expect(kanbanStage(conversation({ status: 'resolved' }), TODAY)).toBe(
      KANBAN_STAGES.RESOLVED
    );
    expect(
      kanbanStage(
        conversation({ status: 'resolved', timestamp: TODAY - 1 }),
        TODAY
      )
    ).toBeNull();
    expect(kanbanStage(conversation({ status: 'snoozed' }), TODAY)).toBeNull();
  });
});

describe('groupByStage', () => {
  it('fills every stage column, empty ones included', () => {
    const groups = groupByStage([conversation({ id: 3 })], TODAY);

    expect(groups[KANBAN_STAGES.NEW].map(item => item.id)).toEqual([3]);
    expect(groups[KANBAN_STAGES.RESOLVED]).toEqual([]);
  });
});

describe('groupByTeam', () => {
  it('groups unresolved conversations by queue, with a no-queue column only when needed', () => {
    const teams = [{ id: 1, name: 'suporte', icon_color: '#00A656' }];
    const items = [
      conversation({ id: 1, meta: { team: { id: 1 } } }),
      conversation({ id: 2, status: 'resolved', meta: { team: { id: 1 } } }),
    ];

    expect(groupByTeam(items, teams, 'Sem fila')).toEqual([
      {
        id: 1,
        name: 'suporte',
        color: '#00A656',
        conversations: [items[0]],
      },
    ]);
    expect(
      groupByTeam([conversation({ id: 9 })], teams, 'Sem fila').at(-1).name
    ).toBe('Sem fila');
  });
});

describe('dropActions', () => {
  it('unassigns when dropped on Novo', () => {
    expect(
      dropActions(conversation({ meta: { assignee: agent } }), 'new', 3)
    ).toEqual([{ type: 'assign', agentId: null }]);
  });

  it('reopens and takes the conversation when dropped on Em atendimento', () => {
    expect(
      dropActions(conversation({ status: 'pending' }), 'attending', 3)
    ).toEqual([
      { type: 'status', status: 'open' },
      { type: 'assign', agentId: 3 },
    ]);
  });

  it('sets pending or resolved for the last two columns', () => {
    expect(dropActions(conversation({}), 'waiting_customer', 3)).toEqual([
      { type: 'status', status: 'pending' },
    ]);
    expect(dropActions(conversation({}), 'resolved', 3)).toEqual([
      { type: 'status', status: 'resolved' },
    ]);
  });

  it('does nothing when the card already matches the column', () => {
    expect(
      dropActions(
        conversation({ meta: { assignee: { id: 3 } } }),
        'attending',
        3
      )
    ).toEqual([]);
  });
});

describe('startOfTodaySeconds', () => {
  it('returns local midnight in seconds', () => {
    const now = new Date(2026, 10, 25, 15, 30);
    expect(startOfTodaySeconds(now)).toBe(
      new Date(2026, 10, 25).getTime() / 1000
    );
  });
});
