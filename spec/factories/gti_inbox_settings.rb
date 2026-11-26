FactoryBot.define do
  factory :gti_inbox_setting do
    inbox
    menu_enabled { true }
    greeting_message { 'Olá {{name}}! Atendimento iniciado às {{hora}}.' }
  end
end
