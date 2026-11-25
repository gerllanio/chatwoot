# Adds the rows of a CSV (header: name, number, email; number required) to a GTI contact
# list. Headers are matched loosely so a Ticketz export (nome/numero) works as well.
require 'csv'

class Gti::ContactListImportService
  NAME_HEADERS = %w[name nome].freeze
  NUMBER_HEADERS = %w[number numero número phone telefone whatsapp].freeze
  EMAIL_HEADERS = %w[email e-mail].freeze
  BYTE_ORDER_MARK = "\uFEFF".freeze

  pattr_initialize [:list!, :csv!, :max_rows!]

  def perform
    imported = 0
    skipped = 0
    rows.first(max_rows).each do |row|
      item = list.items.new(account_id: list.account_id, name: value(row, NAME_HEADERS),
                            number: value(row, NUMBER_HEADERS), email: value(row, EMAIL_HEADERS))
      item.save ? imported += 1 : skipped += 1
    end
    { imported: imported, skipped: skipped }
  end

  private

  def rows
    CSV.parse(csv.to_s.delete_prefix(BYTE_ORDER_MARK), headers: true, header_converters: ->(header) { header.to_s.strip.downcase })
  end

  def value(row, headers)
    headers.lazy.map { |header| row[header] }.find(&:present?)&.strip
  end
end
