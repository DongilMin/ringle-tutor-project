class User < ApplicationRecord
  EMAIL_REGEX = /\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i

  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: EMAIL_REGEX }
  validates :name, presence: true

  normalizes :email, with: ->(email) { email.strip.downcase }
end
