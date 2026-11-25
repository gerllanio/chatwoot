require 'rails_helper'

RSpec.describe Gti::QueueGreetingService do
  let(:account) { create(:account) }
  let(:channel) { create(:channel_whatsapp, account: account, provider: 'baileys', validate_provider_config: false, sync_templates: false) }
  let(:contact) { create(:contact, account: account, name: 'Maria Souza') }
  let(:team) { create(:team, account: account, name: 'Comercial') }
  let(:conversation) { create(:conversation, account: account, inbox: channel.inbox, contact: contact) }
  let(:setting) { create(:gti_team_setting, team: team) }

  def attach(file, content_type)
    setting.greeting_media.attach(io: Rails.root.join("spec/assets/#{file}").open, filename: file, content_type: content_type)
    setting.save!
  end

  def sent
    conversation.messages.template.order(:id)
  end

  it 'sends the greeting with the customer and queue names filled in' do
    described_class.new(conversation: conversation, setting: setting).perform

    expect(sent.map(&:content)).to eq(['Você está no setor comercial, Maria!'])
  end

  it 'sends an image as the caption of the greeting' do
    attach('sample.png', 'image/png')

    described_class.new(conversation: conversation, setting: setting).perform

    expect(sent.size).to eq(1)
    expect(sent.first.attachments.first.file_type).to eq('image')
  end

  it 'sends a recorded audio as a voice note after the text' do
    attach('sample.ogg', 'audio/ogg')

    described_class.new(conversation: conversation, setting: setting).perform

    expect(sent.map(&:content)).to eq(['Você está no setor comercial, Maria!', nil])
    expect(sent.last.attachments.first).to have_attributes(file_type: 'audio', meta: { 'is_recorded_audio' => true })
  end

  it 'does not flag an uploaded music file as a voice note' do
    attach('sample.mp3', 'audio/mpeg')

    described_class.new(conversation: conversation, setting: setting).perform

    expect(sent.last.attachments.first.meta).to eq({})
  end

  it 'sends the out-of-hours message instead while the inbox is closed' do
    setting.update!(out_of_hours_message: 'Estamos fechados, {{name}}.')
    allow(conversation.inbox).to receive(:out_of_office?).and_return(true)

    described_class.new(conversation: conversation, setting: setting).perform

    expect(sent.map(&:content)).to eq(['Estamos fechados, Maria Souza.'])
  end
end
