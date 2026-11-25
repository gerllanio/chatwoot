require 'rails_helper'

RSpec.describe GtiCampaign do
  let(:account) { create(:account) }
  let(:campaign) { create(:gti_campaign, account: account) }

  describe 'validations' do
    it 'requires at least one message text' do
      campaign.messages = ['', ' ']

      expect(campaign).not_to be_valid
      expect(campaign.errors[:messages]).to be_present
    end

    it 'accepts at most five variations' do
      campaign.messages = Array.new(6) { 'Oi' }

      expect(campaign).not_to be_valid
    end

    it 'rejects an inbox that is not WhatsApp' do
      campaign.inbox = create(:inbox, account: account)

      expect(campaign).not_to be_valid
      expect(campaign.errors[:inbox]).to be_present
    end

    it 'rejects a contact list of another account' do
      campaign.contact_list = create(:gti_contact_list)

      expect(campaign).not_to be_valid
    end

    it 'rejects an interval whose maximum is below the minimum' do
      campaign.assign_attributes(min_interval_seconds: 60, max_interval_seconds: 30)

      expect(campaign).not_to be_valid
    end
  end

  describe '#message_for' do
    it 'rotates the non-blank variations across recipients' do
      campaign.messages = ['Primeira', '', 'Segunda']

      expect((0..3).map { |position| campaign.message_for(position) }).to eq(%w[Primeira Segunda Primeira Segunda])
    end
  end

  describe '#apply_schedule!' do
    it 'schedules the dispatch for the scheduled time' do
      time = 2.hours.from_now.change(usec: 0)
      campaign.update!(scheduled_at: time)

      expect { campaign.apply_schedule! }.to have_enqueued_job(Gti::CampaignDispatchJob).with(campaign, time.to_i).at(time)
      expect(campaign).to be_scheduled
    end

    it 'leaves a campaign without a date inactive' do
      campaign.apply_schedule!

      expect(campaign).to be_inactive
    end
  end

  describe '#build_shippings!' do
    it 'writes one shipping per list recipient with the variables filled in' do
      create(:gti_contact_list_item, contact_list: campaign.contact_list, name: 'João Lima', number: '5511990000001')
      create(:gti_contact_list_item, contact_list: campaign.contact_list, name: 'Ana', number: '5511990000002')
      campaign.update!(messages: ['Oi {nome}', 'Olá {{first_name}}'])

      campaign.build_shippings!

      expect(campaign.shippings.order(:id).pluck(:number, :message)).to eq(
        [['5511990000001', 'Oi João Lima'], ['5511990000002', 'Olá Ana']]
      )
    end
  end

  describe '#finish_if_done!' do
    it 'finishes a running campaign once nothing is pending' do
      campaign.in_progress!
      create(:gti_campaign_shipping, campaign: campaign, status: :delivered)

      campaign.finish_if_done!

      expect(campaign).to be_finished
      expect(campaign.completed_at).to be_present
    end

    it 'keeps running while a send is pending' do
      campaign.in_progress!
      create(:gti_campaign_shipping, campaign: campaign)

      campaign.finish_if_done!

      expect(campaign).to be_in_progress
    end
  end
end
