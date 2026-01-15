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
    # Select only needed columns to avoid loading audio_data
    messages_data = object.messages
      .chronological
      .select(:id, :role, :content, :audio_content_type, :audio_duration, :created_at)
      .map { |msg| MessageSerializer.new(msg).as_json }

    as_json.merge(messages: messages_data)
  end
end
