import {
  PANEL_PERIODS,
  agentRows,
  agentStatusCounts,
  channelTotals,
  csatScore,
  deltaPercent,
  donutSegments,
  formatDuration,
  heatmapGrid,
  isImprovement,
  linePoints,
  periodRange,
  sortRows,
} from '../gtiPanel';

describe('gtiPanel', () => {
  describe('periodRange', () => {
    const now = new Date(2026, 10, 25, 15, 30);

    it('buckets today by hour from midnight', () => {
      const range = periodRange(PANEL_PERIODS.TODAY, now);

      expect(new Date(range.since * 1000)).toEqual(new Date(2026, 10, 25));
      expect(range.groupBy).toBe('hour');
    });

    it('counts the last 7 days including today', () => {
      const range = periodRange(PANEL_PERIODS.LAST_7_DAYS, now);

      expect(new Date(range.since * 1000)).toEqual(new Date(2026, 10, 19));
      expect(range.groupBy).toBe('day');
    });

    it('starts this month on its first day', () => {
      const range = periodRange(PANEL_PERIODS.THIS_MONTH, now);

      expect(new Date(range.since * 1000)).toEqual(new Date(2026, 10, 1));
    });
  });

  it('compares with the previous period only when there is one', () => {
    expect(deltaPercent(120, 100)).toBe(20);
    expect(deltaPercent(80, 100)).toBe(-20);
    expect(deltaPercent(5, 0)).toBeNull();
  });

  it('reads a drop in wait time as an improvement', () => {
    expect(isImprovement(-14, false)).toBe(true);
    expect(isImprovement(-14, true)).toBe(false);
  });

  it('formats durations the way the team reads them', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(40)).toBe('40s');
    expect(formatDuration(220)).toBe('4 min');
    expect(formatDuration(3900)).toBe('1h05');
  });

  it('counts 4 and 5 star answers as satisfied', () => {
    expect(
      csatScore({ total_count: 4, ratings_count: { 5: 2, 4: 1, 1: 1 } })
    ).toBe(75);
    expect(csatScore({ total_count: 0, ratings_count: {} })).toBeNull();
  });

  it('treats unknown availability as offline', () => {
    expect(
      agentStatusCounts([
        { availability_status: 'online' },
        { availability_status: 'busy' },
        { availability_status: 'offline' },
        {},
      ])
    ).toEqual({ online: 1, busy: 1, offline: 2 });
  });

  it('splits a donut into consecutive percentage segments', () => {
    const segments = donutSegments([
      { key: 'a', value: 1 },
      { key: 'b', value: 0 },
      { key: 'c', value: 3 },
    ]);

    expect(
      segments.map(({ key, length, offset }) => [key, length, offset])
    ).toEqual([
      ['a', 25, 0],
      ['c', 75, 25],
    ]);
    expect(donutSegments([{ key: 'a', value: 0 }])).toEqual([]);
  });

  it('adds up inbox conversations per channel', () => {
    const inboxes = [
      { id: 1, channel_type: 'Channel::Whatsapp' },
      { id: 2, channel_type: 'Channel::Whatsapp' },
      { id: 3, channel_type: 'Channel::Email' },
      { id: 4, channel_type: 'Channel::Api' },
    ];
    const rows = [
      { id: 1, conversations_count: 5 },
      { id: 2, conversations_count: 3 },
      { id: 3, conversations_count: 2 },
      { id: 4, conversations_count: 0 },
      { id: 9, conversations_count: 7 },
    ];

    expect(channelTotals(rows, inboxes)).toEqual([
      { key: 'WHATSAPP', value: 8 },
      { key: 'EMAIL', value: 2 },
    ]);
  });

  it('places conversations by local weekday and hour', () => {
    const monday10 = new Date(2026, 10, 23, 10, 0).getTime() / 1000;
    const grid = heatmapGrid([
      { timestamp: monday10, value: 2 },
      { timestamp: monday10, value: 1 },
    ]);

    expect(grid[1][10]).toBe(3);
    expect(grid.flat().reduce((sum, value) => sum + value, 0)).toBe(3);
  });

  it('sorts numbers and names in both directions', () => {
    const rows = [
      { name: 'Bia', firstResponse: 30 },
      { name: 'Ana', firstResponse: null },
      { name: 'Caio', firstResponse: 90 },
    ];

    expect(sortRows(rows, 'name', 1).map(row => row.name)).toEqual([
      'Ana',
      'Bia',
      'Caio',
    ]);
    expect(sortRows(rows, 'firstResponse', -1).map(row => row.name)).toEqual([
      'Caio',
      'Bia',
      'Ana',
    ]);
  });

  it('joins period numbers with the live open count per agent', () => {
    const rows = agentRows(
      [{ id: 7, conversations_count: 10, resolved_conversations_count: 8 }],
      [{ id: 7, metric: { open: 2 } }],
      [
        { id: 7, name: 'Ana', availability_status: 'online' },
        { id: 8, name: 'Bia' },
      ]
    );

    expect(rows[0]).toMatchObject({ total: 10, open: 2, resolved: 8 });
    expect(rows[1]).toMatchObject({ total: 0, open: 0, status: 'offline' });
  });

  it('draws a series across the whole width', () => {
    expect(linePoints([0, 5, 10], 100, 50, 10)).toBe('0,50 50,25 100,0');
    expect(linePoints([], 100, 50, 10)).toBe('');
  });
});
