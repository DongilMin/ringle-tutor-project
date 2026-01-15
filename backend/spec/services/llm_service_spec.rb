# frozen_string_literal: true

require "rails_helper"

RSpec.describe LlmService do
  subject(:service) { described_class.new(api_key: "test_key") }

  let(:openai_response) do
    {
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello! How can I help you with your English practice today?"
          }
        }
      ]
    }
  end

  describe "#chat" do
    context "with valid message" do
      before do
        stub_request(:post, "https://api.openai.com/v1/chat/completions")
          .to_return(
            status: 200,
            body: openai_response.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "returns response with message" do
        result = service.chat("Hello, how are you?")

        expect(result[:message]).to be_present
        expect(result[:conversation_history]).to be_an(Array)
      end

      it "maintains conversation history" do
        service.chat("Hello")
        result = service.chat("Tell me more")

        expect(result[:conversation_history].length).to eq(4)
      end

      it "responds with AI message" do
        result = service.chat("Hello!")

        expect(result[:message]).to include("Hello")
      end
    end

    context "with context" do
      before do
        stub_request(:post, "https://api.openai.com/v1/chat/completions")
          .to_return(
            status: 200,
            body: openai_response.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "uses provided context" do
        context = [ { role: "user", content: "Previous message" } ]
        result = service.chat("New message", context: context)

        expect(result[:conversation_history].first[:content]).to eq("Previous message")
      end
    end

    context "with invalid message" do
      it "raises error when message is blank" do
        expect { service.chat(nil) }
          .to raise_error(LlmService::InvalidPromptError, "Message cannot be blank")
      end

      it "raises error when message is empty" do
        expect { service.chat("") }
          .to raise_error(LlmService::InvalidPromptError, "Message cannot be blank")
      end

      it "raises error when message is too long" do
        long_message = "x" * 10_001

        expect { service.chat(long_message) }
          .to raise_error(LlmService::InvalidPromptError, /too long/)
      end
    end
  end

  describe "#clear_history" do
    before do
      stub_request(:post, "https://api.openai.com/v1/chat/completions")
        .to_return(
          status: 200,
          body: openai_response.to_json,
          headers: { "Content-Type" => "application/json" }
        )
    end

    it "clears conversation history" do
      service.chat("Hello")
      service.clear_history

      expect(service.conversation_history).to be_empty
    end
  end

  describe "configuration" do
    it "uses default model" do
      expect(service.instance_variable_get(:@model)).to eq("gpt-4o-mini")
    end

    it "allows custom model" do
      custom_service = described_class.new(api_key: "key", model: "gpt-4")

      expect(custom_service.instance_variable_get(:@model)).to eq("gpt-4")
    end
  end

  describe "error handling" do
    it "handles rate limit errors" do
      stub_request(:post, "https://api.openai.com/v1/chat/completions")
        .to_return(status: 429, body: { error: { message: "Rate limit exceeded" } }.to_json)

      expect { service.chat("Hello") }
        .to raise_error(LlmService::RateLimitError, /rate limit/i)
    end

    it "handles API errors" do
      stub_request(:post, "https://api.openai.com/v1/chat/completions")
        .to_return(
          status: 400,
          body: { error: { message: "Invalid request" } }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      expect { service.chat("Hello") }
        .to raise_error(LlmService::ApiError, /Invalid request/)
    end
  end
end
