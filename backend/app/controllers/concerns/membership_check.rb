module MembershipCheck
  extend ActiveSupport::Concern

  included do
    before_action :require_active_membership
  end

  private

  def require_active_membership
    unless current_user&.has_active_membership?
      return render json: {
        success: false,
        error: {
          code: "MEMBERSHIP_REQUIRED",
          message: "Active membership is required to access this resource"
        }
      }, status: :forbidden
    end

    unless current_user&.can_start_conversation?
      render json: {
        success: false,
        error: {
          code: "NO_CONVERSATION_CREDITS",
          message: "No remaining conversation credits"
        }
      }, status: :forbidden
    end
  end

  def skip_membership_check?
    false
  end
end
