# frozen_string_literal: true

FactoryBot.define do
  factory :conversation do
    association :user
    title { "English Practice Session" }
    status { "active" }

    trait :completed do
      status { "completed" }
    end

    trait :archived do
      status { "archived" }
    end
  end
end
