class Membership < ApplicationRecord
  include Expirable

  TYPES = %w[basic premium enterprise].freeze
  STATUSES = %w[active expired cancelled].freeze
  FEATURES = %w[learning conversation analysis].freeze

  # Feature configuration per membership type
  MEMBERSHIP_FEATURES = {
    "basic" => %w[learning],
    "premium" => %w[learning conversation analysis],
    "enterprise" => %w[learning conversation analysis]
  }.freeze

  MEMBERSHIP_DURATION_DAYS = {
    "basic" => 30,
    "premium" => 60,
    "enterprise" => 90
  }.freeze

  MEMBERSHIP_PRICES = {
    "basic" => 9_900,       # 9,900 KRW
    "premium" => 19_900,    # 19,900 KRW
    "enterprise" => 49_900  # 49,900 KRW
  }.freeze

  belongs_to :user
  has_one :payment, dependent: :nullify

  validates :membership_type, presence: true, inclusion: { in: TYPES }
  validates :start_date, presence: true
  validates :end_date, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :remaining_conversations, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validate :end_date_after_start_date

  scope :active, -> { where(status: "active") }
  scope :started, -> { where("start_date <= ?", Date.current) }
  scope :not_expired, -> { where("end_date >= ?", Date.current) }
  scope :currently_valid, -> { active.started.not_expired }
  scope :with_remaining_conversations, -> {
    where("is_usage_based = ? OR remaining_conversations IS NULL OR remaining_conversations > 0", false)
  }

  def active?
    status == "active" &&
      start_date <= Date.current &&
      end_date >= Date.current
  end

  def can_use_conversation?
    return false unless active?
    return false unless has_feature?("conversation")
    return true unless is_usage_based?

    remaining_conversations.present? && remaining_conversations > 0
  end

  def has_feature?(feature)
    available_features.include?(feature.to_s)
  end

  def available_features
    features.presence || MEMBERSHIP_FEATURES[membership_type] || []
  end

  def can_learn?
    active? && has_feature?("learning")
  end

  def can_analyze?
    active? && has_feature?("analysis")
  end

  def deduct_conversation!
    return true unless is_usage_based?
    return false unless can_use_conversation?

    decrement!(:remaining_conversations)
    true
  end

  def days_remaining
    return 0 unless active?

    (end_date - Date.current).to_i
  end

  private

  def end_date_after_start_date
    return if end_date.blank? || start_date.blank?

    if end_date < start_date
      errors.add(:end_date, "must be after start date")
    end
  end
end
