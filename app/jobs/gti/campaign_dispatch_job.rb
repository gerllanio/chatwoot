# Starts a GTI campaign at its scheduled time: writes the shippings and queues the sends.
# The job carries the schedule it was queued for, so a campaign rescheduled or cancelled
# after queueing ignores the stale run.
class Gti::CampaignDispatchJob < ApplicationJob
  queue_as :low

  def perform(campaign, scheduled_at)
    campaign.with_lock do
      return unless campaign.scheduled? && campaign.scheduled_at.to_i == scheduled_at

      campaign.in_progress!
      campaign.build_shippings!
    end
    campaign.enqueue_pending_shippings!
    campaign.finish_if_done!
  end
end
