# frozen_string_literal: true

require "rails_helper"

RSpec.describe RateLimiter, type: :controller do
  include ActiveSupport::Testing::TimeHelpers

  # Create a test controller that includes RateLimiter
  controller(ApplicationController) do
    include RateLimiter

    def test_audio
      limits = check_rate_limit!(:audio)
      set_rate_limit_headers(limits)
      render json: { success: true, limits: limits }
    end

    def test_text
      limits = check_rate_limit!(:text)
      set_rate_limit_headers(limits)
      render json: { success: true, limits: limits }
    end

    def test_default
      limits = check_rate_limit!(:default)
      set_rate_limit_headers(limits)
      render json: { success: true, limits: limits }
    end

    private

    def current_user
      @current_user ||= User.first || User.create!(email: "test@example.com", name: "Test")
    end
  end

  before do
    # Enable rate limiting for these tests
    ENV["ENABLE_RATE_LIMITING"] = "true"

    # Clear rate limit store before each test
    controller.class.rate_limit_store.clear

    routes.draw do
      get "test_audio" => "anonymous#test_audio"
      get "test_text" => "anonymous#test_text"
      get "test_default" => "anonymous#test_default"
    end
  end

  after do
    ENV.delete("ENABLE_RATE_LIMITING")
  end

  describe "rate limiting" do
    context "audio rate limits" do
      it "allows requests within rate limits" do
        get :test_audio
        expect(response).to have_http_status(:ok)
        expect(response.headers["X-RateLimit-Remaining-Minute"]).to be_present
      end

      it "includes rate limit headers in response" do
        get :test_audio
        expect(response.headers["X-RateLimit-Remaining-Minute"]).to eq("9")
        expect(response.headers["X-RateLimit-Remaining-Hour"]).to eq("59")
        expect(response.headers["X-RateLimit-Remaining-Day"]).to eq("199")
      end

      it "blocks requests that are too fast" do
        get :test_audio
        expect(response).to have_http_status(:ok)

        # Immediate second request should be blocked
        get :test_audio
        expect(response).to have_http_status(:too_many_requests)

        json = JSON.parse(response.body)
        expect(json["error"]["code"]).to eq("RATE_LIMIT_EXCEEDED")
        expect(json["error"]["limit_type"]).to eq("too_fast")
      end

      it "blocks requests exceeding per-minute limit" do
        # Mock time to allow rapid requests
        current_time = Time.current
        allow(Time).to receive(:current).and_return(current_time)

        # Simulate 10 requests (the limit)
        store = controller.class.rate_limit_store
        user = controller.send(:current_user)
        store[user.id] = {
          requests: Array.new(10) { current_time - 30.seconds },
          last_request: current_time - 3.seconds
        }

        get :test_audio
        expect(response).to have_http_status(:too_many_requests)

        json = JSON.parse(response.body)
        expect(json["error"]["limit_type"]).to eq("per_minute")
      end
    end

    context "text rate limits" do
      it "has higher limits than audio" do
        get :test_text
        expect(response).to have_http_status(:ok)

        # Text allows 20/min vs audio's 10/min
        expect(response.headers["X-RateLimit-Remaining-Minute"]).to eq("19")
      end

      it "has shorter minimum interval than audio" do
        current_time = Time.current

        # Manually set last request to 1.5 seconds ago (past the 1 second text interval)
        store = controller.class.rate_limit_store
        user = controller.send(:current_user)
        store[user.id] = {
          requests: [ current_time - 2.seconds ],
          last_request: current_time - 1.5.seconds
        }

        allow(Time).to receive(:current).and_return(current_time)
        get :test_text
        expect(response).to have_http_status(:ok)
      end
    end

    context "default rate limits" do
      it "applies default limits for unspecified types" do
        get :test_default
        expect(response).to have_http_status(:ok)

        # Default allows 30/min
        expect(response.headers["X-RateLimit-Remaining-Minute"]).to eq("29")
      end
    end

    context "retry-after header" do
      it "includes Retry-After header when rate limited" do
        get :test_audio
        get :test_audio # too fast

        expect(response).to have_http_status(:too_many_requests)
        expect(response.headers["Retry-After"]).to be_present
      end
    end

    context "per-day limits" do
      it "blocks requests exceeding daily limit" do
        current_time = Time.current
        allow(Time).to receive(:current).and_return(current_time)

        # Simulate 200 requests today (the limit)
        store = controller.class.rate_limit_store
        user = controller.send(:current_user)
        store[user.id] = {
          requests: Array.new(200) { |i| current_time - (i * 5).minutes },
          last_request: current_time - 3.seconds
        }

        get :test_audio
        expect(response).to have_http_status(:too_many_requests)

        json = JSON.parse(response.body)
        expect(json["error"]["limit_type"]).to eq("per_day")
      end
    end

    context "request cleanup" do
      it "cleans old requests from store" do
        current_time = Time.current
        store = controller.class.rate_limit_store
        user = controller.send(:current_user)

        # Add old requests (more than 1 day ago)
        store[user.id] = {
          requests: [
            current_time - 2.days,
            current_time - 1.day - 1.hour,
            current_time - 30.minutes
          ],
          last_request: current_time - 3.seconds
        }

        allow(Time).to receive(:current).and_return(current_time)
        get :test_audio

        # Old requests should be cleaned
        expect(store[user.id][:requests].count).to eq(2) # recent + new request
      end
    end
  end

  describe "error messages" do
    it "returns user-friendly message for too_fast limit" do
      get :test_audio
      get :test_audio

      json = JSON.parse(response.body)
      expect(json["error"]["message"]).to include("Please wait")
    end

    it "returns user-friendly message for per_minute limit" do
      current_time = Time.current
      allow(Time).to receive(:current).and_return(current_time)

      store = controller.class.rate_limit_store
      user = controller.send(:current_user)
      store[user.id] = {
        requests: Array.new(10) { current_time - 30.seconds },
        last_request: current_time - 3.seconds
      }

      get :test_audio

      json = JSON.parse(response.body)
      expect(json["error"]["message"]).to include("per minute")
    end
  end
end
