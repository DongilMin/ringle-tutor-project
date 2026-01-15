# frozen_string_literal: true

require "net/http"
require "json"

class LlmService
  class LlmError < StandardError; end
  class ApiError < LlmError; end
  class RateLimitError < LlmError; end
  class InvalidPromptError < LlmError; end

  DEFAULT_MODEL = "gpt-4o-mini"
  MAX_TOKENS = 2048
  DEFAULT_TIMEOUT = 60

  SYSTEM_PROMPT = <<~PROMPT
    You are Ringle AI Tutor, a friendly and professional English conversation coach.

    ## Your Teaching Style
    - Speak naturally like a native English speaker having a real conversation
    - Keep responses concise (2-3 sentences max) to encourage user participation
    - Be warm, encouraging, and supportive - celebrate progress!
    - Ask follow-up questions to keep the conversation flowing

    ## Topic Consistency Rules
    - Stay focused on the current conversation topic
    - If the user introduces a new topic, smoothly transition while acknowledging the change
    - Periodically reference earlier parts of the conversation to show you're engaged
    - Don't abruptly change subjects unless the user does

    ## Language Correction Guidelines
    - Only correct significant errors that affect meaning or sound unnatural
    - Use gentle, implicit corrections by naturally rephrasing what the user said
    - Example: If user says "I goed to store", respond "Oh, you went to the store! What did you buy?"
    - Don't over-correct minor mistakes - fluency over perfection
    - Save explicit grammar explanations for repeated errors

    ## Response Format
    - Respond directly to what the user said
    - Include a natural follow-up question when appropriate
    - Keep the conversation balanced - don't dominate with long explanations

    Remember: Your goal is to build the user's confidence in speaking English naturally.
  PROMPT

  def initialize(api_key: nil, model: DEFAULT_MODEL)
    @api_key = api_key || ENV.fetch("OPENAI_API_KEY", nil)
    @model = model
    @conversation_history = []
  end

  def chat(user_message, context: [])
    validate_message!(user_message)

    @conversation_history = context if context.present?
    @conversation_history << { role: "user", content: user_message }

    response = call_openai_api
    assistant_message = parse_response(response)

    @conversation_history << { role: "assistant", content: assistant_message }

    {
      message: assistant_message,
      conversation_history: @conversation_history
    }
  end

  def clear_history
    @conversation_history = []
  end

  attr_reader :conversation_history

  private

  def validate_message!(message)
    raise InvalidPromptError, "Message cannot be blank" if message.blank?
    raise InvalidPromptError, "Message is too long (max 10000 characters)" if message.length > 10_000
  end

  def call_openai_api
    uri = URI.parse("https://api.openai.com/v1/chat/completions")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.verify_mode = OpenSSL::SSL::VERIFY_PEER
    http.cert_store = OpenSSL::X509::Store.new
    http.cert_store.set_default_paths
    http.open_timeout = DEFAULT_TIMEOUT
    http.read_timeout = DEFAULT_TIMEOUT

    request = Net::HTTP::Post.new(uri.path)
    request["Authorization"] = "Bearer #{@api_key}"
    request["Content-Type"] = "application/json"
    request.body = build_request_body.to_json

    response = http.request(request)
    handle_response_errors(response)
    JSON.parse(response.body)
  end

  def build_request_body
    {
      model: @model,
      messages: build_messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.7
    }
  end

  def build_messages
    messages = [
      { role: "system", content: SYSTEM_PROMPT }
    ]

    @conversation_history.each do |msg|
      messages << { role: msg[:role], content: msg[:content] }
    end

    messages
  end

  def handle_response_errors(response)
    case response.code.to_i
    when 200..299 then nil
    when 429 then raise RateLimitError, "API rate limit exceeded"
    when 400..499
      error_body = JSON.parse(response.body) rescue { "error" => response.body }
      raise ApiError, "Client error: #{error_body.dig("error", "message") || response.body}"
    when 500..599 then raise ApiError, "Server error: #{response.body}"
    else raise ApiError, "Unexpected response: #{response.code}"
    end
  end

  def parse_response(response)
    text = response.dig("choices", 0, "message", "content")
    raise ApiError, "Empty response from API" if text.blank?

    text
  end
end
