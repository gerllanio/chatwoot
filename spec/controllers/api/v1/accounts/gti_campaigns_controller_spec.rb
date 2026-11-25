require 'rails_helper'

RSpec.describe 'GTI campaigns API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:inbox) { create(:channel_whatsapp, account: account, provider: 'native', sync_templates: false, validate_provider_config: false).inbox }
  let(:list) { create(:gti_contact_list, account: account) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/gti_campaigns" }

  it 'is not available to agents' do
    get base_url, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'lists the campaigns of the account only' do
    mine = create(:gti_campaign, account: account)
    create(:gti_campaign)

    get base_url, headers: admin.create_new_auth_token, as: :json

    expect(response.parsed_body['payload'].pluck('id')).to eq([mine.id])
  end

  it 'creates and schedules a campaign' do
    time = 1.hour.from_now.change(usec: 0)
    params = { gti_campaign: { name: 'Black Friday', inbox_id: inbox.id, gti_contact_list_id: list.id,
                               scheduled_at: time.iso8601, messages: ['Oi {nome}', 'Olá {nome}'] } }

    expect { post base_url, params: params, headers: admin.create_new_auth_token, as: :json }
      .to have_enqueued_job(Gti::CampaignDispatchJob)

    expect(response).to have_http_status(:success)
    expect(response.parsed_body).to include('status' => 'scheduled', 'name' => 'Black Friday')
  end

  it 'refuses to edit a campaign that already started' do
    campaign = create(:gti_campaign, account: account, status: :in_progress)

    patch "#{base_url}/#{campaign.id}", params: { gti_campaign: { name: 'Outro' } }, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
  end

  it 'cancels a running campaign and restarts its pending sends' do
    campaign = create(:gti_campaign, account: account, status: :in_progress)
    create(:gti_campaign_shipping, campaign: campaign)

    post "#{base_url}/#{campaign.id}/cancel", headers: admin.create_new_auth_token, as: :json
    expect(campaign.reload).to be_cancelled

    expect { post "#{base_url}/#{campaign.id}/restart", headers: admin.create_new_auth_token, as: :json }
      .to have_enqueued_job(Gti::CampaignSendJob)
    expect(campaign.reload).to be_in_progress
  end

  it 'reports the shippings of a campaign' do
    campaign = create(:gti_campaign, account: account, status: :finished)
    create(:gti_campaign_shipping, campaign: campaign, status: :delivered)
    create(:gti_campaign_shipping, campaign: campaign, status: :failed, error: 'número inválido')

    get "#{base_url}/#{campaign.id}/report", params: { status: 'failed' }, headers: admin.create_new_auth_token

    expect(response.parsed_body['payload'].pluck('error')).to eq(['número inválido'])
    expect(response.parsed_body.dig('campaign', 'shippings')).to include('delivered' => 1, 'failed' => 1)
  end
end
