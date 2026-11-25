# GTI "Work": e-mail stays in the E-mail module (GTI mail screen, read straight from IMAP)
# instead of becoming conversations in Atendimentos. When on, Chatwoot's IMAP fetch skips
# the account's e-mail inboxes; "Transformar em atendimento" still creates a conversation.
module GtiAccountMail
  extend ActiveSupport::Concern

  included do
    store_accessor :settings, :gti_email_mail_only
  end

  def gti_email_mail_only=(value)
    super(ActiveModel::Type::Boolean.new.cast(value))
  end

  def gti_email_mail_only?
    gti_email_mail_only == true
  end
end
