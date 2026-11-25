require 'rails_helper'

RSpec.describe Gti::Mailbox::ImapClient do
  let(:channel) { create(:channel_email, :imap_email) }
  let(:imap) { instance_double(Net::IMAP, logout: nil, disconnect: nil, authenticate: nil) }
  let(:inbox_entry) { Net::IMAP::MailboxList.new([:Hasnochildren], '/', 'INBOX') }
  let(:trash_entry) { Net::IMAP::MailboxList.new([:Trash], '/', 'Lixeira') }
  let(:noselect_entry) { Net::IMAP::MailboxList.new([:Noselect], '/', '[Gmail]') }

  before do
    allow(Net::IMAP).to receive(:new).and_return(imap)
    allow(imap).to receive(:list).with('', '*').and_return([inbox_entry, trash_entry, noselect_entry])
  end

  it 'lists selectable folders with unread counts and special use' do
    allow(imap).to receive(:status).with('INBOX', ['UNSEEN']).and_return('UNSEEN' => 3)
    allow(imap).to receive(:status).with('Lixeira', ['UNSEEN']).and_return('UNSEEN' => 0)

    folders = described_class.open(channel, &:folders)

    expect(folders.pluck(:path)).to eq(%w[INBOX Lixeira])
    expect(folders.first[:unseen]).to eq(3)
    expect(folders.last[:special_use]).to eq('trash')
    expect(imap).to have_received(:logout)
  end

  it 'returns the newest page of message headers, newest first' do
    envelope = Net::IMAP::Envelope.new('Mon, 24 Nov 2026 10:00:00 -0300', '=?UTF-8?B?T3LDp2FtZW50bw==?=',
                                       [Net::IMAP::Address.new('Ana', nil, 'ana', 'cliente.com.br')])
    rows = [11, 12].map do |uid|
      Net::IMAP::FetchData.new(uid, 'UID' => uid, 'ENVELOPE' => envelope, 'FLAGS' => uid == 12 ? [:Seen] : [])
    end
    allow(imap).to receive(:examine).with('INBOX')
    allow(imap).to receive(:uid_search).with(['ALL']).and_return([10, 11, 12])
    allow(imap).to receive(:uid_fetch).and_return(rows)

    messages = described_class.open(channel) { |client| client.messages('INBOX') }

    expect(messages.pluck(:uid)).to eq([12, 11])
    expect(messages.first).to include(subject: 'Orçamento', from_email: 'ana@cliente.com.br', seen: true)
    expect(messages.last[:seen]).to be(false)
  end

  it 'moves deleted messages to the trash folder' do
    allow(imap).to receive(:select).with('INBOX')
    allow(imap).to receive(:capable?).with('MOVE').and_return(true)
    allow(imap).to receive(:uid_move)

    described_class.open(channel) { |client| client.delete('INBOX', '12') }

    expect(imap).to have_received(:uid_move).with(12, 'Lixeira')
  end

  it 'expunges a message deleted from the trash itself' do
    allow(imap).to receive(:select).with('Lixeira')
    allow(imap).to receive(:uid_store)
    allow(imap).to receive(:expunge)

    described_class.open(channel) { |client| client.delete('Lixeira', 7) }

    expect(imap).to have_received(:uid_store).with(7, '+FLAGS', [:Deleted])
    expect(imap).to have_received(:expunge)
  end

  it 'reports connection failures as a client error' do
    allow(Net::IMAP).to receive(:new).and_raise(Net::OpenTimeout, 'execution expired')

    expect { described_class.open(channel, &:folders) }.to raise_error(described_class::Error, /execution expired/)
  end

  it 'refuses inboxes without IMAP' do
    channel.update!(imap_enabled: false)

    expect { described_class.open(channel, &:folders) }.to raise_error(described_class::Error)
  end
end
