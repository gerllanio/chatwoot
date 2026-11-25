# GTI "Work" contact list: the audience a campaign is sent to (Ticketz "Listas de contatos").
class GtiContactList < ApplicationRecord
  belongs_to :account
  has_many :items, class_name: 'GtiContactListItem', dependent: :delete_all, inverse_of: :contact_list
  has_many :campaigns, class_name: 'GtiCampaign', dependent: :nullify, inverse_of: :contact_list

  validates :name, presence: true, length: { maximum: 255 }

  def push_event_data
    { id: id, name: name, items_count: items_count, created_at: created_at.to_i }
  end
end
