require 'rails_helper'

RSpec.describe Gti::CampaignSendJob do
  let(:campaign) { create(:gti_campaign, status: :in_progress) }
  let(:shipping) { create(:gti_campaign_shipping, campaign: campaign, number: '5511990001234', name: 'Maria Souza', message: 'Oi Maria') }

  it 'posts the text as an outgoing message in a resolved conversation and finishes the campaign' do
    described_class.perform_now(shipping)

    message = Message.outgoing.last
    expect(message.content).to eq('Oi Maria')
    expect(message.conversation).to be_resolved
    expect(message.conversation.contact.phone_number).to eq('+5511990001234')
    expect(shipping.reload).to be_delivered
    expect(campaign.reload).to be_finished
  end

  it 'reuses the contact and its latest conversation in the inbox' do
    contact = create(:contact, account: campaign.account, phone_number: '+5511990001234')
    contact_inbox = create(:contact_inbox, contact: contact, inbox: campaign.inbox, source_id: '5511990001234')
    conversation = create(:conversation, account: campaign.account, inbox: campaign.inbox, contact: contact, contact_inbox: contact_inbox)

    described_class.perform_now(shipping)

    expect(shipping.reload.conversation).to eq(conversation)
    expect(campaign.account.contacts.count).to eq(1)
  end

  it 'does not send while the campaign is cancelled' do
    campaign.cancelled!

    expect { described_class.perform_now(shipping) }.not_to change(Message, :count)
    expect(shipping.reload).to be_pending
  end

  it 'marks the shipping failed when the number cannot be used' do
    shipping.update!(number: '123')

    described_class.perform_now(shipping)

    expect(shipping.reload).to be_failed
    expect(shipping.error).to be_present
  end
end
