# GTI "Work": settings of the Ticketz-style rating. When a WhatsApp conversation is resolved,
# the customer gets a text asking for a grade from 1 to 5 instead of the survey link, and
# answers with a digit. Stored in accounts.settings (see AccountSettingsSchema).
module GtiAccountRating
  extend ActiveSupport::Concern

  RATING_MODES = %w[whatsapp_digits link].freeze
  DEFAULT_RATING_TIMEOUT_MINUTES = 20

  included do
    store_accessor :settings, :gti_rating_mode, :gti_rating_message, :gti_rating_thanks_message, :gti_rating_timeout_minutes
  end

  def gti_rating_timeout_minutes=(value)
    super(value.presence && ActiveModel::Type::Integer.new.cast(value))
  end

  # The digit rating is the default: only an explicit 'link' brings the survey link back.
  def gti_rating_by_whatsapp_digits?
    gti_rating_mode != 'link'
  end

  def gti_rating_timeout
    (gti_rating_timeout_minutes.presence || DEFAULT_RATING_TIMEOUT_MINUTES).to_i.minutes
  end
end
