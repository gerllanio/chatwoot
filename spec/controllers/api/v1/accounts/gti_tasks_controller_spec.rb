require 'rails_helper'

RSpec.describe 'GTI tasks API', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:teammate) { create(:user, account: account, role: :agent) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/gti_tasks" }

  describe 'GET /api/v1/accounts/{account.id}/gti_tasks' do
    it 'returns unauthorized without a session' do
      get base_url

      expect(response).to have_http_status(:unauthorized)
    end

    it 'lists the pending tasks of the account only' do
      pending_task = create(:gti_task, account: account, title: 'Ligar para a Loja Flor')
      create(:gti_task, account: account, completed_at: Time.current)
      create(:gti_task, title: 'De outra conta')

      get base_url, headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:success)
      expect(response.parsed_body['payload'].pluck('id')).to eq([pending_task.id])
    end

    it 'lists completed tasks assigned to me when asked' do
      mine = create(:gti_task, account: account, assignee: agent, completed_at: Time.current)
      create(:gti_task, account: account, assignee: teammate, completed_at: Time.current)

      get base_url, params: { status: 'completed', assignee: 'me' }, headers: agent.create_new_auth_token

      expect(response.parsed_body['payload'].pluck('id')).to eq([mine.id])
    end

    it 'rejects an unknown status filter' do
      get base_url, params: { status: 'archived' }, headers: agent.create_new_auth_token

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'POST /api/v1/accounts/{account.id}/gti_tasks' do
    it 'creates a task linked to a conversation and records who created it' do
      conversation = create(:conversation, account: account)

      post base_url,
           params: { gti_task: { title: 'Enviar proposta', assignee_id: teammate.id, priority: 'high',
                                 conversation_display_id: conversation.display_id } },
           headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:success)
      task = GtiTask.last
      expect(task).to have_attributes(title: 'Enviar proposta', assignee: teammate, created_by: agent,
                                      priority: 'high', conversation: conversation, account: account)
      expect(response.parsed_body['conversation_display_id']).to eq(conversation.display_id)
    end

    it 'does not link a conversation from another account' do
      other_conversation = create(:conversation)

      post base_url,
           params: { gti_task: { title: 'Tarefa', conversation_display_id: other_conversation.display_id } },
           headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:not_found)
      expect(GtiTask.count).to eq(0)
    end
  end

  describe 'PATCH /api/v1/accounts/{account.id}/gti_tasks/{id}' do
    it 'marks a task as completed and reopens it' do
      task = create(:gti_task, account: account)

      patch "#{base_url}/#{task.id}", params: { gti_task: { completed: true } },
                                      headers: agent.create_new_auth_token, as: :json
      expect(task.reload.completed_at).to be_present

      patch "#{base_url}/#{task.id}", params: { gti_task: { completed: false } },
                                      headers: agent.create_new_auth_token, as: :json
      expect(task.reload.completed_at).to be_nil
    end

    it 'cannot touch a task from another account' do
      foreign = create(:gti_task)

      patch "#{base_url}/#{foreign.id}", params: { gti_task: { title: 'x' } },
                                         headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'DELETE /api/v1/accounts/{account.id}/gti_tasks/{id}' do
    it 'deletes the task' do
      task = create(:gti_task, account: account)

      delete "#{base_url}/#{task.id}", headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:success)
      expect(GtiTask.exists?(task.id)).to be(false)
    end
  end
end
