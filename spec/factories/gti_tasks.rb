FactoryBot.define do
  factory :gti_task do
    account
    sequence(:title) { |n| "Retornar ligação do cliente #{n}" }
    priority { :medium }
  end
end
