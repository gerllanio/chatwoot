# GTI "Work": transcribes incoming and outgoing audio with Groq when GROQ_API_KEY is set
# (see Gti::GroqTranscriptionService).
module GtiAudioTranscription
  extend ActiveSupport::Concern

  included do
    after_create_commit :enqueue_gti_audio_transcription
  end

  private

  def enqueue_gti_audio_transcription
    return unless audio? && Gti::GroqTranscriptionService.enabled?
    # The conversation autosave can commit a new attachment twice; one job is enough.
    return if @gti_audio_transcription_enqueued

    @gti_audio_transcription_enqueued = true
    Gti::AudioTranscriptionJob.perform_later(id)
  end
end
