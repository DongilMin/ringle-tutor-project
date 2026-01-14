# frozen_string_literal: true

require "net/http"
require "json"

class SttService
  class SttError < StandardError; end
  class ApiError < SttError; end
  class TimeoutError < SttError; end
  class InvalidAudioError < SttError; end

  SUPPORTED_FORMATS = %w[audio/webm audio/wav audio/mp3 audio/ogg].freeze
  MAX_AUDIO_SIZE = 10.megabytes
  DEFAULT_TIMEOUT = 30

  def initialize(api_key: nil)
    @api_key = api_key || ENV.fetch("STT_API_KEY", nil)
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
    raise InvalidAudioError, "Unsupported audio format: #{content_type}" unless SUPPORTED_FORMATS.include?(content_type)
  end

  def call_stt_api(audio_data, content_type, language)
    if Rails.env.test? || ENV["STT_MOCK_ENABLED"] == "true"
      mock_transcription(audio_data, language)
    else
      real_api_call(audio_data, content_type, language)
    end
  end

  def mock_transcription(_audio_data, language)
    {
      "success" => true,
      "text" => "Hello, this is a test transcription.",
      "language" => language,
      "confidence" => 0.95,
      "duration" => 2.5
    }
  end

  def real_api_call(audio_data, content_type, language)
    uri = URI.parse(stt_endpoint)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = DEFAULT_TIMEOUT
    http.read_timeout = DEFAULT_TIMEOUT

    request = Net::HTTP::Post.new(uri.path)
    request["Authorization"] = "Bearer #{@api_key}"
    request["Content-Type"] = content_type
    request["X-Language"] = language
    request.body = audio_data

    response = http.request(request)

    raise ApiError, "API returned #{response.code}: #{response.body}" unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  end

  def stt_endpoint
    ENV.fetch("STT_API_ENDPOINT", "https://api.stt-provider.com/v1/transcribe")
  end

  def parse_response(response)
    raise ApiError, "Invalid response format" unless response.is_a?(Hash)
    raise ApiError, response["error"] if response["error"].present?

    {
      text: response["text"],
      confidence: response["confidence"],
      language: response["language"],
      duration: response["duration"]
    }
  end
end
