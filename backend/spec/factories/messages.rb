# frozen_string_literal: true

FactoryBot.define do
  factory :message do
    association :conversation
    role { "user" }
    content { "Hello, how are you?" }

    trait :user do
      role { "user" }
      content { "Hello, how are you?" }
    end

    trait :assistant do
      role { "assistant" }
      content { "Hello! I'm doing great. How can I help you practice English today?" }
      audio_data { "mock_audio_data" }
      audio_content_type { "audio/mp3" }
      audio_duration { 2.5 }
    end
  end
end
