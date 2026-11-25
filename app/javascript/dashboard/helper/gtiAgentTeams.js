// GTI "Work": which queues (teams) a user attends, edited from the user form.
// Chatwoot keeps membership on the team side, so saving the form turns the
// selected team list into per-team add/remove calls.

export const teamMembershipChanges = (currentTeamIds, selectedTeamIds) => ({
  toAdd: selectedTeamIds.filter(id => !currentTeamIds.includes(id)),
  toRemove: currentTeamIds.filter(id => !selectedTeamIds.includes(id)),
});
