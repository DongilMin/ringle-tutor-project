module MembershipCheck
  extend ActiveSupport::Concern

  included do
    before_action :require_active_membership
  end

  private

  def require_active_membership
    return if current_user&.has_active_membership?

    render json: {
      success: false,
      error: {
        code: "MEMBERSHIP_REQUIRED",
        message: "Active membership is required to access this resource"
      }
    }, status: :forbidden
  end

  def skip_membership_check?
    false
  end
end
