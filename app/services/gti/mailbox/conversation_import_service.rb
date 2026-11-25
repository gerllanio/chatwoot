# GTI "Work" e-mail: "Transformar em atendimento". Runs one message from the mail screen
# through Chatwoot's own IMAP import path, so it becomes a conversation exactly as if the
# inbox had fetched it (contact, threading, attachments, duplicate check).
class Gti::Mailbox::ConversationImportService
  pattr_initialize [:inbox!, :raw!]

  def perform
    mail = Mail.read_from_string(raw)
    Imap::ImapMailbox.new.process(mail, inbox.channel)
    inbox.messages.find_by(source_id: mail.message_id)&.conversation
  end
end
