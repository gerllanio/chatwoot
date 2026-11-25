require 'rails_helper'

RSpec.describe GtiQueueGreeting do
  let(:account) { create(:account) }
  let(:team) { create(:team, account: account) }
  let(:conversation) { create(:conversation, account: account) }

  it 'schedules the greeting when the conversation enters a team' do
    expect { conversation.update!(team: team) }.to have_enqueued_job(Gti::QueueGreetingJob).with(conversation.id, team.id)
  end

  it 'does not schedule it for other changes' do
    expect { conversation.update!(priority: :high) }.not_to have_enqueued_job(Gti::QueueGreetingJob)
  end

  it 'does not schedule it while history is being imported' do
    expect do
      Import::SilentWrite.wrap(archive: true) { conversation.update!(team: team) }
    end.not_to have_enqueued_job(Gti::QueueGreetingJob)
  end
end
