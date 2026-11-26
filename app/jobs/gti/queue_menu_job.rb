# Runs the connection's queue menu for a customer message (see GtiQueueMenu).
class Gti::QueueMenuJob < ApplicationJob
  queue_as :high

  def perform(message_id)
    message = Message.find_by(id: message_id)
    return unless message

    Gti::QueueMenuService.new(message: message).perform
  end
end
