# frozen_string_literal: true

require "rails_helper"

RSpec.describe ConversationService, type: :service do
  let(:user) { create(:user) }
  let(:conversation) { create(:conversation, user: user) }

  let(:stt_service) { instance_double(SttService) }
  let(:llm_service) { instance_double(LlmService) }
  let(:tts_service) { instance_double(TtsService) }

  subject(:service) do
    described_class.new(
      stt_service: stt_service,
      llm_service: llm_service,
      tts_service: tts_service
    )
  end

  describe "#initialize" do
    context "with no arguments" do
      it "creates default service instances" do
        service = described_class.new
        expect(service).to be_a(described_class)
      end
    end

    context "with injected dependencies" do
      it "uses the provided services" do
        expect(service).to be_a(described_class)
      end
    end
  end

  describe "#process_audio" do
    let(:audio_data) { "fake_audio_binary_data" }
    let(:content_type) { "audio/webm" }
    let(:transcribed_text) { "Hello, how are you?" }
    let(:llm_response) { "I'm doing great! How can I help you today?" }
    let(:tts_audio_data) { "fake_tts_audio_binary" }

    before do
      allow(stt_service).to receive(:transcribe).and_return({ text: transcribed_text })
      allow(llm_service).to receive(:chat).and_return({
        message: llm_response,
        conversation_history: []
      })
      allow(tts_service).to receive(:synthesize).and_return({
        audio_data: tts_audio_data,
        content_type: "audio/mpeg",
        duration: 2.5
      })
    end

    it "processes audio through STT -> LLM -> TTS pipeline" do
      result = service.process_audio(conversation, audio_data, content_type: content_type)

      expect(stt_service).to have_received(:transcribe).with(audio_data, content_type: content_type)
      expect(llm_service).to have_received(:chat)
      expect(tts_service).to have_received(:synthesize).with(llm_response)
    end

    it "saves user message to the conversation" do
      expect { service.process_audio(conversation, audio_data) }
        .to change { conversation.messages.where(role: "user").count }.by(1)
    end

    it "saves assistant message to the conversation" do
      expect { service.process_audio(conversation, audio_data) }
        .to change { conversation.messages.where(role: "assistant").count }.by(1)
    end

    it "returns structured response with user and assistant messages" do
      result = service.process_audio(conversation, audio_data)

      expect(result).to include(:user_message, :assistant_message, :transcribed_text, :audio)
      expect(result[:user_message][:content]).to eq(transcribed_text)
      expect(result[:assistant_message][:content]).to eq(llm_response)
      expect(result[:transcribed_text]).to eq(transcribed_text)
    end

    it "returns audio data as base64 encoded" do
      result = service.process_audio(conversation, audio_data)

      expect(result[:audio][:data]).to eq(Base64.strict_encode64(tts_audio_data))
      expect(result[:audio][:content_type]).to eq("audio/mpeg")
      expect(result[:audio][:duration]).to eq(2.5)
    end

    context "when STT fails" do
      before do
        allow(stt_service).to receive(:transcribe)
          .and_raise(SttService::InvalidAudioError, "Audio not recognized")
      end

      it "raises ProcessingError with appropriate message" do
        expect { service.process_audio(conversation, audio_data) }
          .to raise_error(ConversationService::ProcessingError, /Speech recognition failed/)
      end

      it "does not create any messages" do
        expect { service.process_audio(conversation, audio_data) rescue nil }
          .not_to change { conversation.messages.count }
      end
    end

    context "when LLM fails" do
      before do
        allow(llm_service).to receive(:chat)
          .and_raise(LlmService::ApiError, "API unavailable")
      end

      it "raises ProcessingError with appropriate message" do
        expect { service.process_audio(conversation, audio_data) }
          .to raise_error(ConversationService::ProcessingError, /AI response generation failed/)
      end
    end

    context "when TTS fails" do
      before do
        allow(tts_service).to receive(:synthesize)
          .and_raise(TtsService::ApiError, "Voice not available")
      end

      it "raises ProcessingError with appropriate message" do
        expect { service.process_audio(conversation, audio_data) }
          .to raise_error(ConversationService::ProcessingError, /Speech synthesis failed/)
      end
    end
  end

  describe "#process_text" do
    let(:user_text) { "What's the weather like today?" }
    let(:llm_response) { "I don't have access to real-time weather data." }
    let(:tts_audio_data) { "fake_tts_audio_binary" }

    before do
      allow(llm_service).to receive(:chat).and_return({
        message: llm_response,
        conversation_history: []
      })
      allow(tts_service).to receive(:synthesize).and_return({
        audio_data: tts_audio_data,
        content_type: "audio/mpeg",
        duration: 3.0
      })
    end

    it "processes text through LLM -> TTS pipeline (skips STT)" do
      result = service.process_text(conversation, user_text)

      expect(llm_service).to have_received(:chat)
      expect(tts_service).to have_received(:synthesize).with(llm_response)
    end

    it "does not call STT service" do
      allow(stt_service).to receive(:transcribe)

      service.process_text(conversation, user_text)

      expect(stt_service).not_to have_received(:transcribe)
    end

    it "saves user message to the conversation" do
      expect { service.process_text(conversation, user_text) }
        .to change { conversation.messages.where(role: "user").count }.by(1)

      user_message = conversation.messages.where(role: "user").last
      expect(user_message.content).to eq(user_text)
    end

    it "saves assistant message with audio data" do
      service.process_text(conversation, user_text)

      assistant_message = conversation.messages.where(role: "assistant").last
      expect(assistant_message.content).to eq(llm_response)
      expect(assistant_message.audio_data).to eq(tts_audio_data)
    end

    it "returns structured response without transcribed_text" do
      result = service.process_text(conversation, user_text)

      expect(result[:transcribed_text]).to be_nil
      expect(result[:user_message][:content]).to eq(user_text)
      expect(result[:assistant_message][:content]).to eq(llm_response)
    end

    context "when LLM fails" do
      before do
        allow(llm_service).to receive(:chat)
          .and_raise(LlmService::RateLimitError, "Rate limit exceeded")
      end

      it "raises ProcessingError" do
        expect { service.process_text(conversation, user_text) }
          .to raise_error(ConversationService::ProcessingError, /AI response generation failed/)
      end
    end

    context "when TTS fails" do
      before do
        allow(tts_service).to receive(:synthesize)
          .and_raise(TtsService::ApiError, "TTS API error")
      end

      it "raises ProcessingError" do
        expect { service.process_text(conversation, user_text) }
          .to raise_error(ConversationService::ProcessingError, /Speech synthesis failed/)
      end
    end
  end

  describe "context message limiting" do
    let(:user_text) { "New message" }
    let(:llm_response) { "Response" }
    let(:tts_audio_data) { "audio" }

    before do
      allow(llm_service).to receive(:chat).and_return({
        message: llm_response,
        conversation_history: []
      })
      allow(tts_service).to receive(:synthesize).and_return({
        audio_data: tts_audio_data,
        content_type: "audio/mpeg",
        duration: 1.0
      })

      # Create 25 messages (more than MAX_CONTEXT_MESSAGES = 20)
      25.times do |i|
        role = i.even? ? "user" : "assistant"
        conversation.messages.create!(role: role, content: "Message #{i}")
      end
    end

    it "limits context to MAX_CONTEXT_MESSAGES" do
      service.process_text(conversation, user_text)

      expect(llm_service).to have_received(:chat) do |_msg, context:|
        # Should have limited context (not all 26 messages)
        expect(context.size).to be <= ConversationService::MAX_CONTEXT_MESSAGES
      end
    end
  end
end
