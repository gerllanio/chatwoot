FactoryBot.define do
  factory :gti_contact_list do
    account
    sequence(:name) { |n| "Aniversariantes #{n}" }
  end

  factory :gti_contact_list_item do
    contact_list factory: :gti_contact_list
    account { contact_list.account }
    sequence(:number) { |n| "551199000#{n.to_s.rjust(4, '0')}" }
    name { 'Maria Souza' }
  end

  factory :gti_campaign do
    account
    inbox do
      create(:channel_whatsapp, account: account, provider: 'native', sync_templates: false, validate_provider_config: false).inbox
    end
    contact_list { association :gti_contact_list, account: account }
    name { 'Aniversariantes do mês' }
    messages { ['Olá {nome}, feliz aniversário!'] }
  end

  factory :gti_campaign_shipping do
    campaign factory: :gti_campaign
    number { '5511990001234' }
    name { 'Maria Souza' }
    message { 'Olá Maria Souza' }
  end
end
