# GTI "Work" e-mail: a short-lived IMAP session on one Email-channel inbox, used by the
# mail client screen to browse folders and messages live on the server. Chatwoot's own
# Imap::FetchEmailService only imports INBOX into conversations; this reads any folder
# without importing anything. Each request opens and closes its own connection.
class Gti::Mailbox::ImapClient
  class Error < StandardError; end

  PAGE_SIZE = 50
  MAX_FOLDERS = 60
  OPEN_TIMEOUT = 10
  RESPONSE_TIMEOUT = 20
  HEADER_ATTRS = %w[UID ENVELOPE FLAGS BODYSTRUCTURE INTERNALDATE].freeze
  SPECIAL_USE = %w[\\Sent \\Trash \\Drafts \\Junk \\Archive].freeze
  FALLBACK_NAMES = {
    'sent' => ['Sent', 'Sent Items', 'Sent Messages', 'Enviados', 'Itens Enviados', 'INBOX.Sent'],
    'trash' => ['Trash', 'Deleted Items', 'Deleted Messages', 'Lixeira', 'Itens Excluídos', 'INBOX.Trash']
  }.freeze
  CONNECTION_ERRORS = [
    Net::IMAP::Error, Net::OpenTimeout, Net::ReadTimeout, IOError, SocketError, SystemCallError,
    OpenSSL::SSL::SSLError, Timeout::Error
  ].freeze

  def self.open(channel)
    client = new(channel)
    yield client
  rescue *CONNECTION_ERRORS => e
    raise Error, e.message
  ensure
    client&.close
  end

  def initialize(channel)
    raise Error, I18n.t('gti_mail.errors.imap_disabled') unless channel.imap_enabled && channel.provider.blank?

    @imap = Net::IMAP.new(channel.imap_address, port: channel.imap_port, ssl: channel.imap_enable_ssl,
                                                open_timeout: OPEN_TIMEOUT, idle_response_timeout: RESPONSE_TIMEOUT)
    Imap::Authentication.authenticate!(@imap, channel.imap_authentication, channel.imap_login, channel.imap_password)
  end

  def close
    @imap.logout
    @imap.disconnect
  rescue *CONNECTION_ERRORS
    nil
  end

  def folders
    selectable_folders.map do |entry|
      { path: entry.name, name: Net::IMAP.decode_utf7(entry.name), delimiter: entry.delim,
        special_use: special_use(entry), unseen: unseen_count(entry.name) }
    end
  end

  def unseen_count(folder)
    @imap.status(folder, ['UNSEEN'])['UNSEEN'].to_i
  end

  def messages(folder, before_uid: nil, query: nil)
    return [] if before_uid.present? && before_uid.to_i <= 1

    @imap.examine(folder)
    uids = search_uids(before_uid, query).sort.last(PAGE_SIZE).reverse
    return [] if uids.empty?

    fetched = @imap.uid_fetch(uids, HEADER_ATTRS) || []
    fetched.map { |data| Gti::Mailbox::MessageSummary.from_fetch(data) }.sort_by { |message| -message[:uid] }
  end

  def raw_message(folder, uid)
    @imap.examine(folder)
    data = @imap.uid_fetch(uid.to_i, ['BODY.PEEK[]', 'FLAGS'])&.first
    raise Error, I18n.t('gti_mail.errors.not_found') unless data

    data.attr['BODY[]']
  end

  def mark_seen(folder, uid, seen: true)
    @imap.select(folder)
    @imap.uid_store(uid.to_i, seen ? '+FLAGS' : '-FLAGS', [:Seen])
  end

  def move(folder, uid, target)
    @imap.select(folder)
    if @imap.capable?('MOVE')
      @imap.uid_move(uid.to_i, target)
    else
      @imap.uid_copy(uid.to_i, target)
      @imap.uid_store(uid.to_i, '+FLAGS', [:Deleted])
      @imap.expunge
    end
  end

  def delete(folder, uid)
    trash = special_folder('trash')
    return move(folder, uid, trash) if trash && trash != folder

    @imap.select(folder)
    @imap.uid_store(uid.to_i, '+FLAGS', [:Deleted])
    @imap.expunge
  end

  def create_folder(name)
    @imap.create(Net::IMAP.encode_utf7(name))
  end

  def append_sent(raw)
    sent = special_folder('sent')
    @imap.append(sent, raw, [:Seen]) if sent
  end

  private

  def selectable_folders
    (@imap.list('', '*') || []).reject { |entry| entry.attr.include?(:Noselect) }.first(MAX_FOLDERS)
  end

  def special_use(entry)
    flag = entry.attr.map(&:to_s).find { |attr| SPECIAL_USE.include?("\\#{attr}") }
    flag&.downcase
  end

  def special_folder(kind)
    entries = selectable_folders
    by_flag = entries.find { |entry| special_use(entry) == kind }
    return by_flag.name if by_flag

    names = FALLBACK_NAMES.fetch(kind)
    entries.find { |entry| names.include?(Net::IMAP.decode_utf7(entry.name)) }&.name
  end

  def search_uids(before_uid, query)
    criteria = before_uid.present? ? ['UID', "1:#{before_uid.to_i - 1}"] : ['ALL']
    return @imap.uid_search(criteria) if query.blank?

    @imap.uid_search(criteria + ['OR', 'SUBJECT', query.to_s, 'FROM', query.to_s], 'UTF-8')
  end
end
