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

  before_validation :set_default_title, if: -> { title.blank? }

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
    messages
      .order(:created_at)
      .select(:id, :role, :content, :created_at)
      .map { |msg| { role: msg.role, content: msg.content } }
  end

  private

  def set_default_title
    self.title = "Conversation #{Time.current.strftime('%Y-%m-%d %H:%M')}"
  end
end
