require 'rails_helper'

RSpec.describe Gti::QueueGreetingJob do
  let(:account) { create(:account) }
  let(:team) { create(:team, account: account) }
  let(:whatsapp_inbox) do
    create(:channel_whatsapp, account: account, provider: 'baileys', validate_provider_config: false, sync_templates: false).inbox
  end
  let(:conversation) { create(:conversation, account: account, inbox: whatsapp_inbox, team: team) }

  before { create(:gti_team_setting, team: team) }

  it 'greets a WhatsApp conversation that is still in the team' do
    expect { described_class.perform_now(conversation.id, team.id) }.to change { conversation.messages.template.count }.by(1)
  end

  it 'skips a conversation that already left the team' do
    conversation.update!(team: nil)

    expect { described_class.perform_now(conversation.id, team.id) }.not_to(change { conversation.messages.count })
  end

  it 'skips inboxes that are not WhatsApp' do
    other = create(:conversation, account: account, team: team)

    expect { described_class.perform_now(other.id, team.id) }.not_to(change { other.messages.count })
  end
end
