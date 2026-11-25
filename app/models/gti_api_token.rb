# GTI "Work" messages API token: the Ticketz-compatible `POST /api/messages/send`
# endpoint authenticates with one of these, and the token decides which WhatsApp
# connection (inbox) sends the message.
#
# == Schema Information
#
# Table name: gti_api_tokens
#
#  id           :bigint           not null, primary key
#  last_used_at :datetime
#  name         :string           not null
#  token        :string           not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  account_id   :bigint           not null
#  inbox_id     :bigint           not null
#
# Indexes
#
#  index_gti_api_tokens_on_account_id_and_inbox_id  (account_id,inbox_id)
#  index_gti_api_tokens_on_inbox_id                 (inbox_id)
#  index_gti_api_tokens_on_token                    (token) UNIQUE
#
class GtiApiToken < ApplicationRecord
  TOKEN_BYTES = 24
  # Tokens generated here are 32 characters. Ticketz let users type their own, and
  # those are copied over as they are (9 to 15 characters on GTI's connections) so
  # n8n keeps working on cutover; regenerate them afterwards for a stronger one.
  MIN_TOKEN_LENGTH = 8
  LAST_USED_PRECISION = 1.minute

  belongs_to :account
  belongs_to :inbox

  before_validation :generate_token, on: :create

  validates :name, presence: true, length: { maximum: 255 }
  validates :token, presence: true, uniqueness: true, length: { minimum: MIN_TOKEN_LENGTH, maximum: 255 }
  validate :inbox_is_whatsapp_of_account

  def regenerate!
    update!(token: self.class.new_token)
  end

  # Written at most once a minute so a busy integration does not turn every send
  # into a row update.
  def touch_last_used!
    return if last_used_at.present? && last_used_at > LAST_USED_PRECISION.ago

    update!(last_used_at: Time.current)
  end

  def push_event_data
    {
      id: id,
      name: name,
      token: token,
      inbox_id: inbox_id,
      inbox_name: inbox.name,
      last_used_at: last_used_at&.to_i,
      created_at: created_at.to_i
    }
  end

  def self.new_token
    SecureRandom.urlsafe_base64(TOKEN_BYTES)
  end

  private

  def generate_token
    self.token = self.class.new_token if token.blank?
  end

  def inbox_is_whatsapp_of_account
    return if inbox.nil?

    errors.add(:inbox, :invalid) unless inbox.account_id == account_id && inbox.channel_type == 'Channel::Whatsapp'
  end
end
