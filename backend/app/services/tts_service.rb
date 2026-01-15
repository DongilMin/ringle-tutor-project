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
  DEFAULT_VOICE = "alloy"
  DEFAULT_MODEL = "tts-1"
  DEFAULT_FORMAT = "mp3"

  SUPPORTED_VOICES = %w[alloy echo fable onyx nova shimmer].freeze

  def initialize(api_key: nil)
    @api_key = api_key || ENV.fetch("OPENAI_API_KEY", nil)
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

  # ... validations remain same ...
  def validate_text!(text)
    raise InvalidTextError, "Text is required" if text.blank?
    raise InvalidTextError, "Text is too long (max #{MAX_TEXT_LENGTH} characters)" if text.length > MAX_TEXT_LENGTH
  end

  def validate_voice!(voice)
    return if SUPPORTED_VOICES.include?(voice)
    # Fallback to default if unsupported, or raise error. 
    # For robustness, let's allow it but warn, or just restrict.
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
    # Return mock binary data
    {
      body: "mock_binary_audio_data_#{text[0..10]}",
      format: format
    }
  end

  def real_api_call(text, voice, format)
    uri = URI.parse("https://api.openai.com/v1/audio/speech")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = DEFAULT_TIMEOUT
    http.read_timeout = DEFAULT_TIMEOUT

    request = Net::HTTP::Post.new(uri.path)
    request["Authorization"] = "Bearer #{@api_key}"
    request["Content-Type"] = "application/json"
    
    # OpenAI TTS request body
    request.body = {
      model: DEFAULT_MODEL,
      input: text,
      voice: voice,
      response_format: format
    }.to_json

    response = http.request(request)

    unless response.is_a?(Net::HTTPSuccess)
      error_body = JSON.parse(response.body) rescue { "error" => response.body }
      raise ApiError, "OpenAI API returned #{response.code}: #{error_body}"
    end

    # Return the response object directly as it contains the binary body
    response
  end

  def parse_response(response, format)
    # If it's a mock response (Hash)
    if response.is_a?(Hash)
      return {
        audio_data: response[:body],
        content_type: "audio/#{format}",
        duration: nil # Duration not easily available from binary without inspection
      }
    end

    # Real API response (Net::HTTPResponse)
    {
      audio_data: response.body,
      content_type: "audio/#{format}",
      duration: nil
    }
  end
end
