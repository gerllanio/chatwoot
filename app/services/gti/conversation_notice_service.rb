# GTI "Work": the Ticketz-style notices an agent's action sends to the customer.
# When an agent accepts a waiting conversation or transfers it to another queue,
# the account's configured text goes out as an ordinary outgoing message, with
# {{firstname}}, {{name}}, {{user}} and {{queue}} filled in. An empty text sends nothing.
class Gti::ConversationNoticeService
  KINDS = {
    'accepted' => :gti_ticket_accepted_message,
    'transfer' => :gti_transfer_message
  }.freeze
  VARIABLE = /\{\{\s*(firstname|name|user|queue)\s*\}\}/i

  pattr_initialize [:conversation!, :user!, :kind!]

  def perform
    template = conversation.account.public_send(KINDS.fetch(kind)).to_s
    return if template.strip.empty?

    conversation.messages.create!(
      account: conversation.account,
      inbox: conversation.inbox,
      message_type: :outgoing,
      sender: user,
      content: render(template)
    )
  end

  private

  def render(template)
    contact_name = conversation.contact.name.to_s
    values = {
      'firstname' => contact_name.split.first.to_s,
      'name' => contact_name,
      'user' => user.available_name.to_s,
      'queue' => conversation.team&.name.to_s
    }
    template.gsub(VARIABLE) { values[Regexp.last_match(1).downcase] }
  end
end
