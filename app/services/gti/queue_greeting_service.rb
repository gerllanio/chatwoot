# Builds and sends a team's greeting as template messages, the way upstream sends an
# inbox greeting, so the channel's reply job delivers them. Outside the inbox working
# hours the team's out-of-hours message goes instead, without the media.
#
# An image travels with the text as its caption. An audio goes in its own message after
# the text; a browser recording (ogg/webm) is flagged as recorded so WhatsApp shows it
# as a voice note.
class Gti::QueueGreetingService
  VOICE_NOTE_TYPES = %w[audio/ogg audio/webm audio/opus].freeze

  pattr_initialize [:conversation!, :setting!]

  def perform
    return send_text(out_of_hours_text) if out_of_hours?
    return unless setting.greeting?

    case setting.media_kind
    when 'image' then send_message(greeting_text, attachment_type: :image)
    when 'audio'
      send_text(greeting_text)
      send_message(nil, attachment_type: :audio)
    else send_text(greeting_text)
    end
  end

  private

  def out_of_hours?
    setting.out_of_hours_message.present? && conversation.inbox.out_of_office?
  end

  def out_of_hours_text
    interpolate(setting.out_of_hours_message)
  end

  def greeting_text
    interpolate(setting.greeting_message)
  end

  def interpolate(text)
    return if text.blank?

    name = conversation.contact.name.to_s
    text.gsub('{{firstname}}', name.split.first.to_s)
        .gsub('{{name}}', name)
        .gsub('{{queue}}', setting.team.name.upcase_first)
  end

  def send_text(content)
    return if content.blank?

    send_message(content)
  end

  def send_message(content, attachment_type: nil)
    message = conversation.messages.new(
      account_id: conversation.account_id, inbox_id: conversation.inbox_id, message_type: :template, content: content
    )
    attach_media(message, attachment_type) if attachment_type
    message.save!
  end

  def attach_media(message, attachment_type)
    attachment = message.attachments.new(account_id: conversation.account_id, file_type: attachment_type, meta: media_meta)
    attachment.file.attach(setting.greeting_media.blob)
  end

  def media_meta
    return {} unless VOICE_NOTE_TYPES.include?(setting.greeting_media.content_type.to_s.split(';').first)

    { is_recorded_audio: true }
  end
end
