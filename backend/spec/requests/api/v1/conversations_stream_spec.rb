# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Conversations Stream", type: :request do
  let(:user) { create(:user) }
  let(:conversation) { create(:conversation, user: user) }

  before do
    # Create active membership for user
    create(:membership, :premium, user: user)
  end

  describe "POST /api/v1/conversations/:id/stream" do
    it "returns SSE content type" do
      allow_any_instance_of(LlmService).to receive(:chat_stream).and_yield("Hello")
      allow_any_instance_of(TtsService).to receive(:synthesize).and_return({
        audio_data: "mock_audio",
        content_type: "audio/mpeg"
      })

      post "/api/v1/conversations/#{conversation.id}/stream",
        params: { message: { content: "Hi there" }, user_id: user.id },
        as: :json

      expect(response.content_type).to include("text/event-stream")
    end

    it "streams user_message event first" do
      allow_any_instance_of(LlmService).to receive(:chat_stream).and_yield("Response")
      allow_any_instance_of(TtsService).to receive(:synthesize).and_return({
        audio_data: "mock_audio",
        content_type: "audio/mpeg"
      })

      post "/api/v1/conversations/#{conversation.id}/stream",
        params: { message: { content: "Hello" }, user_id: user.id },
        as: :json

      expect(response.body).to include("event: user_message")
    end

    it "streams chunk events" do
      allow_any_instance_of(LlmService).to receive(:chat_stream).and_yield("Hello").and_yield(" World")
      allow_any_instance_of(TtsService).to receive(:synthesize).and_return({
        audio_data: "mock_audio",
        content_type: "audio/mpeg"
      })

      post "/api/v1/conversations/#{conversation.id}/stream",
        params: { message: { content: "Hi" }, user_id: user.id },
        as: :json

      expect(response.body).to include("event: chunk")
    end

    it "streams complete event with audio" do
      allow_any_instance_of(LlmService).to receive(:chat_stream).and_yield("Response")
      allow_any_instance_of(TtsService).to receive(:synthesize).and_return({
        audio_data: "mock_audio_data",
        content_type: "audio/mpeg"
      })

      post "/api/v1/conversations/#{conversation.id}/stream",
        params: { message: { content: "Hi" }, user_id: user.id },
        as: :json

      expect(response.body).to include("event: complete")
      # Check that audio data is base64 encoded
      expect(response.body).to include("audio")
    end

    it "creates user and assistant messages in database" do
      allow_any_instance_of(LlmService).to receive(:chat_stream).and_yield("Hello!")
      allow_any_instance_of(TtsService).to receive(:synthesize).and_return({
        audio_data: "mock_audio",
        content_type: "audio/mpeg"
      })

      expect {
        post "/api/v1/conversations/#{conversation.id}/stream",
          params: { message: { content: "Hi" }, user_id: user.id },
          as: :json
      }.to change { conversation.messages.count }.by(2)

      messages = conversation.messages.order(:created_at)
      expect(messages.first.role).to eq("user")
      expect(messages.first.content).to eq("Hi")
      expect(messages.last.role).to eq("assistant")
      expect(messages.last.content).to eq("Hello!")
    end

    it "streams error event on failure" do
      allow_any_instance_of(LlmService).to receive(:chat_stream).and_raise(StandardError.new("API Error"))

      post "/api/v1/conversations/#{conversation.id}/stream",
        params: { message: { content: "Hi" }, user_id: user.id },
        as: :json

      expect(response.body).to include("event: error")
    end
  end
end
