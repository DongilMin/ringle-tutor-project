# frozen_string_literal: true

module Expirable
  extend ActiveSupport::Concern

  included do
    scope :expired_but_active, -> {
      where(status: "active")
        .where("end_date < ?", Date.current)
    }
  end

  class_methods do
    def expire_all!
      count = expired_but_active.update_all(status: "expired")
      Rails.logger.info("Expired #{count} memberships")
      count
    end
  end

  def check_and_expire!
    return false unless should_expire?

    update!(status: "expired")
    true
  end

  def should_expire?
    status == "active" && end_date < Date.current
  end
end
