# frozen_string_literal: true

require "rails_helper"

RSpec.describe TtsService do
  subject(:service) { described_class.new(api_key: "test_key") }

  describe "#synthesize" do
    let(:text) { "Hello, this is a test." }

    context "with valid text" do
      before do
        stub_request(:post, "https://api.openai.com/v1/audio/speech")
          .to_return(
            status: 200,
            body: "fake_audio_binary_data",
            headers: { "Content-Type" => "audio/mp3" }
          )
      end

      it "returns audio data" do
        result = service.synthesize(text)

        expect(result[:audio_data]).to be_present
        expect(result[:content_type]).to eq("audio/mp3")
      end

      it "accepts custom voice" do
        result = service.synthesize(text, voice: "echo")

        expect(result[:audio_data]).to be_present
      end

      it "accepts custom format" do
        stub_request(:post, "https://api.openai.com/v1/audio/speech")
          .to_return(
            status: 200,
            body: "fake_audio_binary_data",
            headers: { "Content-Type" => "audio/wav" }
          )

        result = service.synthesize(text, format: "wav")

        expect(result[:content_type]).to eq("audio/wav")
      end
    end

    context "with invalid text" do
      it "raises error when text is blank" do
        expect { service.synthesize(nil) }
          .to raise_error(TtsService::InvalidTextError, "Text is required")
      end

      it "raises error when text is empty" do
        expect { service.synthesize("") }
          .to raise_error(TtsService::InvalidTextError, "Text is required")
      end

      it "raises error when text is too long" do
        long_text = "x" * 5001

        expect { service.synthesize(long_text) }
          .to raise_error(TtsService::InvalidTextError, /too long/)
      end
    end

    context "with invalid voice" do
      it "raises error for unsupported voice" do
        expect { service.synthesize(text, voice: "invalid-voice") }
          .to raise_error(TtsService::InvalidTextError, /Unsupported voice/)
      end
    end

    context "with supported voices" do
      before do
        stub_request(:post, "https://api.openai.com/v1/audio/speech")
          .to_return(
            status: 200,
            body: "fake_audio_binary_data",
            headers: { "Content-Type" => "audio/mp3" }
          )
      end

      %w[alloy echo fable onyx nova shimmer].each do |voice|
        it "accepts #{voice}" do
          result = service.synthesize(text, voice: voice)

          expect(result[:audio_data]).to be_present
        end
      end
    end
  end

  describe "error handling" do
    let(:text) { "Test text" }

    it "wraps timeout errors" do
      stub_request(:post, "https://api.openai.com/v1/audio/speech")
        .to_timeout

      expect { service.synthesize(text) }
        .to raise_error(TtsService::TimeoutError, /timed out/)
    end

    it "handles API errors" do
      stub_request(:post, "https://api.openai.com/v1/audio/speech")
        .to_return(
          status: 400,
          body: { error: { message: "Invalid request" } }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      expect { service.synthesize(text) }
        .to raise_error(TtsService::ApiError, /400/)
    end
  end
end
