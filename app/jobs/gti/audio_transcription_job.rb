# Transcribes a new audio attachment with Groq (see Gti::GroqTranscriptionService).
# The social-media ingest path saves the attachment before its blob is attached, so a
# missing file is retried for a short while instead of failing the job.
class Gti::AudioTranscriptionJob < ApplicationJob
  queue_as :low

  retry_on ActiveStorage::FileNotFoundError, wait: 5.seconds, attempts: 3
  retry_on Gti::GroqTranscriptionService::TranscriptionError, wait: :polynomially_longer, attempts: 3
  discard_on ActiveRecord::RecordNotFound

  def perform(attachment_id)
    Gti::GroqTranscriptionService.new(Attachment.find(attachment_id)).perform
  end
end
