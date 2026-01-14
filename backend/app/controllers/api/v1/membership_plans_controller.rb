module Api
  module V1
    class MembershipPlansController < BaseController
      skip_before_action :require_authentication

      def index
        plans = [
          {
            id: "basic",
            name: "Basic Plan",
            price: 29_900,
            currency: "KRW",
            duration_days: 30,
            features: [
              "30 conversations per month",
              "Basic AI feedback",
              "Text chat support"
            ]
          },
          {
            id: "premium",
            name: "Premium Plan",
            price: 59_900,
            currency: "KRW",
            duration_days: 30,
            features: [
              "Unlimited conversations",
              "Advanced AI feedback",
              "Pronunciation analysis",
              "Priority support"
            ]
          },
          {
            id: "enterprise",
            name: "Enterprise Plan",
            price: 99_900,
            currency: "KRW",
            duration_days: 30,
            features: [
              "Everything in Premium",
              "Custom learning path",
              "Dedicated account manager",
              "API access"
            ]
          }
        ]

        render_success(data: plans)
      end
    end
  end
end
