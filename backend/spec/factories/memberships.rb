FactoryBot.define do
  factory :membership do
    association :user
    membership_type { 'premium' }  # Default to premium for conversation access
    start_date { Date.current }
    end_date { Date.current + 60.days }
    status { 'active' }

    trait :active do
      status { 'active' }
      start_date { Date.current - 10.days }
      end_date { Date.current + 20.days }
    end

    trait :basic do
      membership_type { 'basic' }
      end_date { Date.current + 30.days }
    end

    trait :premium do
      membership_type { 'premium' }
      end_date { Date.current + 60.days }
    end

    trait :enterprise do
      membership_type { 'enterprise' }
      end_date { Date.current + 90.days }
    end

    trait :expired do
      status { 'expired' }
    end

    trait :cancelled do
      status { 'cancelled' }
    end
  end
end
