require 'rails_helper'

RSpec.describe Gti::CampaignDispatchJob do
  let(:scheduled_at) { 1.minute.ago.change(usec: 0) }
  let(:campaign) { create(:gti_campaign, status: :scheduled, scheduled_at: scheduled_at, min_interval_seconds: 20, max_interval_seconds: 20) }

  before do
    create(:gti_contact_list_item, contact_list: campaign.contact_list, number: '5511990000001')
    create(:gti_contact_list_item, contact_list: campaign.contact_list, number: '5511990000002')
  end

  it 'starts the campaign and queues one spaced send per recipient' do
    expect { described_class.perform_now(campaign, scheduled_at.to_i) }.to have_enqueued_job(Gti::CampaignSendJob).exactly(2).times

    expect(campaign.reload).to be_in_progress
    expect(campaign.shippings.count).to eq(2)
  end

  it 'ignores a run queued for a schedule the campaign no longer has' do
    campaign.update!(scheduled_at: 1.day.from_now)

    expect { described_class.perform_now(campaign, scheduled_at.to_i) }.not_to have_enqueued_job(Gti::CampaignSendJob)
    expect(campaign.reload).to be_scheduled
  end
end
