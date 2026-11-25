# GTI "Work" e-mail: turns IMAP header fetches and full messages into the JSON the mail
# screen shows (a list row, or the opened message with its attachments).
module Gti::Mailbox::MessageSummary
  module_function

  def from_fetch(data)
    envelope = data.attr['ENVELOPE']
    flags = data.attr['FLAGS'].to_a
    sender_fields(envelope&.from&.first).merge(
      uid: data.attr['UID'],
      subject: decode(envelope&.subject),
      date: parse_time(envelope&.date) || parse_time(data.attr['INTERNALDATE']),
      seen: flags.include?(:Seen),
      flagged: flags.include?(:Flagged),
      has_attachments: attachment?(data.attr['BODYSTRUCTURE'])
    )
  end

  def sender_fields(sender)
    { from_name: decode(sender&.name), from_email: address(sender) }
  end

  def from_mail(mail, uid)
    sender = mail[:from]&.addrs&.first
    {
      uid: uid.to_i, message_id: mail.message_id, references: Array(mail.references).join(' '),
      subject: mail.subject.to_s, from_name: sender&.display_name.to_s, from_email: sender&.address.to_s,
      to: Array(mail.to).join(', '), cc: Array(mail.cc).join(', '), date: mail.date&.iso8601,
      html: html_body(mail), text: text_body(mail), attachments: attachments_json(mail)
    }
  end

  def attachments_json(mail)
    mail.attachments.each_with_index.map do |attachment, index|
      { index: index, filename: attachment.filename.to_s, content_type: attachment.mime_type.to_s,
        size: attachment.decoded.bytesize }
    end
  end

  def html_body(mail)
    part = mail.html_part || (mail.mime_type == 'text/html' ? mail : nil)
    part && utf8(part.decoded)
  end

  def text_body(mail)
    part = mail.text_part || (mail.multipart? ? nil : mail)
    return nil if part.nil? || part.mime_type == 'text/html'

    utf8(part.decoded)
  end

  def utf8(value)
    value.to_s.dup.force_encoding('UTF-8').scrub
  end

  def decode(value)
    return '' if value.blank?

    utf8(Mail::Encodings.value_decode(value))
  end

  def address(sender)
    return '' unless sender&.mailbox

    [sender.mailbox, sender.host].compact.join('@')
  end

  def parse_time(value)
    return nil if value.blank?

    Time.zone.parse(value.to_s)&.iso8601
  rescue ArgumentError
    nil
  end

  def attachment?(structure)
    return false if structure.nil?
    return structure.parts.any? { |part| attachment?(part) } if structure.multipart?

    disposition = structure.respond_to?(:disposition) ? structure.disposition : nil
    disposition.present? && disposition.dsp_type.to_s.casecmp?('attachment')
  end
end
