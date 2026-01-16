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
        # Auto-expire any memberships that are past their end date
        current_user.memberships.expired_but_active.find_each(&:check_and_expire!)

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
