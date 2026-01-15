# frozen_string_literal: true

require "rails_helper"

RSpec.describe SttService do
  subject(:service) { described_class.new(api_key: "test_key") }

  describe "#transcribe" do
    let(:audio_data) { "fake_audio_binary_data" * 100 }
    let(:content_type) { "audio/webm" }

    context "with valid audio data" do
      it "returns transcription result" do
        result = service.transcribe(audio_data, content_type: content_type)

        expect(result[:text]).to be_present
        expect(result[:confidence]).to be_a(Numeric)
        expect(result[:language]).to eq("en")
      end

      it "accepts different languages" do
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
        large_audio = "x" * (11 * 1024 * 1024)

        expect { service.transcribe(large_audio) }
          .to raise_error(SttService::InvalidAudioError, /too large/)
      end

      it "raises error for unsupported audio format" do
        expect { service.transcribe(audio_data, content_type: "video/mp4") }
          .to raise_error(SttService::InvalidAudioError, /Unsupported audio format/)
      end
    end

    context "with supported audio formats" do
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
      allow(service).to receive(:call_stt_api).and_raise(Timeout::Error)

      expect { service.transcribe(audio_data) }
        .to raise_error(SttService::TimeoutError, /timed out/)
    end
  end
end
