# Delivers one GTI campaign shipping through the campaign's WhatsApp inbox: finds the
# recipient's contact (or creates it), reuses their latest conversation in that inbox (or
# opens a resolved one, so a campaign does not flood the queue), and posts the text as an
# ordinary outgoing message, which the inbox's own send path delivers.
class Gti::CampaignSendService
  pattr_initialize [:shipping!]

  # A WhatsApp number has a country code plus 8 to 11 digits; anything shorter cannot be sent.
  SENDABLE_NUMBER = /\A\d{10,15}\z/

  def perform
    raise ArgumentError, "número inválido: #{shipping.number}" unless shipping.number.to_s.match?(SENDABLE_NUMBER)

    contact_inbox = find_or_create_contact_inbox
    conversation = latest_conversation(contact_inbox) || create_conversation(contact_inbox)
    message = conversation.messages.new(
      account_id: campaign.account_id, inbox_id: inbox.id, message_type: :outgoing,
      content: shipping.message, sender: campaign.created_by
    )
    attach_media(message)
    message.save!
    shipping.update!(status: :delivered, delivered_at: Time.current, contact: contact_inbox.contact, conversation: conversation)
  end

  private

  delegate :campaign, to: :shipping
  delegate :inbox, :account, to: :campaign

  def number_variants
    @number_variants ||= Whatsapp::Session::PhoneMatch.variants(shipping.number)
  end

  def find_or_create_contact_inbox
    existing = inbox.contact_inboxes.find_by(source_id: number_variants)
    return existing if existing

    ContactInbox.create!(contact: find_or_create_contact, inbox: inbox, source_id: shipping.number)
  end

  def find_or_create_contact
    account.contacts.find_by(phone_number: number_variants.map { |number| "+#{number}" }) ||
      account.contacts.create!(name: shipping.name.presence || shipping.number, phone_number: "+#{shipping.number}")
  end

  def latest_conversation(contact_inbox)
    contact_inbox.conversations.order(created_at: :desc).first
  end

  def create_conversation(contact_inbox)
    Conversation.create!(account: account, inbox: inbox, contact: contact_inbox.contact, contact_inbox: contact_inbox, status: :resolved)
  end

  def attach_media(message)
    return unless campaign.media.attached?

    attachment = message.attachments.new(account_id: campaign.account_id, file_type: file_type)
    attachment.file.attach(campaign.media.blob)
  end

  def file_type
    case campaign.media.content_type.to_s.split('/').first
    when 'image' then :image
    when 'audio' then :audio
    when 'video' then :video
    else :file
    end
  end
end
