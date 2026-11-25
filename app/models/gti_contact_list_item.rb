# One recipient of a GTI contact list. The number is stored as digits only, the way
# WhatsApp addresses it.
class GtiContactListItem < ApplicationRecord
  belongs_to :account
  belongs_to :contact_list, class_name: 'GtiContactList', foreign_key: :gti_contact_list_id,
                            inverse_of: :items, counter_cache: :items_count

  before_validation :normalize_number

  validates :number, presence: true, length: { in: 8..15 }, uniqueness: { scope: :gti_contact_list_id }
  validates :name, length: { maximum: 255 }
  validates :email, length: { maximum: 255 }
  validate :belongs_to_list_account

  def push_event_data
    { id: id, name: name, number: number, email: email }
  end

  private

  def normalize_number
    self.number = number.to_s.gsub(/\D/, '')
  end

  def belongs_to_list_account
    return if contact_list.blank? || contact_list.account_id == account_id

    errors.add(:contact_list, 'must belong to the account')
  end
end
