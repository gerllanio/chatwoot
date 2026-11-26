require 'rails_helper'

RSpec.describe GtiQueueMenu do
  let(:account) { create(:account) }
  let(:inbox) { create(:channel_whatsapp, account: account, provider: 'baileys', validate_provider_config: false, sync_templates: false).inbox }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }

  it 'hands a customer message to the queue menu job' do
    expect do
      create(:message, account: account, inbox: inbox, conversation: conversation, message_type: :incoming)
    end.to have_enqueued_job(Gti::QueueMenuJob)
  end

  it 'skips messages written while importing history' do
    expect do
      Import::SilentWrite.wrap(archive: true) do
        create(:message, account: account, inbox: inbox, conversation: conversation, message_type: :incoming)
      end
    end.not_to have_enqueued_job(Gti::QueueMenuJob)
  end

  it 'skips agent messages' do
    expect do
      create(:message, account: account, inbox: inbox, conversation: conversation, message_type: :outgoing)
    end.not_to have_enqueued_job(Gti::QueueMenuJob)
  end
end
