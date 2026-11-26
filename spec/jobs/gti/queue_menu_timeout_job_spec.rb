require 'rails_helper'

RSpec.describe Gti::QueueMenuTimeoutJob do
  let(:account) { create(:account) }
  let(:inbox) { create(:channel_whatsapp, account: account, provider: 'baileys', validate_provider_config: false, sync_templates: false).inbox }
  let(:chatbot) { create(:team, account: account, name: 'Chatbot 🤖') }
  let(:conversation) do
    create(:conversation, account: account, inbox: inbox, assignee: nil, additional_attributes: { 'gti_menu_sent_at' => 100 })
  end

  before { create(:gti_inbox_setting, inbox: inbox, no_queue_timeout_minutes: 1, no_queue_team_id: chatbot.id) }

  it 'moves a conversation still without a choice to the no-queue team' do
    described_class.perform_now(conversation.id, 100)

    expect(conversation.reload.team).to eq(chatbot)
    expect(conversation.additional_attributes).not_to have_key('gti_menu_sent_at')
  end

  it 'leaves a conversation that got a queue or an agent meanwhile' do
    conversation.update!(assignee: create(:user, account: account, role: :agent))

    described_class.perform_now(conversation.id, 100)

    expect(conversation.reload.team).to be_nil
  end

  it 'ignores an older menu round' do
    described_class.perform_now(conversation.id, 50)

    expect(conversation.reload.team).to be_nil
  end
end
