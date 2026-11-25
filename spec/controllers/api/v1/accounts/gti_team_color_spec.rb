require 'rails_helper'

RSpec.describe 'GTI queue colour in the teams list', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let!(:team) { create(:team, account: account) }

  it 'returns the colour of the queue greeting so cards can paint the queue' do
    create(:gti_team_setting, team: team, color: '#1F6FD1')

    get "/api/v1/accounts/#{account.id}/teams", headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:success)
    expect(response.parsed_body.first['gti_color']).to eq('#1F6FD1')
  end

  it 'returns no colour for a queue without settings' do
    get "/api/v1/accounts/#{account.id}/teams", headers: agent.create_new_auth_token, as: :json

    expect(response.parsed_body.first['gti_color']).to be_nil
  end
end
