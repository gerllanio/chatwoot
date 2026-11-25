// GTI "Work": each queue's color (and greeting settings) for the list pages.
// The color comes from the queue greeting settings, then the team icon color,
// then a fixed palette, so a queue keeps the same chip color everywhere.
import { ref } from 'vue';
import GtiTeamSettingsAPI from 'dashboard/api/gtiTeamSettings';
import { gtiTeamColor } from 'dashboard/helper/gtiPages';

export function useGtiTeamColors() {
  const settingsByTeam = ref({});

  const loadTeamSettings = async teams => {
    const entries = await Promise.all(
      teams.map(async team => {
        try {
          const { data } = await GtiTeamSettingsAPI.get(team.id);
          return [team.id, data];
        } catch (error) {
          return [team.id, null];
        }
      })
    );
    settingsByTeam.value = Object.fromEntries(entries);
  };

  const colorOf = (team, index) =>
    gtiTeamColor(team, settingsByTeam.value[team.id], index);

  return { settingsByTeam, loadTeamSettings, colorOf };
}
