class PaymentService
  class PaymentError < StandardError; end
  class InvalidStateError < PaymentError; end
  class PgError < PaymentError; end

  MEMBERSHIP_PRICES = {
    "basic" => 29_900,
    "premium" => 59_900,
    "enterprise" => 99_900
  }.freeze

  MEMBERSHIP_DURATION = {
    "basic" => 30,
    "premium" => 30,
    "enterprise" => 30
  }.freeze

  def initialize(user:, membership_type:, payment_method:)
    @user = user
    @membership_type = membership_type
    @payment_method = payment_method
  end

  def process
    validate_membership_type!

    ActiveRecord::Base.transaction do
      payment = create_payment
      result = call_pg(payment)

      if result[:success]
        complete_payment(payment, result[:transaction_id])
        membership = create_membership
        { success: true, payment: payment, membership: membership }
      else
        fail_payment(payment)
        { success: false, payment: payment, error: result[:error] }
      end
    end
  rescue PaymentError => e
    { success: false, error: e.message }
  end

  private

  attr_reader :user, :membership_type, :payment_method

  def validate_membership_type!
    unless Membership::TYPES.include?(membership_type)
      raise PaymentError, "Invalid membership type: #{membership_type}"
    end
  end

  def create_payment
    user.payments.create!(
      amount: MEMBERSHIP_PRICES[membership_type],
      payment_method: payment_method,
      status: "pending"
    )
  end

  def call_pg(payment)
    pg_client.charge(
      amount: payment.amount,
      payment_method: payment_method,
      order_id: "ORDER_#{payment.id}_#{Time.current.to_i}"
    )
  end

  def pg_client
    @pg_client ||= MockPgClient.new
  end

  def complete_payment(payment, transaction_id)
    raise InvalidStateError, "Payment is not pending" unless payment.status == "pending"

    payment.update!(
      status: "completed",
      transaction_id: transaction_id
    )
  end

  def fail_payment(payment)
    raise InvalidStateError, "Payment is not pending" unless payment.status == "pending"

    payment.update!(status: "failed")
  end

  def create_membership
    user.memberships.create!(
      membership_type: membership_type,
      start_date: Date.current,
      end_date: Date.current + MEMBERSHIP_DURATION[membership_type].days,
      status: "active"
    )
  end
end
