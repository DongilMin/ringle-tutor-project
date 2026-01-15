class Membership < ApplicationRecord
  TYPES = %w[basic premium enterprise].freeze
  STATUSES = %w[active expired cancelled].freeze

  belongs_to :user
  has_one :payment

  validates :membership_type, presence: true, inclusion: { in: TYPES }
  validates :start_date, presence: true
  validates :end_date, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }
  validate :end_date_after_start_date

  scope :active, -> { where(status: "active") }
  scope :started, -> { where("start_date <= ?", Date.current) }
  scope :not_expired, -> { where("end_date >= ?", Date.current) }
  scope :currently_valid, -> { active.started.not_expired }

  def active?
    status == "active" &&
      start_date <= Date.current &&
      end_date >= Date.current
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
