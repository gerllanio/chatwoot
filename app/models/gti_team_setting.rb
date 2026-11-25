# GTI "Work" queue greeting, as Ticketz had per queue: a color, a message (and an optional
# image or recorded audio) sent to the customer when the conversation enters the team, and
# a message sent instead while the inbox is outside its working hours.
#
# == Schema Information
#
# Table name: gti_team_settings
#
#  id                   :bigint           not null, primary key
#  color                :string
#  greeting_message     :text
#  out_of_hours_message :text
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  account_id           :bigint           not null
#  team_id              :bigint           not null
#
# Indexes
#
#  index_gti_team_settings_on_team_id  (team_id) UNIQUE
#
class GtiTeamSetting < ApplicationRecord
  MEDIA_MAX_SIZE = 16.megabytes
  MEDIA_TYPES = %w[image audio].freeze
  COLOR_FORMAT = /\A#\h{6}\z/

  belongs_to :account
  belongs_to :team

  has_one_attached :greeting_media

  validates :team_id, uniqueness: true
  validates :color, format: { with: COLOR_FORMAT }, allow_blank: true
  validates :greeting_message, :out_of_hours_message, length: { maximum: 4096 }
  validate :greeting_media_is_image_or_audio

  before_validation { self.account_id = team&.account_id }

  def greeting?
    greeting_message.present? || greeting_media.attached?
  end

  def media_kind
    return unless greeting_media.attached?

    greeting_media.content_type.to_s.split('/').first
  end

  def push_event_data
    {
      team_id: team_id,
      color: color,
      greeting_message: greeting_message,
      out_of_hours_message: out_of_hours_message,
      media: media_payload
    }
  end

  private

  def media_payload
    return unless greeting_media.attached?

    {
      kind: media_kind,
      filename: greeting_media.filename.to_s,
      content_type: greeting_media.content_type,
      url: Rails.application.routes.url_helpers.rails_blob_url(greeting_media, only_path: true)
    }
  end

  def greeting_media_is_image_or_audio
    return unless greeting_media.attached?

    errors.add(:greeting_media, 'must be an image or an audio') unless MEDIA_TYPES.include?(media_kind)
    errors.add(:greeting_media, "must be at most #{MEDIA_MAX_SIZE / 1.megabyte} MB") if greeting_media.byte_size > MEDIA_MAX_SIZE
  end
end
