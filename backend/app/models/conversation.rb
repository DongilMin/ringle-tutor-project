# frozen_string_literal: true

class Conversation < ApplicationRecord
  belongs_to :user
  has_many :messages, dependent: :destroy

  STATUSES = {
    active: "active",
    completed: "completed",
    archived: "archived"
  }.freeze

  validates :status, presence: true, inclusion: { in: STATUSES.values }

  scope :active, -> { where(status: STATUSES[:active]) }
  scope :recent, -> { order(updated_at: :desc) }

  def complete!
    update!(status: STATUSES[:completed])
  end

  def archive!
    update!(status: STATUSES[:archived])
  end

  def active?
    status == STATUSES[:active]
  end

  def message_history
    messages.order(:created_at).map do |msg|
      { role: msg.role, content: msg.content }
    end
  end
end
