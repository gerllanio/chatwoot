require 'rails_helper'

RSpec.describe 'GTI team settings API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:team) { create(:team, account: account) }
  let(:url) { "/api/v1/accounts/#{account.id}/teams/#{team.id}/gti_settings" }

  it 'is not available to agents' do
    get url, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'returns an empty setting for a team without a greeting' do
    get url, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:success)
    expect(response.parsed_body).to include('team_id' => team.id, 'greeting_message' => nil, 'media' => nil)
  end

  it 'saves the greeting with an audio' do
    patch url,
          headers: admin.create_new_auth_token,
          params: { gti_setting: { color: '#00a656', greeting_message: 'Olá {{firstname}}',
                                   greeting_media: fixture_file_upload(Rails.root.join('spec/assets/sample.ogg'), 'audio/ogg') } }

    expect(response).to have_http_status(:success)
    expect(response.parsed_body).to include('color' => '#00a656', 'greeting_message' => 'Olá {{firstname}}')
    expect(response.parsed_body['media']).to include('kind' => 'audio')
  end

  it 'rejects a document as greeting media' do
    patch url,
          headers: admin.create_new_auth_token,
          params: { gti_setting: { greeting_media: fixture_file_upload(Rails.root.join('spec/assets/sample.pdf'), 'application/pdf') } }

    expect(response).to have_http_status(:unprocessable_entity)
  end

  it 'removes the media' do
    setting = create(:gti_team_setting, team: team)
    setting.greeting_media.attach(io: Rails.root.join('spec/assets/sample.png').open, filename: 'a.png', content_type: 'image/png')

    delete "#{url}/media", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:success)
    expect(setting.reload.greeting_media).not_to be_attached
  end

  it 'does not reach teams of another account' do
    other_team = create(:team)

    get "/api/v1/accounts/#{account.id}/teams/#{other_team.id}/gti_settings", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:not_found)
  end
end
