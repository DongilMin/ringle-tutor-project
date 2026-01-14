# frozen_string_literal: true

require "rails_helper"

RSpec.describe LlmService do
  subject(:service) { described_class.new(api_key: "test_key") }

  describe "#chat" do
    context "with valid message" do
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

      it "responds appropriately to greetings" do
        result = service.chat("Hello!")

        expect(result[:message]).to include("Hello")
      end

      it "responds appropriately to thanks" do
        result = service.chat("Thank you!")

        expect(result[:message]).to include("welcome")
      end
    end

    context "with context" do
      it "uses provided context" do
        context = [{ role: "user", content: "Previous message" }]
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
    it "clears conversation history" do
      service.chat("Hello")
      service.clear_history

      expect(service.conversation_history).to be_empty
    end
  end

  describe "configuration" do
    it "uses default model" do
      expect(service.instance_variable_get(:@model)).to eq("gemini-1.5-flash")
    end

    it "allows custom model" do
      custom_service = described_class.new(api_key: "key", model: "gemini-1.5-pro")

      expect(custom_service.instance_variable_get(:@model)).to eq("gemini-1.5-pro")
    end
  end
end
