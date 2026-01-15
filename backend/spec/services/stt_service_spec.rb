# frozen_string_literal: true

require "rails_helper"

RSpec.describe SttService do
  subject(:service) { described_class.new(api_key: "test_key") }

  describe "#transcribe" do
    let(:audio_data) { "fake_audio_binary_data" * 100 }
    let(:content_type) { "audio/webm" }

    context "with valid audio data" do
      before do
        stub_request(:post, "https://api.openai.com/v1/audio/transcriptions")
          .to_return(
            status: 200,
            body: { text: "Hello, this is a test transcription", language: "en" }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "returns transcription result" do
        result = service.transcribe(audio_data, content_type: content_type)

        expect(result[:text]).to eq("Hello, this is a test transcription")
        expect(result[:confidence]).to be_a(Numeric)
        expect(result[:language]).to eq("en")
      end

      it "accepts different languages" do
        stub_request(:post, "https://api.openai.com/v1/audio/transcriptions")
          .to_return(
            status: 200,
            body: { text: "안녕하세요", language: "ko" }.to_json,
            headers: { "Content-Type" => "application/json" }
          )

        result = service.transcribe(audio_data, content_type: content_type, language: "ko")

        expect(result[:language]).to eq("ko")
      end
    end

    context "with invalid audio data" do
      it "raises error when audio data is blank" do
        expect { service.transcribe(nil) }
          .to raise_error(SttService::InvalidAudioError, "Audio data is required")
      end

      it "raises error when audio data is empty" do
        expect { service.transcribe("") }
          .to raise_error(SttService::InvalidAudioError, "Audio data is required")
      end

      it "raises error when audio is too large" do
        large_audio = "x" * (26 * 1024 * 1024)

        expect { service.transcribe(large_audio) }
          .to raise_error(SttService::InvalidAudioError, /too large/)
      end

      it "raises error for unsupported audio format" do
        expect { service.transcribe(audio_data, content_type: "video/mp4") }
          .to raise_error(SttService::InvalidAudioError, /Unsupported audio format/)
      end
    end

    context "with supported audio formats" do
      before do
        stub_request(:post, "https://api.openai.com/v1/audio/transcriptions")
          .to_return(
            status: 200,
            body: { text: "Test transcription", language: "en" }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      %w[audio/webm audio/wav audio/mp3 audio/ogg].each do |format|
        it "accepts #{format} format" do
          result = service.transcribe(audio_data, content_type: format)

          expect(result[:text]).to be_present
        end
      end
    end
  end

  describe "error handling" do
    let(:audio_data) { "fake_audio" * 100 }

    it "wraps timeout errors" do
      stub_request(:post, "https://api.openai.com/v1/audio/transcriptions")
        .to_timeout

      expect { service.transcribe(audio_data) }
        .to raise_error(SttService::TimeoutError, /timed out/)
    end

    it "handles API errors" do
      stub_request(:post, "https://api.openai.com/v1/audio/transcriptions")
        .to_return(
          status: 400,
          body: { error: { message: "Invalid audio file" } }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      expect { service.transcribe(audio_data) }
        .to raise_error(SttService::ApiError, /Invalid audio file/)
    end
  end
end
