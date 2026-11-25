FactoryBot.define do
  factory :gti_team_setting do
    team
    greeting_message { 'Você está no setor {{queue}}, {{firstname}}!' }
  end
end
