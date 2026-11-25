require 'rails_helper'

RSpec.describe Gti::ConversationNoticeService do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, name: 'Kaue Silva') }
  let(:contact) { create(:contact, account: account, name: 'Maria Souza') }
  let(:team) { create(:team, account: account, name: 'Suporte') }
  let(:conversation) { create(:conversation, account: account, contact: contact, team: team) }

  it 'sends the accepted notice with the variables filled in' do
    account.update!(gti_ticket_accepted_message: 'Oi {{firstname}} ({{name}}), {{ user }} da fila {{queue}} vai te atender.')

    message = described_class.new(conversation: conversation, user: agent, kind: 'accepted').perform

    expect(message).to be_outgoing
    expect(message.sender).to eq(agent)
    expect(message.content).to eq('Oi Maria (Maria Souza), Kaue Silva da fila Suporte vai te atender.')
  end

  it 'sends the transfer notice from its own setting' do
    account.update!(gti_ticket_accepted_message: 'aceito', gti_transfer_message: 'Transferido para {{queue}}')

    message = described_class.new(conversation: conversation, user: agent, kind: 'transfer').perform

    expect(message.content).to eq('Transferido para Suporte')
  end

  it 'sends nothing when the text is blank' do
    account.update!(gti_transfer_message: '  ')

    expect do
      expect(described_class.new(conversation: conversation, user: agent, kind: 'transfer').perform).to be_nil
    end.not_to change(Message, :count)
  end

  it 'leaves the queue empty when the conversation has no team' do
    conversation.update!(team: nil)
    account.update!(gti_transfer_message: 'Fila: {{queue}}.')

    message = described_class.new(conversation: conversation, user: agent, kind: 'transfer').perform

    expect(message.content).to eq('Fila: .')
  end
end
