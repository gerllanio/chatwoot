import { teamMembershipChanges } from '../gtiAgentTeams';

describe('teamMembershipChanges', () => {
  it('adds newly selected teams and removes unselected ones', () => {
    expect(teamMembershipChanges([1, 2], [2, 3])).toEqual({
      toAdd: [3],
      toRemove: [1],
    });
  });

  it('changes nothing when the selection is the same', () => {
    expect(teamMembershipChanges([1, 2], [2, 1])).toEqual({
      toAdd: [],
      toRemove: [],
    });
  });
});
