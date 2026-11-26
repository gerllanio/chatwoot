# GTI "Work" connection greeting, as Ticketz had per WhatsApp connection: when a customer
# writes and the conversation has no queue yet, they receive the greeting followed by the
# numbered list of the connection's queues ("1️⃣ - Comercial"), and answering with a number
# puts the conversation in that queue. A conversation left without a choice moves to the
# no-queue team after the timeout.
#
# == Schema Information
#
# Table name: gti_inbox_settings
#
#  id                       :bigint           not null, primary key
#  greeting_message         :text
#  menu_enabled             :boolean          default(FALSE), not null
#  no_queue_timeout_minutes :integer
#  team_ids                 :integer          default([]), not null, is an Array
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  account_id               :bigint           not null
#  inbox_id                 :bigint           not null
#  no_queue_team_id         :bigint
#
# Indexes
#
#  index_gti_inbox_settings_on_inbox_id  (inbox_id) UNIQUE
#
class GtiInboxSetting < ApplicationRecord
  KEYCAPS = %w[1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟].freeze
  MAX_TIMEOUT_MINUTES = 1440

  belongs_to :account
  belongs_to :inbox
  belongs_to :no_queue_team, class_name: 'Team', optional: true

  validates :inbox_id, uniqueness: true
  validates :greeting_message, length: { maximum: 4096 }
  validates :no_queue_timeout_minutes, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: MAX_TIMEOUT_MINUTES },
                                       allow_nil: true
  validate :teams_belong_to_account

  before_validation { self.account_id = inbox&.account_id }

  # The connection's queues, in the order they are numbered in the menu.
  def menu_teams
    teams_by_id = account.teams.where(id: team_ids).index_by(&:id)
    team_ids.filter_map { |id| teams_by_id[id] }
  end

  def menu_active?
    menu_enabled && menu_teams.any?
  end

  def no_queue_timeout
    return unless no_queue_timeout_minutes && no_queue_team_id

    no_queue_timeout_minutes.minutes
  end

  def push_event_data
    {
      inbox_id: inbox_id,
      menu_enabled: menu_enabled,
      greeting_message: greeting_message,
      team_ids: team_ids,
      no_queue_timeout_minutes: no_queue_timeout_minutes,
      no_queue_team_id: no_queue_team_id
    }
  end

  private

  def teams_belong_to_account
    ids = Array(team_ids) + [no_queue_team_id].compact
    return if ids.empty? || account.nil?

    errors.add(:team_ids, 'must be teams of this account') if account.teams.where(id: ids.uniq).count != ids.uniq.size
  end
end
