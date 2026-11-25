# Sends a team's greeting to a WhatsApp conversation that just entered the team.
class Gti::QueueGreetingJob < ApplicationJob
  queue_as :medium

  def perform(conversation_id, team_id)
    conversation = Conversation.find_by(id: conversation_id)
    return unless conversation && conversation.team_id == team_id
    return if conversation.resolved?
    return unless conversation.inbox.channel_type == 'Channel::Whatsapp'

    setting = GtiTeamSetting.find_by(team_id: team_id)
    return unless setting

    Gti::QueueGreetingService.new(conversation: conversation, setting: setting).perform
  end
end
