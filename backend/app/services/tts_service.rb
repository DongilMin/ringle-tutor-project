# frozen_string_literal: true

require "net/http"
require "json"
require "base64"

class TtsService
  class TtsError < StandardError; end
  class ApiError < TtsError; end
  class TimeoutError < TtsError; end
  class InvalidTextError < TtsError; end

  MAX_TEXT_LENGTH = 5000
  DEFAULT_TIMEOUT = 30
  DEFAULT_VOICE = "en-US-Standard-A"
  DEFAULT_FORMAT = "audio/mp3"

  SUPPORTED_VOICES = %w[
    en-US-Standard-A en-US-Standard-B en-US-Standard-C
    en-GB-Standard-A en-GB-Standard-B
  ].freeze

  def initialize(api_key: nil)
    @api_key = api_key || ENV.fetch("TTS_API_KEY", nil)
  end

  def synthesize(text, voice: DEFAULT_VOICE, format: DEFAULT_FORMAT)
    validate_text!(text)
    validate_voice!(voice)

    response = call_tts_api(text, voice, format)
    parse_response(response, format)
  rescue Timeout::Error
    raise TimeoutError, "TTS API request timed out"
  rescue TtsError
    raise
  rescue StandardError => e
    raise ApiError, "TTS API error: #{e.message}"
  end

  private

  def validate_text!(text)
    raise InvalidTextError, "Text is required" if text.blank?
    raise InvalidTextError, "Text is too long (max #{MAX_TEXT_LENGTH} characters)" if text.length > MAX_TEXT_LENGTH
  end

  def validate_voice!(voice)
    return if SUPPORTED_VOICES.include?(voice)

    raise InvalidTextError, "Unsupported voice: #{voice}"
  end

  def call_tts_api(text, voice, format)
    if Rails.env.test? || ENV["TTS_MOCK_ENABLED"] == "true"
      mock_synthesis(text, voice, format)
    else
      real_api_call(text, voice, format)
    end
  end

  def mock_synthesis(text, voice, format)
    {
      "success" => true,
      "audio_data" => Base64.strict_encode64("mock_audio_data_#{text[0..20]}"),
      "format" => format,
      "voice" => voice,
      "duration" => (text.length * 0.05).round(2)
    }
  end

  def real_api_call(text, voice, format)
    uri = URI.parse(tts_endpoint)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = DEFAULT_TIMEOUT
    http.read_timeout = DEFAULT_TIMEOUT

    request = Net::HTTP::Post.new(uri.path)
    request["Authorization"] = "Bearer #{@api_key}"
    request["Content-Type"] = "application/json"
    request.body = {
      text: text,
      voice: voice,
      format: format
    }.to_json

    response = http.request(request)

    raise ApiError, "API returned #{response.code}: #{response.body}" unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  end

  def tts_endpoint
    ENV.fetch("TTS_API_ENDPOINT", "https://api.tts-provider.com/v1/synthesize")
  end

  def parse_response(response, format)
    raise ApiError, "Invalid response format" unless response.is_a?(Hash)
    raise ApiError, response["error"] if response["error"].present?

    audio_data = response["audio_data"]
    raise ApiError, "No audio data in response" if audio_data.blank?

    {
      audio_data: Base64.strict_decode64(audio_data),
      format: format,
      duration: response["duration"],
      content_type: format
    }
  end
end
