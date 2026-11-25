require 'rails_helper'

RSpec.describe GtiTeamSetting do
  let(:team) { create(:team) }

  it 'takes the account from its team' do
    setting = create(:gti_team_setting, team: team)

    expect(setting.account_id).to eq(team.account_id)
  end

  it 'accepts an image or an audio as greeting media' do
    setting = build(:gti_team_setting, team: team)
    setting.greeting_media.attach(io: Rails.root.join('spec/assets/sample.ogg').open, filename: 'saudacao.ogg', content_type: 'audio/ogg')

    expect(setting).to be_valid
    expect(setting.media_kind).to eq('audio')
  end

  it 'rejects other files as greeting media' do
    setting = build(:gti_team_setting, team: team)
    setting.greeting_media.attach(io: Rails.root.join('spec/assets/sample.pdf').open, filename: 'doc.pdf', content_type: 'application/pdf')

    expect(setting).not_to be_valid
    expect(setting.errors[:greeting_media]).to be_present
  end

  it 'rejects a color that is not a hex code' do
    expect(build(:gti_team_setting, team: team, color: 'green')).not_to be_valid
  end

  it 'allows one setting per team' do
    create(:gti_team_setting, team: team)

    expect(build(:gti_team_setting, team: team)).not_to be_valid
  end
end
