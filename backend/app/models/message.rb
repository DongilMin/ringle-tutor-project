# frozen_string_literal: true

class Message < ApplicationRecord
  belongs_to :conversation

  ROLES = {
    user: "user",
    assistant: "assistant"
  }.freeze

  validates :role, presence: true, inclusion: { in: ROLES.values }
  validates :content, presence: true

  scope :chronological, -> { order(:created_at) }

  def user?
    role == ROLES[:user]
  end

  def assistant?
    role == ROLES[:assistant]
  end

  def has_audio?
    audio_data.present?
  end
end
