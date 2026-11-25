# GTI "Work": when a conversation enters a team (queue) that has a greeting, the customer
# receives it, as Ticketz did. Delayed a few seconds so a transfer message, sent by the
# agent's action right after the team changes, reaches the customer first.
module GtiQueueGreeting
  extend ActiveSupport::Concern

  GREETING_DELAY = 5.seconds

  included do
    after_commit :enqueue_gti_queue_greeting, on: [:create, :update]
  end

  private

  def enqueue_gti_queue_greeting
    return unless saved_change_to_team_id? && team_id.present?
    return if Import::SilentWrite.on?

    Gti::QueueGreetingJob.set(wait: GREETING_DELAY).perform_later(id, team_id)
  end
end
