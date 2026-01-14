module Api
  module V1
    class ConversationsController < BaseController
      include MembershipCheck

      def index
        render_success(
          message: "Conversations list",
          data: []
        )
      end

      def create
        render_success(
          message: "Conversation created",
          data: { id: 1 },
          status: :created
        )
      end
    end
  end
end
