# The connection's queue menu, as Ticketz sends it: on a customer message in a conversation
# without queue and without agent, the greeting followed by the numbered queues; a numeric
# answer puts the conversation in that queue (whose own greeting then follows), anything
# else gets the menu again, at most once every RESEND_INTERVAL.
class Gti::QueueMenuService
  SENT_AT_KEY = 'gti_menu_sent_at'.freeze
  RESEND_INTERVAL = 2.minutes
  DEFAULT_TIMEZONE = 'America/Sao_Paulo'.freeze

  pattr_initialize [:message!]

  # A WhatsApp customer writing again after the conversation was resolved goes back to the
  # queue (Aguardando), like a new Ticketz ticket; with the menu on, it also loses its queue
  # so the menu is offered again. Only assigns: the caller saves the conversation.
  def self.return_to_queue(conversation)
    conversation.assignee_id = nil
    setting = GtiInboxSetting.find_by(inbox_id: conversation.inbox_id)
    return unless setting&.menu_enabled

    conversation.team_id = nil
    conversation.additional_attributes = (conversation.additional_attributes || {}).except(SENT_AT_KEY)
  end

  def perform
    return unless applicable?

    sent_at = conversation.additional_attributes&.dig(SENT_AT_KEY)
    return send_menu if sent_at.blank?

    team = chosen_team
    return choose(team) if team

    send_menu if Time.zone.at(sent_at.to_i) <= RESEND_INTERVAL.ago
  end

  def menu_text
    teams = setting.menu_teams
    options = teams.each_with_index.map do |team, index|
      "#{GtiInboxSetting::KEYCAPS[index] || (index + 1)} - #{team.name.upcase_first}"
    end
    [greeting_text, options.join("\n")].compact_blank.join("\n\n")
  end

  private

  delegate :conversation, to: :message

  def setting
    @setting ||= GtiInboxSetting.find_by(inbox_id: conversation.inbox_id)
  end

  def applicable?
    return false unless message.incoming? && !message.private? && !message.reaction?
    return false if conversation.group_type_group? || conversation.resolved?
    return false if conversation.team_id.present? || conversation.assignee_id.present?

    setting.present? && setting.menu_active?
  end

  def chosen_team
    choice = message.content.to_s.strip
    return unless choice.match?(/\A\d{1,2}\z/)

    setting.menu_teams[choice.to_i - 1] if choice.to_i.positive?
  end

  def choose(team)
    attributes = (conversation.additional_attributes || {}).except(SENT_AT_KEY)
    conversation.update!(team: team, additional_attributes: attributes)
  end

  def send_menu
    conversation.messages.create!(
      account_id: conversation.account_id, inbox_id: conversation.inbox_id, message_type: :template, content: menu_text
    )
    sent_at = Time.current.to_i
    conversation.update!(additional_attributes: (conversation.additional_attributes || {}).merge(SENT_AT_KEY => sent_at))
    timeout = setting.no_queue_timeout
    Gti::QueueMenuTimeoutJob.set(wait: timeout).perform_later(conversation.id, sent_at) if timeout
  end

  def greeting_text
    text = setting.greeting_message
    return if text.blank?

    name = conversation.contact.name.to_s
    text.gsub('{{firstname}}', name.split.first.to_s)
        .gsub('{{name}}', name)
        .gsub('{{hora}}', Time.current.in_time_zone(timezone).strftime('%H:%M:%S'))
  end

  def timezone
    zone = conversation.inbox.timezone
    zone.blank? || zone == 'UTC' ? DEFAULT_TIMEZONE : zone
  end
end
