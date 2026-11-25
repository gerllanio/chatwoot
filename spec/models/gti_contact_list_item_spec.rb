require 'rails_helper'

RSpec.describe GtiContactListItem do
  let(:list) { create(:gti_contact_list) }

  it 'stores the number as digits only' do
    item = create(:gti_contact_list_item, contact_list: list, number: '+55 (11) 99000-1234')

    expect(item.number).to eq('5511990001234')
  end

  it 'does not repeat a number in the same list' do
    create(:gti_contact_list_item, contact_list: list, number: '5511990001234')

    expect(build(:gti_contact_list_item, contact_list: list, number: '5511990001234')).not_to be_valid
  end

  it 'keeps the list count up to date' do
    create(:gti_contact_list_item, contact_list: list)

    expect(list.reload.items_count).to eq(1)
  end
end
