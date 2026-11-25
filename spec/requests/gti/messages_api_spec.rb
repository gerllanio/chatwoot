require 'rails_helper'

RSpec.describe 'GTI Ticketz-compatible messages API', type: :request do
  let(:api_token) { create(:gti_api_token) }
  let(:inbox) { api_token.inbox }
  let(:headers) { { 'Authorization' => "Bearer #{api_token.token}" } }

  describe 'POST /backend/api/messages/send' do
    it 'refuses a request without a valid token' do
      post '/backend/api/messages/send', params: { number: '5511999990000', body: 'Oi' },
                                         headers: { 'Authorization' => 'Bearer nope' }, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(Message.count).to eq(0)
    end

    it 'sends a text through the token connection and keeps the conversation open' do
      post '/backend/api/messages/send', params: { number: '5511999990000', body: 'Seu pedido chegou' },
                                         headers: headers, as: :json

      expect(response).to have_http_status(:success)
      expect(response.parsed_body['mensagem']).to eq('Mensagem enviada')
      message = inbox.messages.last
      expect(message).to have_attributes(content: 'Seu pedido chegou', message_type: 'outgoing')
      expect(message.conversation.contact.phone_number).to eq('+5511999990000')
      expect(message.conversation).to be_open
      expect(api_token.reload.last_used_at).to be_present
    end

    it 'resolves the conversation it opened when saveOnTicket is false' do
      post '/api/messages/send', params: { number: '5511999990000', body: 'Lembrete', saveOnTicket: false },
                                 headers: headers, as: :json

      expect(inbox.messages.last.conversation).to be_resolved
    end

    it 'reuses the conversation the contact is already being served in' do
      post '/api/messages/send', params: { number: '5511999990000@s.whatsapp.net', body: 'Primeira' }, headers: headers, as: :json
      post '/api/messages/send', params: { number: '5511999990000', body: 'Segunda', saveOnTicket: false }, headers: headers, as: :json

      expect(inbox.conversations.count).to eq(1)
      expect(inbox.conversations.first).to be_open
    end

    it 'sends media files from a multipart request' do
      file = fixture_file_upload(Rails.root.join('spec/assets/avatar.png'), 'image/png')
      post '/backend/api/messages/send', params: { number: '5511999990000', medias: [file] }, headers: headers

      expect(response).to have_http_status(:success)
      expect(inbox.messages.last.attachments.first.file_type).to eq('image')
    end

    it 'rejects an invalid number' do
      post '/api/messages/send', params: { number: '12', body: 'Oi' }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(Message.count).to eq(0)
    end

    it 'rejects a group the connection never saw' do
      post '/api/messages/send', params: { number: '120363000000000000@g.us', body: 'Oi' }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'requires a body or a media file' do
      post '/api/messages/send', params: { number: '5511999990000' }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
