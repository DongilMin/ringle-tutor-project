# frozen_string_literal: true

module Api
  module V1
    class ConversationsController < BaseController
      include MembershipCheck
      include RateLimiter

      before_action :set_conversation, only: [ :show, :messages, :send_message, :send_audio, :stream_message ]
      before_action :check_audio_rate_limit, only: [ :send_audio ]
      before_action :check_text_rate_limit, only: [ :send_message, :stream_message ]

      # GET /api/v1/conversations
      def index
        conversations = current_user.conversations.recent
        render_collection(conversations, serializer: ConversationSerializer)
      end

      # GET /api/v1/conversations/:id
      def show
        render_resource(@conversation, serializer: ConversationSerializer)
      end

      # POST /api/v1/conversations
      def create
        membership = current_user.usable_membership

        unless membership&.can_use_conversation?
          return render_error(
            message: "No available conversation credits",
            status: :forbidden,
            code: "NO_CONVERSATION_CREDITS"
          )
        end

        conversation = current_user.conversations.create!(title: conversation_params[:title])

        # Deduct conversation credit for usage-based plans
        membership.deduct_conversation!

        render_resource(
          conversation,
          serializer: ConversationSerializer,
          status: :created,
          meta: {
            remaining_conversations: membership.is_usage_based? ? membership.remaining_conversations : nil
          }
        )
      end

      # GET /api/v1/conversations/:id/messages
      def messages
        messages = @conversation.messages.chronological
        render_collection(messages, serializer: MessageSerializer)
      end

      # POST /api/v1/conversations/:id/messages
      def send_message
        result = conversation_service.process_text(@conversation, message_params[:content])
        render_success(data: result, status: :created)
      rescue ConversationService::ProcessingError => e
        render_error(message: e.message, status: :unprocessable_entity, code: "processing_error")
      end

      # POST /api/v1/conversations/:id/audio
      def send_audio
        validate_audio_params!

        audio_data = decode_audio_data
        result = conversation_service.process_audio(
          @conversation,
          audio_data,
          content_type: audio_params[:content_type]
        )

        render_success(data: result, status: :created)
      rescue ConversationService::ProcessingError => e
        Rails.logger.error("ConversationService::ProcessingError: #{e.message}")
        render_error(message: e.message, status: :unprocessable_entity, code: "processing_error")
      rescue ArgumentError => e
        Rails.logger.error("ArgumentError: #{e.message}")
        render_error(message: e.message, status: :bad_request, code: "invalid_audio")
      rescue StandardError => e
        Rails.logger.error("Unexpected error in send_audio: #{e.class} - #{e.message}")
        Rails.logger.error(e.backtrace.first(10).join("\n"))
        render_error(message: "Server error: #{e.message}", status: :internal_server_error, code: "server_error")
      end

      # POST /api/v1/conversations/:id/stream
      # SSE streaming endpoint for real-time LLM responses
      def stream_message
        response.headers["Content-Type"] = "text/event-stream"
        response.headers["Cache-Control"] = "no-cache"
        response.headers["X-Accel-Buffering"] = "no"

        # Create user message first
        user_message = @conversation.messages.create!(
          role: "user",
          content: message_params[:content]
        )

        # Send user message event
        response.stream.write("event: user_message\n")
        response.stream.write("data: #{user_message.to_json}\n\n")

        # Get conversation context
        context = @conversation.messages.where.not(id: user_message.id).chronological.map do |m|
          { role: m.role, content: m.content }
        end

        full_response = ""

        # Stream LLM response (use memoized service)
        llm_service.chat_stream(message_params[:content], context: context) do |chunk|
          full_response += chunk
          response.stream.write("event: chunk\n")
          response.stream.write("data: #{chunk.to_json}\n\n")
        end

        # Create assistant message
        assistant_message = @conversation.messages.create!(
          role: "assistant",
          content: full_response
        )

        # Generate TTS for the response (use memoized service)
        tts_result = tts_service.synthesize(full_response)
        audio_base64 = Base64.strict_encode64(tts_result[:audio_data])

        # Send completion event with audio
        completion_data = {
          assistant_message: assistant_message.as_json,
          audio: {
            data: audio_base64,
            content_type: tts_result[:content_type] || "audio/mpeg"
          }
        }
        response.stream.write("event: complete\n")
        response.stream.write("data: #{completion_data.to_json}\n\n")
      rescue StandardError => e
        Rails.logger.error("Stream error: #{e.message}")
        response.stream.write("event: error\n")
        response.stream.write("data: #{e.message.to_json}\n\n")
      ensure
        response.stream.close
      end

      private

      def set_conversation
        @conversation = current_user.conversations.find(params[:id])
      end

      def conversation_params
        # Handle both direct params and nested conversation params
        if params[:conversation].present?
          params.require(:conversation).permit(:title)
        else
          params.permit(:title)
        end
      end

      def message_params
        params.require(:message).permit(:content)
      end

      def audio_params
        params.require(:audio).permit(:data, :content_type)
      end

      def validate_audio_params!
        raise ArgumentError, "Audio data is required" if audio_params[:data].blank?
        raise ArgumentError, "Content type is required" if audio_params[:content_type].blank?
      end

      def decode_audio_data
        Base64.strict_decode64(audio_params[:data])
      rescue ArgumentError
        raise ArgumentError, "Invalid base64 audio data"
      end

      def conversation_service
        @conversation_service ||= ConversationService.new(
          llm_service: llm_service,
          tts_service: tts_service
        )
      end

      def llm_service
        @llm_service ||= LlmService.new
      end

      def tts_service
        @tts_service ||= TtsService.new
      end

      def check_audio_rate_limit
        limits = check_rate_limit!(:audio)
        set_rate_limit_headers(limits)
      end

      def check_text_rate_limit
        limits = check_rate_limit!(:text)
        set_rate_limit_headers(limits)
      end
    end
  end
end
