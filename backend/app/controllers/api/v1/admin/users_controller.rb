# frozen_string_literal: true

module Api
  module V1
    module Admin
      class UsersController < BaseController
        def index
          users = User.order(:id)
          render_success(data: users.map { |u| user_data(u) })
        end

        private

        def user_data(user)
          {
            id: user.id,
            email: user.email,
            name: user.name
          }
        end
      end
    end
  end
end
