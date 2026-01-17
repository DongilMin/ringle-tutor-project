module Api
  module V1
    module Admin
      class MembershipsController < Admin::BaseController
        def index
          memberships = Membership.includes(:user).order(created_at: :desc)

          # Include user data for admin view
          data = memberships.map { |m| MembershipSerializer.new(m).as_json_with_user }
          render_success(data: data)
        end

        def show
          membership = Membership.includes(:user).find(params[:id])

          render_success(data: MembershipSerializer.new(membership).as_json_with_user)
        end

        def create
          user = User.find(params[:user_id] || params.dig(:membership, :user_id))

          # Cancel existing active memberships before creating new one
          user.memberships.currently_valid.update_all(status: "cancelled")

          membership = user.memberships.build(membership_params.except(:user_id))

          # Set default values based on membership type
          membership.start_date ||= Date.current
          membership.end_date ||= membership.start_date + duration_for(membership.membership_type).days
          membership.status ||= "active"
          membership.features ||= Membership::MEMBERSHIP_FEATURES[membership.membership_type]

          if membership.save
            render_success(data: MembershipSerializer.new(membership).as_json_with_user, status: :created)
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
            :user_id,
            :membership_type,
            :start_date,
            :end_date,
            :status,
            :remaining_conversations,
            :is_usage_based,
            features: []
          )
        end

        def duration_for(membership_type)
          Membership::MEMBERSHIP_DURATION_DAYS[membership_type] || 30
        end
      end
    end
  end
end
