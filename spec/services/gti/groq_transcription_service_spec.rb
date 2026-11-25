require 'rails_helper'

RSpec.describe Gti::GroqTranscriptionService do
  let(:endpoint) { described_class::ENDPOINT }
  let(:message) { create(:message) }
  let(:attachment) do
    attachment = message.attachments.new(account_id: message.account_id, file_type: :audio)
    attachment.file.attach(io: Rails.root.join('spec/assets/sample.mp3').open, filename: 'sample.mp3', content_type: 'audio/mpeg')
    attachment.save!
    attachment
  end

  around do |example|
    with_modified_env(GROQ_API_KEY: 'gsk_test') { example.run }
  end

  describe '.enabled?' do
    it 'is on when a Groq key is configured' do
      expect(described_class.enabled?).to be(true)
    end

    it 'is off without a Groq key' do
      with_modified_env(GROQ_API_KEY: '') do
        expect(described_class.enabled?).to be(false)
      end
    end
  end

  describe '#perform' do
    it 'stores the transcription where the audio bubble reads it and broadcasts the message' do
      stub_request(:post, endpoint)
        .with(headers: { 'Authorization' => 'Bearer gsk_test' })
        .to_return(status: 200, body: { text: ' Bom dia, o sistema caiu. ' }.to_json)
      allow(attachment.message).to receive(:send_update_event)

      described_class.new(attachment).perform

      expect(attachment.reload.meta['transcribed_text']).to eq('Bom dia, o sistema caiu.')
      expect(attachment.push_event_data[:transcribed_text]).to eq('Bom dia, o sistema caiu.')
    end

    it 'sends the Portuguese language hint and the Whisper turbo model' do
      request = stub_request(:post, endpoint).to_return(status: 200, body: { text: 'oi' }.to_json)

      described_class.new(attachment).perform

      expect(request.with { |req| req.body.include?('whisper-large-v3-turbo') && req.body.include?('name="language"') }).to have_been_made
    end

    it 'does not call Groq again for an audio that already has a transcription' do
      attachment.update!(meta: { 'transcribed_text' => 'já transcrito' })

      described_class.new(attachment).perform

      expect(a_request(:post, endpoint)).not_to have_been_made
    end

    it 'skips attachments that are not audio' do
      attachment.update!(file_type: :image)

      described_class.new(attachment).perform

      expect(a_request(:post, endpoint)).not_to have_been_made
    end

    it 'raises so the job can retry when Groq rejects the request' do
      stub_request(:post, endpoint).to_return(status: 429, body: '{"error":"rate limit"}')

      expect { described_class.new(attachment).perform }
        .to raise_error(described_class::TranscriptionError, /429/)
      expect(attachment.reload.meta.to_h['transcribed_text']).to be_nil
    end
  end
end
