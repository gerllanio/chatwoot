require 'rails_helper'

RSpec.describe 'GTI inbox settings API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:inbox) { create(:inbox, account: account) }
  let(:team) { create(:team, account: account) }
  let(:url) { "/api/v1/accounts/#{account.id}/inboxes/#{inbox.id}/gti_settings" }

  it 'is not available to agents' do
    get url, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'returns an empty setting for a connection without a menu' do
    get url, headers: admin.create_new_auth_token, as: :json

    expect(response.parsed_body).to include('inbox_id' => inbox.id, 'menu_enabled' => false, 'team_ids' => [])
  end

  it 'saves the greeting, the ordered queues and the no-queue timeout' do
    patch url, headers: admin.create_new_auth_token, as: :json,
               params: { gti_setting: { menu_enabled: true, greeting_message: 'Olá {{name}}', team_ids: [team.id],
                                        no_queue_timeout_minutes: 1, no_queue_team_id: team.id } }

    expect(response).to have_http_status(:success)
    expect(inbox.reload.gti_setting).to have_attributes(menu_enabled: true, team_ids: [team.id], no_queue_timeout_minutes: 1)
  end

  it 'refuses a queue of another account' do
    other = create(:team)

    patch url, headers: admin.create_new_auth_token, as: :json, params: { gti_setting: { team_ids: [other.id] } }

    expect(response).to have_http_status(:unprocessable_entity)
  end
end
