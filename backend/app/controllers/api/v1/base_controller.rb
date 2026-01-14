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
        @current_user ||= User.first
      end
    end
  end
end
