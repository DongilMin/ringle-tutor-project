module ErrorHandler
  extend ActiveSupport::Concern

  included do
    rescue_from ActiveRecord::RecordNotFound, with: :handle_not_found
    rescue_from ActiveRecord::RecordInvalid, with: :handle_validation_error
    rescue_from ActionController::ParameterMissing, with: :handle_parameter_missing
  end

  private

  def handle_not_found(exception)
    render_error(
      message: exception.message,
      status: :not_found,
      code: "NOT_FOUND"
    )
  end

  def handle_validation_error(exception)
    render_error(
      message: "Validation failed",
      status: :unprocessable_entity,
      code: "VALIDATION_ERROR",
      details: exception.record.errors.full_messages
    )
  end

  def handle_parameter_missing(exception)
    render_error(
      message: exception.message,
      status: :bad_request,
      code: "PARAMETER_MISSING"
    )
  end
end
