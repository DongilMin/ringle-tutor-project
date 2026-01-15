# frozen_string_literal: true

class ConversationService
  class ConversationError < StandardError; end
  class ProcessingError < ConversationError; end

  def initialize(stt_service: nil, llm_service: nil, tts_service: nil)
    @stt_service = stt_service || SttService.new
    @llm_service = llm_service || LlmService.new
    @tts_service = tts_service || TtsService.new
  end

  def process_audio(conversation, audio_data, content_type: "audio/webm")
    # Step 1: STT - Convert audio to text
    stt_result = transcribe_audio(audio_data, content_type)
    user_text = stt_result[:text]

    # Step 2: Save user message
    user_message = save_user_message(conversation, user_text)

    # Step 3: LLM - Generate AI response
    llm_result = generate_response(conversation)
    assistant_text = llm_result[:message]

    # Step 4: TTS - Convert response to audio
    tts_result = synthesize_speech(assistant_text)

    # Step 5: Save assistant message with audio
    assistant_message = save_assistant_message(
      conversation,
      assistant_text,
      tts_result[:audio_data],
      tts_result[:content_type],
      tts_result[:duration]
    )

    build_response(user_message, assistant_message, tts_result)
  rescue SttService::SttError => e
    raise ProcessingError, "Speech recognition failed: #{e.message}"
  rescue LlmService::LlmError => e
    raise ProcessingError, "AI response generation failed: #{e.message}"
  rescue TtsService::TtsError => e
    raise ProcessingError, "Speech synthesis failed: #{e.message}"
  end

  def process_text(conversation, user_text)
    # Step 1: Save user message
    user_message = save_user_message(conversation, user_text)

    # Step 2: LLM - Generate AI response
    llm_result = generate_response(conversation)
    assistant_text = llm_result[:message]

    # Step 3: TTS - Convert response to audio
    tts_result = synthesize_speech(assistant_text)

    # Step 4: Save assistant message with audio
    assistant_message = save_assistant_message(
      conversation,
      assistant_text,
      tts_result[:audio_data],
      tts_result[:content_type],
      tts_result[:duration]
    )

    build_response(user_message, assistant_message, tts_result)
  rescue LlmService::LlmError => e
    raise ProcessingError, "AI response generation failed: #{e.message}"
  rescue TtsService::TtsError => e
    raise ProcessingError, "Speech synthesis failed: #{e.message}"
  end

  private

  def transcribe_audio(audio_data, content_type)
    @stt_service.transcribe(audio_data, content_type: content_type)
  end

  def generate_response(conversation)
    context = conversation.message_history
    last_user_message = context.last[:content]
    @llm_service.chat(last_user_message, context: context[0..-2])
  end

  def synthesize_speech(text)
    @tts_service.synthesize(text)
  end

  def save_user_message(conversation, text)
    conversation.messages.create!(
      role: Message::ROLES[:user],
      content: text
    )
  end

  def save_assistant_message(conversation, text, audio_data, content_type, duration)
    conversation.messages.create!(
      role: Message::ROLES[:assistant],
      content: text,
      audio_data: audio_data,
      audio_content_type: content_type,
      audio_duration: duration
    )
  end

  def build_response(user_message, assistant_message, tts_result)
    {
      user_message: {
        id: user_message.id,
        content: user_message.content,
        role: user_message.role,
        created_at: user_message.created_at
      },
      assistant_message: {
        id: assistant_message.id,
        content: assistant_message.content,
        role: assistant_message.role,
        created_at: assistant_message.created_at,
        audio_duration: tts_result[:duration]
      },
      audio: {
        data: Base64.strict_encode64(tts_result[:audio_data]),
        content_type: tts_result[:content_type],
        duration: tts_result[:duration]
      }
    }
  end
end
