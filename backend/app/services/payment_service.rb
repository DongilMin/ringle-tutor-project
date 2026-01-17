class PaymentService
  class PaymentError < StandardError; end
  class InvalidStateError < PaymentError; end
  class PgError < PaymentError; end

  def initialize(user:, membership_type:, payment_method:)
    @user = user
    @membership_type = membership_type
    @payment_method = payment_method
  end

  def process
    payment = nil
    membership = nil
    pg_transaction_id = nil

    begin
      validate_membership_type!

      ActiveRecord::Base.transaction do
        payment = create_payment
        result = call_pg(payment)

        raise PgError, result[:error] unless result[:success]

        pg_transaction_id = result[:transaction_id]

        complete_payment(payment, pg_transaction_id)
        membership = create_membership
        payment.update!(membership: membership)

        { success: true, payment: payment.reload, membership: membership }
      end
    rescue ActiveRecord::RecordInvalid => e
      # 멤버십 생성 실패 시 PG 환불
      refund_pg(pg_transaction_id) if pg_transaction_id
      { success: false, error: "Membership creation failed: #{e.message}" }
    rescue PgError => e
      fail_payment(payment) if payment
      { success: false, payment: payment, error: e.message }
    rescue PaymentError => e
      { success: false, error: e.message }
    end
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
      amount: Membership::MEMBERSHIP_PRICES[membership_type],
      payment_method: payment_method,
      status: "pending"
    )
  end

  def call_pg(payment)
    Timeout.timeout(10) do
      pg_client.charge(
        amount: payment.amount,
        payment_method: payment_method,
        order_id: "ORDER_#{payment.id}_#{Time.current.to_i}"
      )
    end
  rescue Timeout::Error
    raise PgError, "Payment gateway timeout"
  end

  def refund_pg(transaction_id)
    pg_client.refund(transaction_id: transaction_id)
  rescue StandardError => e
    Rails.logger.error("PG refund failed: #{e.message}")
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
    # Delete existing active memberships before creating new one
    user.memberships.currently_valid.destroy_all

    user.memberships.create!(
      membership_type: membership_type,
      start_date: Date.current,
      end_date: Date.current + Membership::MEMBERSHIP_DURATION_DAYS[membership_type].days,
      status: "active",
      features: Membership::MEMBERSHIP_FEATURES[membership_type]
    )
  end
end
