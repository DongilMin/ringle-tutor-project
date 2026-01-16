# frozen_string_literal: true

module Api
  module V1
    class MembershipPlansController < BaseController
      # Public endpoint - no authentication required

      def index
        plans = Membership::TYPES.map do |type|
          {
            type: type,
            name: type.capitalize,
            name_ko: plan_name_ko(type),
            price: Membership::MEMBERSHIP_PRICES[type],
            duration: Membership::MEMBERSHIP_DURATION_DAYS[type],
            features: Membership::MEMBERSHIP_FEATURES[type],
            popular: type == "premium"
          }
        end

        render json: { plans: plans }
      end

      private

      def plan_name_ko(type)
        case type
        when "basic"
          "베이직"
        when "premium"
          "프리미엄"
        when "enterprise"
          "엔터프라이즈"
        else
          type.capitalize
        end
      end
    end
  end
end
