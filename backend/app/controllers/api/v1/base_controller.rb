module Api
  module V1
    class BaseController < ApplicationController
      include ErrorHandler
      include ResponseRenderer

      before_action :set_default_format

      private

      def set_default_format
        request.format = :json
      end

      # 임시 current_user (추후 인증 시스템 연동)
      def current_user
        uid = params[:user_id] || params.dig(:payment, :user_id)
        if uid.present?
          @current_user ||= User.find_by(id: uid)
        end
        @current_user ||= User.first || User.create!(email: "user@example.com", name: "Test User")
        puts "BaseController#current_user: #{@current_user.id} - #{@current_user.email}"
        @current_user
      end
    end
  end
end
