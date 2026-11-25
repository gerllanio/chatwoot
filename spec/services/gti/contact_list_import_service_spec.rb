require 'rails_helper'

RSpec.describe Gti::ContactListImportService do
  let(:list) { create(:gti_contact_list) }

  it 'reads a Latin-1 CSV saved by Excel' do
    csv = "nome,numero\nJoão,5511990003333\n".encode(Encoding::ISO_8859_1).force_encoding(Encoding::BINARY)

    result = described_class.new(list: list, csv: csv, max_rows: 10).perform

    expect(result).to eq(imported: 1, skipped: 0)
    expect(list.items.pluck(:name)).to eq(['João'])
  end
end
