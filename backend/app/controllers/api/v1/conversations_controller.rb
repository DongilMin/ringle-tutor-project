# frozen_string_literal: true

module Api
  module V1
    class ConversationsController < BaseController
      include MembershipCheck

      before_action :set_conversation, only: [ :show, :messages, :send_message, :send_audio ]

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
        conversation = current_user.conversations.create!(title: conversation_params[:title])
        render_resource(conversation, serializer: ConversationSerializer, status: :created)
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
        render_error(message: e.message, status: :unprocessable_entity, code: "processing_error")
      rescue ArgumentError => e
        render_error(message: e.message, status: :bad_request, code: "invalid_audio")
      end

      private

      def set_conversation
        @conversation = current_user.conversations.find(params[:id])
      end

      def conversation_params
        params.permit(:title)
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
        @conversation_service ||= ConversationService.new
      end
    end
  end
end
