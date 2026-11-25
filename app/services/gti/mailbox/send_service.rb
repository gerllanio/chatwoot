# GTI "Work" e-mail: sends a message written in the mail screen through the inbox's own
# SMTP settings (the same ones Chatwoot uses for conversation replies), then keeps a copy
# in the server's Sent folder so other mail clients see it too.
class Gti::Mailbox::SendService
  pattr_initialize [:inbox!, :params!]

  def perform
    raise Gti::Mailbox::ImapClient::Error, I18n.t('gti_mail.errors.smtp_disabled') unless channel.smtp_enabled

    mail = build_mail
    mail.delivery_method(:smtp, smtp_settings)
    mail.deliver
    store_sent_copy(mail)
    mail
  rescue Net::SMTPError, Net::OpenTimeout, Net::ReadTimeout, SocketError, SystemCallError, OpenSSL::SSL::SSLError => e
    raise Gti::Mailbox::ImapClient::Error, e.message
  end

  private

  def channel
    inbox.channel
  end

  def build_mail
    mail = Mail.new
    add_addresses(mail)
    mail.subject = params[:subject].to_s
    add_threading(mail)
    add_body(mail)
    add_attachments(mail)
    mail
  end

  def add_addresses(mail)
    mail.from = Mail::Address.new(channel.email).tap { |address| address.display_name = inbox.name }.to_s
    mail.to = params[:to]
    mail.cc = params[:cc] if params[:cc].present?
  end

  def add_attachments(mail)
    Array(params[:attachments]).compact_blank.each do |file|
      mail.add_file(filename: file.original_filename, content: file.read)
    end
  end

  def add_threading(mail)
    return if params[:in_reply_to].blank?

    mail.in_reply_to = message_id(params[:in_reply_to])
    ids = params[:references].to_s.split + [params[:in_reply_to]]
    mail.references = ids.compact_blank.map { |id| message_id(id) }.join(' ')
  end

  def message_id(value)
    "<#{value.to_s.delete('<>')}>"
  end

  def add_body(mail)
    text = params[:body].to_s
    html = ERB::Util.html_escape(text).gsub("\n", '<br>')
    mail.text_part = Mail::Part.new { body text }
    mail.html_part = Mail::Part.new do
      content_type 'text/html; charset=UTF-8'
      body "<div>#{html}</div>"
    end
  end

  def store_sent_copy(mail)
    return unless channel.imap_enabled

    Gti::Mailbox::ImapClient.open(channel) { |client| client.append_sent(mail.to_s) }
  rescue Gti::Mailbox::ImapClient::Error => e
    Rails.logger.warn("[GTI::MAIL] sent copy not stored for inbox #{inbox.id}: #{e.message}")
  end

  def smtp_settings
    {
      address: channel.smtp_address,
      port: channel.smtp_port,
      user_name: channel.smtp_login,
      password: channel.smtp_password,
      domain: channel.smtp_domain,
      tls: channel.smtp_enable_ssl_tls,
      enable_starttls_auto: channel.smtp_enable_starttls_auto,
      openssl_verify_mode: channel.smtp_openssl_verify_mode,
      authentication: channel.smtp_authentication,
      open_timeout: 15,
      read_timeout: 30
    }
  end
end
