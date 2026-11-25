# One send of a GTI campaign to one number: what was sent, when, and how it went.
class GtiCampaignShipping < ApplicationRecord
  belongs_to :campaign, class_name: 'GtiCampaign', foreign_key: :gti_campaign_id, inverse_of: :shippings
  belongs_to :contact, optional: true
  belongs_to :conversation, optional: true

  enum :status, { pending: 0, delivered: 1, failed: 2 }, validate: true

  validates :number, presence: true

  def push_event_data
    {
      id: id, name: name, number: number, message: message, status: status, error: error,
      delivered_at: delivered_at&.to_i, conversation_display_id: conversation&.display_id
    }
  end
end
