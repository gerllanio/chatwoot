require 'rails_helper'

RSpec.describe 'GTI messages API tokens', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:inbox) do
    create(:channel_whatsapp, account: account, provider: 'native', validate_provider_config: false, sync_templates: false).inbox
  end
  let(:base_url) { "/api/v1/accounts/#{account.id}/gti_api_tokens" }

  it 'is closed to agents' do
    get base_url, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'creates a token for a WhatsApp connection and lists it' do
    post base_url, params: { gti_api_token: { name: 'n8n', inbox_id: inbox.id } }, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['token'].length).to be >= GtiApiToken::MIN_TOKEN_LENGTH

    get base_url, headers: admin.create_new_auth_token, as: :json
    expect(response.parsed_body['payload'].pluck('inbox_name')).to eq([inbox.name])
  end

  it 'refuses a connection that is not WhatsApp' do
    web_inbox = create(:inbox, account: account)
    post base_url, params: { gti_api_token: { name: 'site', inbox_id: web_inbox.id } }, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
  end

  it 'regenerates a token so the old one stops working' do
    api_token = create(:gti_api_token, account: account, inbox: inbox)
    old_token = api_token.token

    post "#{base_url}/#{api_token.id}/regenerate", headers: admin.create_new_auth_token, as: :json

    expect(api_token.reload.token).not_to eq(old_token)
    expect(GtiApiToken.find_by(token: old_token)).to be_nil
  end

  it 'deletes a token' do
    api_token = create(:gti_api_token, account: account, inbox: inbox)

    delete "#{base_url}/#{api_token.id}", headers: admin.create_new_auth_token, as: :json

    expect(GtiApiToken.exists?(api_token.id)).to be(false)
  end
end
