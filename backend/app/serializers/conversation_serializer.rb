# frozen_string_literal: true

class ConversationSerializer < BaseSerializer
  def as_json
    {
      id: object.id,
      title: object.title,
      status: object.status,
      message_count: object.messages.count,
      created_at: format_datetime(object.created_at),
      updated_at: format_datetime(object.updated_at)
    }
  end

  def as_json_with_messages
    as_json.merge(
      messages: object.messages.chronological.map do |message|
        MessageSerializer.new(message).as_json
      end
    )
  end
end
