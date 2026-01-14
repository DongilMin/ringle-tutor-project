class User < ApplicationRecord
  EMAIL_REGEX = /\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i

  has_many :memberships, dependent: :destroy
  has_many :payments, dependent: :destroy

  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: EMAIL_REGEX }
  validates :name, presence: true

  normalizes :email, with: ->(email) { email.strip.downcase }

  def active_membership
    memberships.currently_valid.order(end_date: :desc).first
  end

  def has_active_membership?
    active_membership.present?
  end
end
