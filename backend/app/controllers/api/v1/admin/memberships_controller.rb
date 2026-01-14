module Api
  module V1
    module Admin
      class MembershipsController < Admin::BaseController
        def index
          memberships = Membership.includes(:user).order(created_at: :desc)

          render_collection(memberships, serializer: MembershipSerializer)
        end

        def show
          membership = Membership.find(params[:id])

          render_resource(membership, serializer: MembershipSerializer)
        end

        def create
          user = User.find(params[:user_id])
          membership = user.memberships.build(membership_params)

          if membership.save
            render_resource(membership, serializer: MembershipSerializer, status: :created)
          else
            render_error(
              message: "Failed to create membership",
              status: :unprocessable_entity,
              code: "CREATION_FAILED",
              details: membership.errors.full_messages
            )
          end
        end

        def destroy
          membership = Membership.find(params[:id])

          # Soft delete: status를 cancelled로 변경
          if membership.update(status: "cancelled")
            render_success(message: "Membership cancelled successfully")
          else
            render_error(
              message: "Failed to cancel membership",
              status: :unprocessable_entity,
              code: "CANCELLATION_FAILED"
            )
          end
        end

        private

        def membership_params
          params.require(:membership).permit(
            :membership_type,
            :start_date,
            :end_date,
            :status
          )
        end
      end
    end
  end
end
