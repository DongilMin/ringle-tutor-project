FactoryBot.define do
  factory :membership do
    association :user
    membership_type { 'basic' }
    start_date { Date.current }
    end_date { Date.current + 30.days }
    status { 'active' }

    trait :premium do
      membership_type { 'premium' }
    end

    trait :enterprise do
      membership_type { 'enterprise' }
    end

    trait :expired do
      status { 'expired' }
    end

    trait :cancelled do
      status { 'cancelled' }
    end
  end
end
