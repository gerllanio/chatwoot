# A conversation that got the queue menu and still has no queue nor agent after the
# connection's timeout moves to its no-queue team (Ticketz: "Transferir para Chatbot").
class Gti::QueueMenuTimeoutJob < ApplicationJob
  queue_as :medium

  def perform(conversation_id, sent_at)
    conversation = Conversation.find_by(id: conversation_id)
    return unless conversation && pending_choice?(conversation, sent_at)

    setting = GtiInboxSetting.find_by(inbox_id: conversation.inbox_id)
    return unless setting&.menu_enabled && setting.no_queue_team

    attributes = conversation.additional_attributes.except(Gti::QueueMenuService::SENT_AT_KEY)
    conversation.update!(team: setting.no_queue_team, additional_attributes: attributes)
  end

  private

  def pending_choice?(conversation, sent_at)
    !conversation.resolved? && conversation.team_id.nil? && conversation.assignee_id.nil? &&
      conversation.additional_attributes&.dig(Gti::QueueMenuService::SENT_AT_KEY).to_i == sent_at.to_i
  end
end
