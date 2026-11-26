# GTI "Work": an incoming customer message hands the conversation to the connection's queue
# menu (see GtiInboxSetting and Gti::QueueMenuService). Done in a job so it runs after the
# message's own callbacks, including the reopen of a resolved conversation.
module GtiQueueMenu
  extend ActiveSupport::Concern

  included do
    after_create_commit :enqueue_gti_queue_menu
  end

  private

  def enqueue_gti_queue_menu
    return unless incoming? && !private?
    return if Import::SilentWrite.on?
    return unless inbox&.channel_type == 'Channel::Whatsapp'

    Gti::QueueMenuJob.perform_later(id)
  end
end
