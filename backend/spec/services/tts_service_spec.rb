# frozen_string_literal: true

require "rails_helper"

RSpec.describe TtsService do
  subject(:service) { described_class.new(api_key: "test_key") }

  describe "#synthesize" do
    let(:text) { "Hello, this is a test." }

    context "with valid text" do
      it "returns audio data" do
        result = service.synthesize(text)

        expect(result[:audio_data]).to be_present
        expect(result[:format]).to eq("audio/mp3")
        expect(result[:duration]).to be_a(Numeric)
      end

      it "accepts custom voice" do
        result = service.synthesize(text, voice: "en-GB-Standard-A")

        expect(result[:audio_data]).to be_present
      end

      it "accepts custom format" do
        result = service.synthesize(text, format: "audio/wav")

        expect(result[:format]).to eq("audio/wav")
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
      %w[en-US-Standard-A en-US-Standard-B en-GB-Standard-A].each do |voice|
        it "accepts #{voice}" do
          result = service.synthesize(text, voice: voice)

          expect(result[:audio_data]).to be_present
        end
      end
    end
  end

  describe "error handling" do
    it "wraps timeout errors" do
      allow(service).to receive(:call_tts_api).and_raise(Timeout::Error)

      expect { service.synthesize("Test") }
        .to raise_error(TtsService::TimeoutError, /timed out/)
    end
  end
end
