require 'rails_helper'

RSpec.describe 'GTI contact lists API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:list) { create(:gti_contact_list, account: account) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/gti_contact_lists" }

  it 'is not available to agents' do
    get base_url, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'creates a list' do
    post base_url, params: { gti_contact_list: { name: 'Clientes balcão' } }, headers: admin.create_new_auth_token, as: :json

    expect(response.parsed_body).to include('name' => 'Clientes balcão', 'items_count' => 0)
  end

  it 'imports a CSV, skipping repeated and unusable numbers' do
    csv = "nome,numero,email\nMaria,+55 11 99000-1111,maria@exemplo.com\nMaria de novo,5511990001111,\nSem número,,\n"
    file = Rack::Test::UploadedFile.new(StringIO.new(csv), 'text/csv', original_filename: 'lista.csv')

    post "#{base_url}/#{list.id}/import", params: { file: file }, headers: admin.create_new_auth_token

    expect(response.parsed_body).to include('imported' => 1, 'skipped' => 2)
    expect(list.items.pluck(:number, :email)).to eq([%w[5511990001111 maria@exemplo.com]])
  end

  it 'adds, searches and removes recipients' do
    headers = admin.create_new_auth_token
    post "#{base_url}/#{list.id}/items", params: { item: { name: 'João', number: '5511990002222' } }, headers: headers, as: :json
    item_id = response.parsed_body['id']

    get "#{base_url}/#{list.id}/items", params: { q: 'jo' }, headers: headers
    expect(response.parsed_body['payload'].pluck('id')).to eq([item_id])

    delete "#{base_url}/#{list.id}/items/#{item_id}", headers: headers, as: :json
    expect(list.reload.items_count).to eq(0)
  end
end
