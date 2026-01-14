module Api
  module V1
    class MembershipsController < BaseController
      def index
        memberships = current_user.memberships.order(created_at: :desc)

        render_collection(memberships, serializer: MembershipSerializer)
      end

      def show
        membership = current_user.memberships.find(params[:id])

        render_resource(membership, serializer: MembershipSerializer)
      end

      def current
        membership = current_user.active_membership

        if membership
          render_resource(membership, serializer: MembershipSerializer)
        else
          render_error(
            message: "No active membership found",
            status: :not_found,
            code: "NO_ACTIVE_MEMBERSHIP"
          )
        end
      end
    end
  end
end
