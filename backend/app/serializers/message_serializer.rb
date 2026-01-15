# frozen_string_literal: true

class MessageSerializer < BaseSerializer
  def as_json
    {
      id: object.id,
      role: object.role,
      content: object.content,
      has_audio: object.has_audio?,
      audio_duration: object.audio_duration,
      created_at: format_datetime(object.created_at)
    }
  end

  def as_json_with_audio
    return as_json unless object.has_audio?

    as_json.merge(
      audio: {
        data: Base64.strict_encode64(object.audio_data),
        content_type: object.audio_content_type,
        duration: object.audio_duration
      }
    )
  end
end
