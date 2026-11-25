# Sends one shipping of a GTI campaign. A cancelled campaign leaves its pending shippings
# untouched, so restarting it later picks them up again.
class Gti::CampaignSendJob < ApplicationJob
  queue_as :low

  def perform(shipping)
    campaign = shipping.campaign
    return unless shipping.pending? && campaign.in_progress?

    begin
      Gti::CampaignSendService.new(shipping: shipping).perform
    rescue StandardError => e
      shipping.update!(status: :failed, error: e.message.truncate(255))
    end
    campaign.finish_if_done!
  end
end
