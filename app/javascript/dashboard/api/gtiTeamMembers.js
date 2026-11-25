/* global axios */
import ApiClient from './ApiClient';

// Team membership calls the user form needs; upstream's TeamsAPI has no remove.
class GtiTeamMembersAPI extends ApiClient {
  constructor() {
    super('teams', { accountScoped: true });
  }

  list(teamId) {
    return axios.get(`${this.url}/${teamId}/team_members`);
  }

  add(teamId, userId) {
    return axios.post(`${this.url}/${teamId}/team_members`, {
      user_ids: [userId],
    });
  }

  remove(teamId, userId) {
    return axios.delete(`${this.url}/${teamId}/team_members`, {
      data: { user_ids: [userId] },
    });
  }
}

export default new GtiTeamMembersAPI();
