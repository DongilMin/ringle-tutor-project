class Payment < ApplicationRecord
  STATUSES = %w[pending completed failed refunded].freeze
  PAYMENT_METHODS = %w[credit_card bank_transfer kakao_pay naver_pay].freeze

  belongs_to :user
  belongs_to :membership, optional: true

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :payment_method, presence: true, inclusion: { in: PAYMENT_METHODS }
  validates :transaction_id, uniqueness: true, allow_nil: true

  scope :pending, -> { where(status: "pending") }
  scope :completed, -> { where(status: "completed") }
  scope :failed, -> { where(status: "failed") }

  def complete!(transaction_id)
    raise ArgumentError, "transaction_id is required" if transaction_id.blank?

    # Idempotency: if already completed with same transaction_id, return true
    if status == "completed" && self.transaction_id == transaction_id
      Rails.logger.info("Payment #{id} already completed with #{transaction_id}")
      return true
    end

    # Prevent completion with different transaction_id
    if status == "completed" && self.transaction_id != transaction_id
      raise PaymentError, "Payment already completed with different transaction_id"
    end

    # Only allow transition from pending
    unless status == "pending"
      raise PaymentError, "Cannot complete payment with status '#{status}'"
    end

    update!(status: "completed", transaction_id: transaction_id)
  end

  def fail!
    unless status == "pending"
      raise PaymentError, "Cannot fail payment with status '#{status}'"
    end

    update!(status: "failed")
  end

  def refund!
    unless status == "completed"
      raise PaymentError, "Cannot refund payment with status '#{status}'. Only completed payments can be refunded."
    end

    update!(status: "refunded")
  end
end

class PaymentError < StandardError; end
