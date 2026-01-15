# frozen_string_literal: true

require "net/http"
require "json"

class SttService
  class SttError < StandardError; end
  class ApiError < SttError; end
  class TimeoutError < SttError; end
  class InvalidAudioError < SttError; end

  SUPPORTED_FORMATS = %w[audio/webm audio/wav audio/mp3 audio/ogg audio/webm;codecs=opus].freeze
  MAX_AUDIO_SIZE = 25.megabytes
  DEFAULT_TIMEOUT = 60

  def initialize(api_key: nil)
    @api_key = api_key || ENV.fetch("OPENAI_API_KEY", nil)
  end

  def transcribe(audio_data, content_type: "audio/webm", language: "en")
    validate_audio!(audio_data, content_type)

    response = call_stt_api(audio_data, content_type, language)
    parse_response(response)
  rescue Timeout::Error
    raise TimeoutError, "STT API request timed out"
  rescue SttError
    raise
  rescue StandardError => e
    raise ApiError, "STT API error: #{e.message}"
  end

  private

  def validate_audio!(audio_data, content_type)
    raise InvalidAudioError, "Audio data is required" if audio_data.blank?
    raise InvalidAudioError, "Audio data is too large (max #{MAX_AUDIO_SIZE / 1.megabyte}MB)" if audio_data.bytesize > MAX_AUDIO_SIZE

    base_content_type = content_type.split(";").first
    raise InvalidAudioError, "Unsupported audio format: #{content_type}" unless SUPPORTED_FORMATS.any? { |f| f.start_with?(base_content_type) }
  end

  def call_stt_api(audio_data, content_type, language)
    if Rails.env.test? || ENV["STT_MOCK_ENABLED"] == "true"
      mock_transcription(audio_data, language)
    else
      openai_whisper_api(audio_data, content_type, language)
    end
  end

  def mock_transcription(_audio_data, language)
    {
      "text" => "Hello, this is a test transcription.",
      "language" => language
    }
  end

  def openai_whisper_api(audio_data, content_type, language)
    uri = URI.parse("https://api.openai.com/v1/audio/transcriptions")

    boundary = "----WebKitFormBoundary#{SecureRandom.hex(16)}"

    # Determine file extension from content type
    extension = case content_type.split(";").first
    when "audio/webm" then "webm"
    when "audio/wav" then "wav"
    when "audio/mp3" then "mp3"
    when "audio/ogg" then "ogg"
    else "webm"
    end

    body = build_multipart_body(boundary, audio_data, extension, language)

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = DEFAULT_TIMEOUT
    http.read_timeout = DEFAULT_TIMEOUT

    request = Net::HTTP::Post.new(uri.path)
    request["Authorization"] = "Bearer #{@api_key}"
    request["Content-Type"] = "multipart/form-data; boundary=#{boundary}"
    request.body = body

    response = http.request(request)

    unless response.is_a?(Net::HTTPSuccess)
      error_body = JSON.parse(response.body) rescue { "error" => response.body }
      raise ApiError, "OpenAI API returned #{response.code}: #{error_body["error"]&.dig("message") || response.body}"
    end

    JSON.parse(response.body)
  end

  def build_multipart_body(boundary, audio_data, extension, language)
    parts = []

    # File field
    parts << "--#{boundary}\r\n"
    parts << "Content-Disposition: form-data; name=\"file\"; filename=\"audio.#{extension}\"\r\n"
    parts << "Content-Type: audio/#{extension}\r\n\r\n"
    parts << audio_data.to_s
    parts << "\r\n"

    # Model field
    parts << "--#{boundary}\r\n"
    parts << "Content-Disposition: form-data; name=\"model\"\r\n\r\n"
    parts << "whisper-1"
    parts << "\r\n"

    # Language field
    parts << "--#{boundary}\r\n"
    parts << "Content-Disposition: form-data; name=\"language\"\r\n\r\n"
    parts << language.to_s
    parts << "\r\n"

    parts << "--#{boundary}--\r\n"
    parts.join
  end

  def parse_response(response)
    raise ApiError, "Invalid response format" unless response.is_a?(Hash)
    raise ApiError, response["error"]["message"] if response["error"].present?

    {
      text: response["text"],
      confidence: 1.0,
      language: response["language"] || "en",
      duration: response["duration"]
    }
  end
end
