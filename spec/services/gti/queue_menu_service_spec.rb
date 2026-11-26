require 'rails_helper'

RSpec.describe Gti::QueueMenuService do
  let(:account) { create(:account) }
  let(:channel) { create(:channel_whatsapp, account: account, provider: 'baileys', validate_provider_config: false, sync_templates: false) }
  let(:inbox) { channel.inbox }
  let(:contact) { create(:contact, account: account, name: 'Maria Souza') }
  let(:comercial) { create(:team, account: account, name: 'Comercial 🛒') }
  let(:suporte) { create(:team, account: account, name: 'Suporte Técnico 🛠️') }
  let(:chatbot) { create(:team, account: account, name: 'Chatbot 🤖') }
  let(:conversation) { create(:conversation, account: account, inbox: inbox, contact: contact, assignee: nil) }
  let!(:setting) do
    create(:gti_inbox_setting, inbox: inbox, team_ids: [comercial.id, suporte.id], no_queue_timeout_minutes: 1, no_queue_team_id: chatbot.id)
  end

  def customer_says(content)
    message = create(:message, account: account, inbox: inbox, conversation: conversation, message_type: :incoming,
                               sender: contact, content: content)
    described_class.new(message: message).perform
    conversation.reload
  end

  def menus
    conversation.messages.template.order(:id).pluck(:content)
  end

  it 'sends the greeting with the numbered queues, like Ticketz' do
    travel_to Time.zone.parse('2026-11-25 15:52:29 UTC') do
      customer_says('Bom dia')
    end

    expect(menus).to eq(["Olá Maria Souza! Atendimento iniciado às 12:52:29.\n\n1️⃣ - Comercial 🛒\n2️⃣ - Suporte Técnico 🛠️"])
    expect(Gti::QueueMenuTimeoutJob).to have_been_enqueued.with(conversation.id, kind_of(Integer))
  end

  it 'puts the conversation in the chosen queue' do
    customer_says('Bom dia')
    customer_says(' 2 ')

    expect(conversation.team).to eq(suporte)
    expect(conversation.additional_attributes).not_to have_key('gti_menu_sent_at')
  end

  it 'sends the menu again for an invalid answer, at most once every two minutes' do
    customer_says('Bom dia')
    customer_says('9')
    expect(menus.size).to eq(1)

    travel 3.minutes do
      customer_says('quero falar com alguém')
    end
    expect(menus.size).to eq(2)
    expect(conversation.team).to be_nil
  end

  it 'does nothing when the connection menu is off' do
    setting.update!(menu_enabled: false)

    customer_says('Bom dia')

    expect(menus).to be_empty
  end

  it 'does nothing for a conversation that already has an agent' do
    conversation.update!(assignee: create(:user, account: account, role: :agent))

    customer_says('Bom dia')

    expect(menus).to be_empty
  end

  it 'sends the conversation back to the queue menu when the customer writes again' do
    conversation.update!(team: comercial, additional_attributes: { 'gti_menu_sent_at' => 1 })

    described_class.return_to_queue(conversation)

    expect(conversation.team_id).to be_nil
    expect(conversation.additional_attributes).not_to have_key('gti_menu_sent_at')
  end
end
