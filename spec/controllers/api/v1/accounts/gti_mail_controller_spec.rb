require 'rails_helper'

RSpec.describe 'GTI mail API', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:channel) { create(:channel_email, :imap_email, account: account) }
  let(:inbox) { channel.inbox }
  let(:base_url) { "/api/v1/accounts/#{account.id}/gti_mail/mailboxes" }
  let(:imap_client) { instance_double(Gti::Mailbox::ImapClient) }

  before do
    create(:inbox_member, user: agent, inbox: inbox)
    allow(Gti::Mailbox::ImapClient).to receive(:open).and_yield(imap_client)
  end

  it 'lists only the e-mail inboxes the agent is a member of' do
    create(:channel_email, :imap_email, account: account)

    get base_url, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['payload'].pluck('id')).to eq([inbox.id])
  end

  it 'does not open an inbox the agent is not a member of' do
    other = create(:channel_email, :imap_email, account: account).inbox

    get "#{base_url}/#{other.id}/folders", headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:not_found)
  end

  it 'returns the folders of a mailbox' do
    allow(imap_client).to receive(:folders).and_return([{ path: 'INBOX', name: 'INBOX', unseen: 2 }])

    get "#{base_url}/#{inbox.id}/folders", headers: agent.create_new_auth_token, as: :json

    expect(response.parsed_body['payload'].first).to include('path' => 'INBOX', 'unseen' => 2)
  end

  it 'turns server errors into a readable 422' do
    allow(Gti::Mailbox::ImapClient).to receive(:open).and_raise(Gti::Mailbox::ImapClient::Error, 'LOGIN failed')

    get "#{base_url}/#{inbox.id}/messages", params: { folder: 'INBOX' }, headers: agent.create_new_auth_token

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to include('LOGIN failed')
  end

  it 'opens a message with body and attachments' do
    raw = Mail.new(from: 'Ana <ana@cliente.com.br>', to: 'care@example.com', subject: 'Orçamento',
                   message_id: '<abc@cliente.com.br>', body: 'Pode enviar o orçamento?').to_s
    allow(imap_client).to receive(:raw_message).with('INBOX', '12').and_return(raw)

    get "#{base_url}/#{inbox.id}/messages/12", params: { folder: 'INBOX' }, headers: agent.create_new_auth_token

    expect(response.parsed_body).to include('uid' => 12, 'subject' => 'Orçamento', 'from_email' => 'ana@cliente.com.br',
                                            'message_id' => 'abc@cliente.com.br', 'text' => 'Pode enviar o orçamento?')
  end

  it 'turns a message into a conversation of the inbox' do
    raw = Mail.new(from: 'Ana <ana@cliente.com.br>', to: channel.email, subject: 'Orçamento',
                   message_id: '<new-ticket@cliente.com.br>', body: 'Preciso de um orçamento').to_s
    allow(imap_client).to receive(:raw_message).and_return(raw)

    post "#{base_url}/#{inbox.id}/messages/12/conversation",
         params: { folder: 'INBOX' }, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:success)
    conversation = inbox.conversations.find_by(display_id: response.parsed_body['conversation_id'])
    expect(conversation.contact.email).to eq('ana@cliente.com.br')
    expect(conversation.messages.incoming.last.content).to include('Preciso de um orçamento')
  end
end
