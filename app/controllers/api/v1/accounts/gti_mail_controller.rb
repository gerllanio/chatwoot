# GTI "Work" e-mail screen: browses the IMAP folders of the account's Email inboxes live,
# sends through their SMTP, and turns a message into a conversation. An agent reaches only
# the inboxes they are a member of (administrators reach all of them).
class Api::V1::Accounts::GtiMailController < Api::V1::Accounts::BaseController
  UNREAD_CACHE_TTL = 1.minute

  before_action :fetch_inbox, except: :mailboxes
  before_action :require_folder, only: [:messages, :show, :attachment, :seen, :move, :destroy, :to_conversation]

  rescue_from Gti::Mailbox::ImapClient::Error do |error|
    render json: { error: I18n.t('gti_mail.errors.server', message: error.message) }, status: :unprocessable_entity
  end

  def mailboxes
    render json: { payload: email_inboxes.map { |inbox| mailbox_json(inbox) } }
  end

  def folders
    render json: { payload: with_imap(&:folders) }
  end

  def create_folder
    name = params.require(:name).to_s.strip
    with_imap { |client| client.create_folder(name) }
    render json: { payload: with_imap(&:folders) }
  end

  def messages
    list = with_imap { |client| client.messages(params[:folder], before_uid: params[:before_uid], query: params[:q]) }
    render json: { payload: list, meta: { page_size: Gti::Mailbox::ImapClient::PAGE_SIZE } }
  end

  def show
    raw = with_imap { |client| client.raw_message(params[:folder], params[:uid]) }
    render json: Gti::Mailbox::MessageSummary.from_mail(Mail.read_from_string(raw), params[:uid])
  end

  def attachment
    raw = with_imap { |client| client.raw_message(params[:folder], params[:uid]) }
    file = Mail.read_from_string(raw).attachments[params[:index].to_i]
    return head :not_found unless file

    send_data file.decoded, filename: file.filename.to_s, type: file.mime_type, disposition: 'attachment'
  end

  def seen
    with_imap { |client| client.mark_seen(params[:folder], params[:uid], seen: params[:seen] != false) }
    head :ok
  end

  def move
    target = params.require(:target)
    with_imap { |client| client.move(params[:folder], params[:uid], target) }
    head :ok
  end

  def destroy
    with_imap { |client| client.delete(params[:folder], params[:uid]) }
    head :ok
  end

  def to_conversation
    raw = with_imap { |client| client.raw_message(params[:folder], params[:uid]) }
    conversation = Gti::Mailbox::ConversationImportService.new(inbox: @inbox, raw: raw).perform
    return render json: { error: I18n.t('gti_mail.errors.not_imported') }, status: :unprocessable_entity unless conversation

    render json: { conversation_id: conversation.display_id }
  end

  def send_mail
    params.require(:to)
    Gti::Mailbox::SendService.new(inbox: @inbox, params: send_params).perform
    head :ok
  end

  private

  def email_inboxes
    Current.user.assigned_inboxes.where(channel_type: 'Channel::Email').includes(:channel).order(:name)
  end

  def fetch_inbox
    @inbox = email_inboxes.find(params[:inbox_id])
  end

  def require_folder
    params.require(:folder)
  end

  def with_imap(&)
    Gti::Mailbox::ImapClient.open(@inbox.channel, &)
  end

  def send_params
    params.permit(:to, :cc, :subject, :body, :in_reply_to, :references, attachments: [])
  end

  def mailbox_json(inbox)
    channel = inbox.channel
    {
      id: inbox.id,
      name: inbox.name,
      email: channel.email,
      imap_enabled: channel.imap_enabled && channel.provider.blank?,
      smtp_enabled: channel.smtp_enabled,
      unread: params[:with_unread].present? ? inbox_unread(inbox) : nil
    }
  end

  def inbox_unread(inbox)
    return nil unless inbox.channel.imap_enabled && inbox.channel.provider.blank?

    Rails.cache.fetch("gti_mail/unread/#{inbox.id}", expires_in: UNREAD_CACHE_TTL) do
      Gti::Mailbox::ImapClient.open(inbox.channel) { |client| client.unseen_count('INBOX') }
    end
  rescue Gti::Mailbox::ImapClient::Error
    nil
  end
end
