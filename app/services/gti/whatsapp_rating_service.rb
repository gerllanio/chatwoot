# GTI "Work": the Ticketz-style satisfaction rating. Instead of Chatwoot's survey link, a
# resolved WhatsApp conversation gets a plain text asking for a grade from 1 to 5. The customer
# answers with a digit: the grade is stored as an ordinary CSAT response (so the CSAT reports
# show it), a thank-you goes back and the conversation stays resolved. Any other answer, or an
# answer after the account's timeout, reopens the conversation the usual way.
#
# MessageTemplates::Template::CsatSurvey hands the request here, and Message#reopen_conversation asks
# #consume_reply before reopening a resolved conversation.
class Gti::WhatsappRatingService
  REQUESTED_AT_KEY = 'gti_rating_requested_at'.freeze
  REQUEST_MESSAGE_KEY = 'gti_rating_message_id'.freeze
  RATING_ANSWER = /\A[1-5]\z/

  DEFAULT_REQUEST = "Estamos quase finalizando seu atendimento 😄\n\nSua opinião é muito importante para nós 💚\n\n" \
                    "1 - Ruim / 5 - Excelente\n\nEnvie uma avaliação de 1 a 5".freeze
  DEFAULT_THANKS = 'Obrigado pela sua avaliação! 💚'.freeze

  pattr_initialize [:conversation!]

  # QR-code (session) WhatsApp only: the paid Cloud API keeps its approved survey template.
  def self.applies_to?(conversation)
    channel = conversation.inbox.channel
    channel.is_a?(Channel::Whatsapp) && channel.session_family? &&
      conversation.account.gti_rating_by_whatsapp_digits?
  end

  def request
    message = send_text(account.gti_rating_message.presence || DEFAULT_REQUEST)
    store_request(message)
    message
  end

  # Returns true when the incoming message was the answer to the rating and was consumed, so
  # the caller leaves the conversation resolved.
  def consume_reply(message)
    asked_at = requested_at
    return false if asked_at.blank?

    request_message_id = conversation.additional_attributes[REQUEST_MESSAGE_KEY]
    clear_request
    return false unless rating_answer?(message, asked_at)

    record_rating(message, request_message_id)
    send_text(account.gti_rating_thanks_message.presence || DEFAULT_THANKS)
    true
  end

  private

  delegate :account, :inbox, to: :conversation

  def requested_at
    value = conversation.additional_attributes&.dig(REQUESTED_AT_KEY)
    value.present? ? Time.zone.parse(value) : nil
  end

  def rating_answer?(message, asked_at)
    asked_at > account.gti_rating_timeout.ago && message.content.to_s.strip.match?(RATING_ANSWER)
  end

  def record_rating(message, request_message_id)
    response = CsatSurveyResponse.find_or_initialize_by(message_id: request_message_id || message.id)
    response.update!(
      account: account, conversation: conversation, contact: conversation.contact,
      assigned_agent: conversation.assignee, rating: message.content.to_s.strip.to_i
    )
  end

  def send_text(content)
    conversation.messages.create!(
      account: account, inbox: inbox, message_type: :template, content: content
    )
  end

  def store_request(message)
    attributes = (conversation.additional_attributes || {}).merge(
      REQUESTED_AT_KEY => Time.current.iso8601, REQUEST_MESSAGE_KEY => message.id
    )
    conversation.update!(additional_attributes: attributes)
  end

  def clear_request
    attributes = (conversation.additional_attributes || {}).except(REQUESTED_AT_KEY, REQUEST_MESSAGE_KEY)
    conversation.update!(additional_attributes: attributes)
  end
end
