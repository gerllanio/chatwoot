require 'rails_helper'

RSpec.describe Gti::Mailbox::SendService do
  let(:channel) do
    create(:channel_email, :imap_email, smtp_enabled: true, smtp_address: 'smtp.example.com', smtp_port: 587,
                                        smtp_login: 'care@example.com', smtp_password: 'secret')
  end
  let(:inbox) { channel.inbox }
  let(:imap_client) { instance_double(Gti::Mailbox::ImapClient, append_sent: nil) }

  before do
    allow(Gti::Mailbox::ImapClient).to receive(:open).and_yield(imap_client)
    allow_any_instance_of(Mail::Message).to receive(:deliver) # rubocop:disable RSpec/AnyInstance
  end

  it 'builds a threaded reply from the inbox address and keeps a sent copy' do
    params = { to: 'ana@cliente.com.br', subject: 'Re: Orçamento', body: "Olá Ana\nSegue",
               in_reply_to: 'abc@cliente.com.br', references: 'old@cliente.com.br' }
    mail = described_class.new(inbox: inbox, params: params).perform

    expect(mail.from).to eq([channel.email])
    expect(mail.to).to eq(['ana@cliente.com.br'])
    expect(mail.in_reply_to).to eq('abc@cliente.com.br')
    expect(mail.references).to eq(['old@cliente.com.br', 'abc@cliente.com.br'])
    expect(mail.html_part.body.to_s).to include('Olá Ana<br>Segue')
    expect(imap_client).to have_received(:append_sent)
  end

  it 'refuses inboxes without SMTP' do
    channel.update!(smtp_enabled: false)

    expect { described_class.new(inbox: inbox, params: { to: 'a@b.com' }).perform }
      .to raise_error(Gti::Mailbox::ImapClient::Error)
  end
end
