FactoryBot.define do
  factory :gti_api_token do
    account
    inbox do
      channel = create(:channel_whatsapp, account: account, provider: 'native', validate_provider_config: false, sync_templates: false)
      channel.inbox
    end
    sequence(:name) { |n| "n8n #{n}" }
  end
end
