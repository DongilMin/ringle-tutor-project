# frozen_string_literal: true

require "net/http"
require "json"

class LlmService
  class LlmError < StandardError; end
  class ApiError < LlmError; end
  class RateLimitError < LlmError; end
  class InvalidPromptError < LlmError; end

  DEFAULT_MODEL = "gemini-1.5-flash"
  MAX_TOKENS = 2048
  DEFAULT_TIMEOUT = 60

  SYSTEM_PROMPT = <<~PROMPT
    You are an AI English tutor helping users practice English conversation.
    Your role is to:
    1. Engage in natural conversation with the user
    2. Gently correct grammar and pronunciation mistakes
    3. Suggest better ways to express ideas
    4. Keep responses concise and conversational (2-3 sentences)
    5. Be encouraging and supportive

    Respond naturally as if you're having a real conversation.
  PROMPT

  def initialize(api_key: nil, model: DEFAULT_MODEL)
    @api_key = api_key || ENV.fetch("GEMINI_API_KEY", nil)
    @model = model
    @conversation_history = []
  end

  def chat(user_message, context: [])
    validate_message!(user_message)

    @conversation_history = context if context.present?
    @conversation_history << { role: "user", content: user_message }

    response = call_gemini_api
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

  def call_gemini_api
    if Rails.env.test? || ENV["LLM_MOCK_ENABLED"] == "true"
      mock_response
    else
      real_api_call
    end
  end

  def mock_response
    last_user_message = @conversation_history.last[:content]

    {
      "candidates" => [
        {
          "content" => {
            "parts" => [
              { "text" => generate_mock_reply(last_user_message) }
            ]
          }
        }
      ]
    }
  end

  def generate_mock_reply(user_message)
    if user_message.downcase.include?("hello") || user_message.downcase.include?("hi")
      "Hello! Great to see you. What would you like to practice today?"
    elsif user_message.downcase.include?("thank")
      "You're welcome! Keep up the great work with your English practice."
    else
      "That's a great point! Let me help you express that more naturally."
    end
  end

  def real_api_call
    uri = URI.parse(gemini_endpoint)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = DEFAULT_TIMEOUT
    http.read_timeout = DEFAULT_TIMEOUT

    request = Net::HTTP::Post.new("#{uri.path}?key=#{@api_key}")
    request["Content-Type"] = "application/json"
    request.body = build_request_body.to_json

    response = http.request(request)
    handle_response_errors(response)
    JSON.parse(response.body)
  end

  def build_request_body
    {
      contents: build_contents,
      generationConfig: {
        maxOutputTokens: MAX_TOKENS,
        temperature: 0.7
      }
    }
  end

  def build_contents
    contents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "I understand. I'm ready to help with English practice." }] }
    ]

    @conversation_history.each do |msg|
      role = msg[:role] == "assistant" ? "model" : "user"
      contents << { role: role, parts: [{ text: msg[:content] }] }
    end

    contents
  end

  def gemini_endpoint
    "https://generativelanguage.googleapis.com/v1beta/models/#{@model}:generateContent"
  end

  def handle_response_errors(response)
    case response.code.to_i
    when 200..299 then nil
    when 429 then raise RateLimitError, "API rate limit exceeded"
    when 400..499 then raise ApiError, "Client error: #{response.body}"
    when 500..599 then raise ApiError, "Server error: #{response.body}"
    else raise ApiError, "Unexpected response: #{response.code}"
    end
  end

  def parse_response(response)
    text = response.dig("candidates", 0, "content", "parts", 0, "text")
    raise ApiError, "Empty response from API" if text.blank?

    text
  end
end
