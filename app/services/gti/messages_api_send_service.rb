# Sends a message for the Ticketz-compatible messages API (`POST /api/messages/send`).
#
# n8n and Primata were written against Ticketz, so the request keeps Ticketz's shape:
# a number (digits or a WhatsApp JID), a body, optional `medias` files and the
# `saveOnTicket` flag. The message goes through Messages::MessageBuilder like one an
# agent types, so the WhatsApp session sends it and it shows up in the conversation.
class Gti::MessagesApiSendService
  class InvalidNumber < StandardError; end

  GROUP_SUFFIX = '@g.us'.freeze
  PERSON_SUFFIXES = ['@s.whatsapp.net', '@c.us'].freeze
  MIN_DIGITS = 8
  MAX_DIGITS = 15

  pattr_initialize [:api_token!, :number!, :body, :medias, :save_on_ticket]

  def perform
    contact_inbox = group? ? group_contact_inbox : person_contact_inbox
    conversation, created = conversation_for(contact_inbox)
    message = Messages::MessageBuilder.new(nil, conversation, message_params).perform
    conversation.resolved! if created && !keep_on_ticket?
    message
  end

  private

  delegate :inbox, to: :api_token

  def group?
    number.to_s.strip.end_with?(GROUP_SUFFIX)
  end

  # Groups are only reachable once WhatsApp has told us about them, so a group the
  # inbox never saw is an invalid number rather than one we invent.
  def group_contact_inbox
    jid = number.to_s.strip
    inbox.contact_inboxes.find_by(source_id: [jid, jid.delete_suffix(GROUP_SUFFIX)]) || raise(InvalidNumber)
  end

  def person_contact_inbox
    party = Whatsapp::Session::Model::Party.new(phone: phone_digits)
    Whatsapp::Session::Inbound::ContactLookup.find(inbox: inbox, party: party) ||
      Whatsapp::Session::Inbound::ContactResolver.new(inbox: inbox, party: party).perform
  end

  def phone_digits
    raw = PERSON_SUFFIXES.inject(number.to_s.strip) { |value, suffix| value.delete_suffix(suffix) }
    digits = Whatsapp::Session::PhoneMatch.digits(raw)
    raise InvalidNumber unless digits.length.between?(MIN_DIGITS, MAX_DIGITS) && !digits.start_with?('0')

    digits
  end

  # The thread the contact is already being served in, when there is one; otherwise a
  # new one, which is resolved again after sending unless the caller asked to keep it.
  def conversation_for(contact_inbox)
    open = contact_inbox.contact.conversations.where(inbox: inbox).where.not(status: :resolved).last
    return [open, false] if open

    conversation = Conversation.create!(
      account_id: inbox.account_id, inbox: inbox, contact: contact_inbox.contact, contact_inbox: contact_inbox
    )
    [conversation, true]
  end

  def keep_on_ticket?
    save_on_ticket.nil? || ActiveModel::Type::Boolean.new.cast(save_on_ticket)
  end

  def message_params
    { content: body.presence, message_type: 'outgoing', attachments: Array(medias).compact_blank }
  end
end
