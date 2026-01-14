FactoryBot.define do
  factory :payment do
    association :user
    amount { 29_900 }
    status { 'pending' }
    payment_method { 'credit_card' }
    transaction_id { nil }

    trait :completed do
      status { 'completed' }
      sequence(:transaction_id) { |n| "TXN_#{n}_#{SecureRandom.hex(8)}" }
    end

    trait :failed do
      status { 'failed' }
    end

    trait :refunded do
      status { 'refunded' }
      sequence(:transaction_id) { |n| "TXN_#{n}_#{SecureRandom.hex(8)}" }
    end

    trait :kakao_pay do
      payment_method { 'kakao_pay' }
    end

    trait :naver_pay do
      payment_method { 'naver_pay' }
    end
  end
end
