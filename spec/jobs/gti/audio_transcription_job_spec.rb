require 'rails_helper'

RSpec.describe Gti::AudioTranscriptionJob do
  let(:message) { create(:message) }

  def build_audio_attachment
    attachment = message.attachments.new(account_id: message.account_id, file_type: :audio)
    attachment.file.attach(io: Rails.root.join('spec/assets/sample.mp3').open, filename: 'sample.mp3', content_type: 'audio/mpeg')
    attachment
  end

  it 'is enqueued once for a new audio attachment when Groq is configured' do
    with_modified_env(GROQ_API_KEY: 'gsk_test') do
      expect { build_audio_attachment.save! }.to have_enqueued_job(described_class).once
    end
  end

  it 'is not enqueued without a Groq key' do
    with_modified_env(GROQ_API_KEY: '') do
      expect { build_audio_attachment.save! }.not_to have_enqueued_job(described_class)
    end
  end

  it 'runs the Groq transcription for the attachment' do
    attachment = build_audio_attachment
    attachment.save!
    service = instance_double(Gti::GroqTranscriptionService, perform: nil)
    allow(Gti::GroqTranscriptionService).to receive(:new).with(attachment).and_return(service)

    described_class.perform_now(attachment.id)

    expect(service).to have_received(:perform)
  end
end
