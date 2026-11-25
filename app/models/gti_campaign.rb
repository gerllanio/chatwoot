# GTI "Work" campaign: a bulk WhatsApp send to a contact list through a native (QR) WhatsApp
# inbox, Ticketz style. Upstream's WhatsApp campaigns need Cloud API templates, which the
# native connection does not have.
#
# Up to five message variations are rotated across recipients, and the sends are spaced by a
# random interval so the number is not flagged for bulk messaging.
class GtiCampaign < ApplicationRecord
  MAX_MESSAGES = 5
  MIN_INTERVAL_SECONDS = 5
  MAX_INTERVAL_SECONDS = 600

  belongs_to :account
  belongs_to :inbox
  belongs_to :contact_list, class_name: 'GtiContactList', foreign_key: :gti_contact_list_id, optional: true, inverse_of: :campaigns
  belongs_to :created_by, class_name: 'User', optional: true
  has_many :shippings, class_name: 'GtiCampaignShipping', dependent: :delete_all, inverse_of: :campaign
  has_one_attached :media

  enum :status, { inactive: 0, scheduled: 1, in_progress: 2, cancelled: 3, finished: 4 }, validate: true

  validates :name, presence: true, length: { maximum: 255 }
  validates :min_interval_seconds, numericality: { only_integer: true, in: MIN_INTERVAL_SECONDS..MAX_INTERVAL_SECONDS }
  validates :max_interval_seconds, numericality: { only_integer: true, in: MIN_INTERVAL_SECONDS..MAX_INTERVAL_SECONDS }
  validate :interval_range_is_ordered
  validate :messages_are_valid
  validate :inbox_is_whatsapp_of_account
  validate :contact_list_is_from_account

  scope :latest_first, -> { order(created_at: :desc) }

  def message_variations
    Array(messages).map(&:to_s).compact_blank
  end

  # Recipient number N (0-based) gets variation N modulo the number of variations.
  def message_for(position)
    variations = message_variations
    variations[position % variations.size]
  end

  def next_interval
    rand(min_interval_seconds..max_interval_seconds)
  end

  def editable?
    inactive? || scheduled?
  end

  # Puts the campaign on the schedule it carries, or takes it off when it has none.
  def apply_schedule!
    return unless editable?

    if scheduled_at.present?
      scheduled!
      Gti::CampaignDispatchJob.set(wait_until: scheduled_at).perform_later(self, scheduled_at.to_i)
    else
      inactive!
    end
  end

  # Writes one shipping per list recipient, with the message variation and variables already
  # applied, so a later edit of the list or of the texts does not change what this run sends.
  def build_shippings!
    contact_list&.items&.order(:id)&.each_with_index do |item, position|
      shippings.create!(name: item.name, number: item.number, message: Gti::CampaignMessage.render(message_for(position), item.name))
    end
  end

  # Queues the sends still pending, one after the other, each a random interval after the last.
  def enqueue_pending_shippings!
    delay = 0
    shippings.pending.order(:id).each do |shipping|
      Gti::CampaignSendJob.set(wait: delay.seconds).perform_later(shipping)
      delay += next_interval
    end
  end

  def finish_if_done!
    return unless in_progress?
    return if shippings.pending.exists?

    update!(status: :finished, completed_at: Time.current)
  end

  def push_event_data
    {
      id: id, name: name, status: status, messages: Array(messages),
      inbox: { id: inbox_id, name: inbox.name }, contact_list: contact_list_data,
      scheduled_at: scheduled_at&.to_i, completed_at: completed_at&.to_i, created_at: created_at.to_i,
      min_interval_seconds: min_interval_seconds, max_interval_seconds: max_interval_seconds,
      media: media_data, shippings: shipping_counts
    }
  end

  private

  def contact_list_data
    contact_list && { id: contact_list.id, name: contact_list.name, items_count: contact_list.items_count }
  end

  def media_data
    media.attached? ? { name: media.filename.to_s, content_type: media.content_type } : nil
  end

  def shipping_counts
    counts = shippings.group(:status).count
    {
      total: counts.values.sum, pending: counts.fetch('pending', 0),
      delivered: counts.fetch('delivered', 0), failed: counts.fetch('failed', 0)
    }
  end

  def interval_range_is_ordered
    return if min_interval_seconds.blank? || max_interval_seconds.blank? || min_interval_seconds <= max_interval_seconds

    errors.add(:max_interval_seconds, 'must be greater than or equal to the minimum interval')
  end

  def messages_shape_valid?
    messages.is_a?(Array) && messages.size <= MAX_MESSAGES && messages.all?(String)
  end

  def messages_are_valid
    return errors.add(:messages, "must be a list of up to #{MAX_MESSAGES} texts") unless messages_shape_valid?

    errors.add(:messages, 'must have at least one text') if message_variations.empty?
    errors.add(:messages, 'is too long') if messages.any? { |message| message.length > 4096 }
  end

  def inbox_is_whatsapp_of_account
    return if inbox.blank?
    return if inbox.account_id == account_id && inbox.channel_type == 'Channel::Whatsapp'

    errors.add(:inbox, 'must be a WhatsApp connection of the account')
  end

  def contact_list_is_from_account
    return if contact_list.blank? || contact_list.account_id == account_id

    errors.add(:contact_list, 'must belong to the account')
  end
end
