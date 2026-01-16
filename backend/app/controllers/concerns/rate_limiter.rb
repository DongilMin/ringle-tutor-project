# frozen_string_literal: true

# Rate Limiting concern to prevent API abuse
# Uses in-memory storage for simplicity (use Redis in production for distributed systems)
module RateLimiter
  extend ActiveSupport::Concern

  # Configuration
  RATE_LIMITS = {
    audio: {
      requests_per_minute: 10,
      requests_per_hour: 60,
      requests_per_day: 200,
      min_interval_seconds: 2
    },
    text: {
      requests_per_minute: 20,
      requests_per_hour: 120,
      requests_per_day: 500,
      min_interval_seconds: 1
    },
    default: {
      requests_per_minute: 30,
      requests_per_hour: 200,
      requests_per_day: 1000,
      min_interval_seconds: 0.5
    }
  }.freeze

  class RateLimitExceeded < StandardError
    attr_reader :limit_type, :retry_after

    def initialize(limit_type, retry_after = nil)
      @limit_type = limit_type
      @retry_after = retry_after
      super("Rate limit exceeded: #{limit_type}")
    end
  end

  included do
    rescue_from RateLimitExceeded, with: :handle_rate_limit_exceeded
  end

  class_methods do
    def rate_limit_store
      @rate_limit_store ||= {}
    end

    def clean_expired_entries!
      cutoff = 1.day.ago
      rate_limit_store.each do |_user_id, data|
        data[:requests]&.reject! { |timestamp| timestamp < cutoff }
      end
    end
  end

  private

  def check_rate_limit!(limit_type = :default)
    # Skip rate limiting in test environment
    return { remaining_minute: 999, remaining_hour: 999, remaining_day: 999 } if Rails.env.test? && !ENV["ENABLE_RATE_LIMITING"]
    return unless current_user

    user_id = current_user.id
    config = RATE_LIMITS[limit_type] || RATE_LIMITS[:default]
    store = self.class.rate_limit_store

    store[user_id] ||= { requests: [], last_request: nil }
    user_data = store[user_id]
    now = Time.current

    # Clean old entries periodically
    clean_old_requests!(user_data, now)

    # Check minimum interval between requests
    if user_data[:last_request]
      elapsed = now - user_data[:last_request]
      if elapsed < config[:min_interval_seconds]
        retry_after = (config[:min_interval_seconds] - elapsed).ceil
        raise RateLimitExceeded.new(:too_fast, retry_after)
      end
    end

    # Check per-minute limit
    minute_ago = now - 1.minute
    recent_minute = user_data[:requests].count { |t| t > minute_ago }
    if recent_minute >= config[:requests_per_minute]
      raise RateLimitExceeded.new(:per_minute, 60)
    end

    # Check per-hour limit
    hour_ago = now - 1.hour
    recent_hour = user_data[:requests].count { |t| t > hour_ago }
    if recent_hour >= config[:requests_per_hour]
      raise RateLimitExceeded.new(:per_hour, 3600)
    end

    # Check per-day limit
    day_ago = now - 1.day
    recent_day = user_data[:requests].count { |t| t > day_ago }
    if recent_day >= config[:requests_per_day]
      raise RateLimitExceeded.new(:per_day, 86400)
    end

    # Record this request
    user_data[:requests] << now
    user_data[:last_request] = now

    # Return remaining limits for headers
    {
      remaining_minute: config[:requests_per_minute] - recent_minute - 1,
      remaining_hour: config[:requests_per_hour] - recent_hour - 1,
      remaining_day: config[:requests_per_day] - recent_day - 1
    }
  end

  def clean_old_requests!(user_data, now)
    cutoff = now - 1.day
    user_data[:requests].reject! { |t| t < cutoff }
  end

  def set_rate_limit_headers(limits)
    return unless limits

    response.set_header("X-RateLimit-Remaining-Minute", limits[:remaining_minute].to_s)
    response.set_header("X-RateLimit-Remaining-Hour", limits[:remaining_hour].to_s)
    response.set_header("X-RateLimit-Remaining-Day", limits[:remaining_day].to_s)
  end

  def handle_rate_limit_exceeded(exception)
    message = case exception.limit_type
    when :too_fast
      "Too many requests. Please wait #{exception.retry_after} second(s) before trying again."
    when :per_minute
      "Rate limit exceeded. Maximum requests per minute reached."
    when :per_hour
      "Rate limit exceeded. Maximum requests per hour reached."
    when :per_day
      "Daily rate limit exceeded. Please try again tomorrow."
    else
      "Rate limit exceeded."
    end

    response.set_header("Retry-After", exception.retry_after.to_s) if exception.retry_after

    render json: {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: message,
        limit_type: exception.limit_type,
        retry_after: exception.retry_after
      }
    }, status: :too_many_requests
  end
end
