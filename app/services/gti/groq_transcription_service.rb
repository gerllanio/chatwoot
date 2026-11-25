# Transcribes an audio attachment with Groq's Whisper endpoint (OpenAI-compatible) and
# stores the text in `meta['transcribed_text']`, the key the dashboard's audio bubble
# already renders. Used by the GTI "Work" install, which has no Enterprise plan.
#
# Enabled by setting GROQ_API_KEY. GROQ_TRANSCRIPTION_MODEL and
# GROQ_TRANSCRIPTION_LANGUAGE are optional.
class Gti::GroqTranscriptionService
  ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'.freeze
  DEFAULT_MODEL = 'whisper-large-v3-turbo'.freeze
  DEFAULT_LANGUAGE = 'pt'.freeze
  # Groq's free tier accepts files up to 25 MB.
  MAX_FILE_SIZE = 25.megabytes
  REQUEST_TIMEOUT = 60
  OPEN_TIMEOUT = 10

  class TranscriptionError < StandardError; end

  def self.enabled?
    ENV.fetch('GROQ_API_KEY', '').present? && !ChatwootApp.enterprise?
  end

  def initialize(attachment)
    @attachment = attachment
  end

  def perform
    return if skip?

    text = transcribe
    return if text.blank?

    @attachment.update!(meta: (@attachment.meta || {}).merge('transcribed_text' => text))
    @attachment.message.reload.send_update_event
  end

  private

  def skip?
    return true unless @attachment.audio?
    return true if @attachment.meta.to_h['transcribed_text'].present?
    return true unless @attachment.file.attached?

    @attachment.file.blob.byte_size > MAX_FILE_SIZE
  end

  def transcribe
    blob = @attachment.file.blob
    blob.open do |file|
      response = connection.post(ENDPOINT, request_payload(file, blob)) do |request|
        request.headers['Authorization'] = "Bearer #{ENV.fetch('GROQ_API_KEY')}"
      end
      raise TranscriptionError, "Groq answered #{response.status}: #{response.body}" unless response.success?

      JSON.parse(response.body)['text'].to_s.strip
    end
  end

  def request_payload(file, blob)
    {
      model: ENV.fetch('GROQ_TRANSCRIPTION_MODEL', DEFAULT_MODEL),
      language: ENV.fetch('GROQ_TRANSCRIPTION_LANGUAGE', DEFAULT_LANGUAGE),
      response_format: 'json',
      file: Faraday::Multipart::FilePart.new(file, blob.content_type || 'audio/ogg', blob.filename.to_s)
    }
  end

  def connection
    Faraday.new do |faraday|
      faraday.request :multipart
      faraday.options.timeout = REQUEST_TIMEOUT
      faraday.options.open_timeout = OPEN_TIMEOUT
    end
  end
end
