require 'rails_helper'

RSpec.describe 'Conversation GTI notices API', type: :request do
  let(:account) { create(:account, gti_ticket_accepted_message: 'O colaborador {{user}} vai prosseguir.') }
  let(:conversation) { create(:conversation, account: account) }
  let(:agent) { create(:user, account: account, role: :agent, name: 'Rhuan') }

  def post_notice(kind, headers: agent.create_new_auth_token)
    post api_v1_account_conversation_gti_notices_url(account_id: account.id, conversation_id: conversation.display_id),
         params: { kind: kind }, headers: headers, as: :json
  end

  it 'rejects unauthenticated requests' do
    post_notice('accepted', headers: {})

    expect(response).to have_http_status(:unauthorized)
  end

  context 'with an agent of the conversation inbox' do
    before { create(:inbox_member, inbox: conversation.inbox, user: agent) }

    it 'sends the accepted notice as the agent' do
      expect { post_notice('accepted') }.to change(conversation.messages.outgoing, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(conversation.messages.outgoing.last.content).to eq('O colaborador Rhuan vai prosseguir.')
    end

    it 'sends nothing when the notice is not configured' do
      expect { post_notice('transfer') }.not_to change(Message, :count)

      expect(response).to have_http_status(:no_content)
    end

    it 'rejects an unknown kind' do
      post_notice('closed')

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  it 'refuses an agent without access to the conversation' do
    post_notice('accepted')

    expect(response).to have_http_status(:unauthorized)
  end
end
