require 'rails_helper'

RSpec.describe 'Api::V1::Conversations', type: :request do
  describe 'MembershipCheck concern' do
    let!(:user) { create(:user) }

    context 'when user has active membership' do
      let!(:active_membership) do
        create(:membership,
          user: user,
          start_date: 10.days.ago,
          end_date: 20.days.from_now,
          status: 'active'
        )
      end

      it 'allows access to GET /conversations' do
        get '/api/v1/conversations'

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['success']).to be true
      end

      it 'allows access to POST /conversations' do
        post '/api/v1/conversations'

        expect(response).to have_http_status(:created)
      end
    end

    context 'when user has no membership' do
      it 'returns 403 forbidden' do
        get '/api/v1/conversations'

        expect(response).to have_http_status(:forbidden)

        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']['code']).to eq('MEMBERSHIP_REQUIRED')
      end
    end

    context 'when user has expired membership' do
      let!(:expired_membership) do
        create(:membership,
          user: user,
          start_date: 60.days.ago,
          end_date: 1.day.ago,
          status: 'active'
        )
      end

      it 'returns 403 forbidden' do
        get '/api/v1/conversations'

        expect(response).to have_http_status(:forbidden)

        json = JSON.parse(response.body)
        expect(json['error']['code']).to eq('MEMBERSHIP_REQUIRED')
      end
    end

    context 'when user has cancelled membership' do
      let!(:cancelled_membership) do
        create(:membership,
          user: user,
          start_date: 10.days.ago,
          end_date: 20.days.from_now,
          status: 'cancelled'
        )
      end

      it 'returns 403 forbidden' do
        get '/api/v1/conversations'

        expect(response).to have_http_status(:forbidden)
      end
    end

    context 'when user has future membership (not yet started)' do
      let!(:future_membership) do
        create(:membership,
          user: user,
          start_date: 1.day.from_now,
          end_date: 31.days.from_now,
          status: 'active'
        )
      end

      it 'returns 403 forbidden' do
        get '/api/v1/conversations'

        expect(response).to have_http_status(:forbidden)
      end
    end

    context 'boundary: membership expires today' do
      let!(:expiring_today) do
        create(:membership,
          user: user,
          start_date: 30.days.ago,
          end_date: Date.current,
          status: 'active'
        )
      end

      it 'allows access (valid until end of day)' do
        get '/api/v1/conversations'

        expect(response).to have_http_status(:ok)
      end
    end

    context 'boundary: membership starts today' do
      let!(:starting_today) do
        create(:membership,
          user: user,
          start_date: Date.current,
          end_date: 30.days.from_now,
          status: 'active'
        )
      end

      it 'allows access' do
        get '/api/v1/conversations'

        expect(response).to have_http_status(:ok)
      end
    end
  end

  describe 'Conversation CRUD' do
    let!(:user) { create(:user) }
    let!(:membership) { create(:membership, :active, user: user) }

    describe 'GET /api/v1/conversations' do
      it 'returns empty array when no conversations exist' do
        get '/api/v1/conversations'

        expect(response).to have_http_status(:ok)
        expect(json_response['data']).to eq([])
      end

      it 'returns list of conversations' do
        create_list(:conversation, 3, user: user)

        get '/api/v1/conversations'

        expect(json_response['data'].length).to eq(3)
      end

      it 'returns conversations ordered by most recent' do
        old_conversation = create(:conversation, user: user, updated_at: 1.day.ago)
        new_conversation = create(:conversation, user: user, updated_at: Time.current)

        get '/api/v1/conversations'

        expect(json_response['data'].first['id']).to eq(new_conversation.id)
      end

      it 'only returns conversations for current user' do
        other_user = create(:user)
        create(:conversation, user: other_user)
        create(:conversation, user: user)

        get '/api/v1/conversations'

        expect(json_response['data'].length).to eq(1)
      end
    end

    describe 'GET /api/v1/conversations/:id' do
      let(:conversation) { create(:conversation, user: user) }

      it 'returns conversation details' do
        get "/api/v1/conversations/#{conversation.id}"

        expect(response).to have_http_status(:ok)
        expect(json_response['data']['id']).to eq(conversation.id)
        expect(json_response['data']['status']).to eq('active')
      end

      it 'returns 404 for non-existent conversation' do
        get '/api/v1/conversations/999999'

        expect(response).to have_http_status(:not_found)
      end

      it 'returns 404 for conversation owned by another user' do
        other_user = create(:user)
        other_conversation = create(:conversation, user: other_user)

        get "/api/v1/conversations/#{other_conversation.id}"

        expect(response).to have_http_status(:not_found)
      end
    end

    describe 'POST /api/v1/conversations' do
      it 'creates a new conversation with title' do
        expect {
          post '/api/v1/conversations', params: { title: 'English Practice' }
        }.to change(Conversation, :count).by(1)

        expect(response).to have_http_status(:created)
        expect(json_response['data']['title']).to eq('English Practice')
      end

      it 'creates conversation without title' do
        post '/api/v1/conversations'

        expect(response).to have_http_status(:created)
        expect(json_response['data']['title']).to be_nil
      end
    end
  end

  describe 'Conversation Messages' do
    let!(:user) { create(:user) }
    let!(:membership) { create(:membership, :active, user: user) }
    let!(:conversation) { create(:conversation, user: user) }

    describe 'GET /api/v1/conversations/:id/messages' do
      it 'returns empty array when no messages' do
        get "/api/v1/conversations/#{conversation.id}/messages"

        expect(response).to have_http_status(:ok)
        expect(json_response['data']).to eq([])
      end

      it 'returns messages in chronological order' do
        old_message = create(:message, conversation: conversation, created_at: 1.hour.ago)
        new_message = create(:message, conversation: conversation, created_at: Time.current)

        get "/api/v1/conversations/#{conversation.id}/messages"

        expect(json_response['data'].first['id']).to eq(old_message.id)
        expect(json_response['data'].last['id']).to eq(new_message.id)
      end
    end

    describe 'POST /api/v1/conversations/:id/messages' do
      it 'processes text message and returns AI response' do
        post "/api/v1/conversations/#{conversation.id}/messages",
             params: { message: { content: 'Hello, how are you?' } }

        expect(response).to have_http_status(:created)
        expect(json_response['data']['user_message']['content']).to eq('Hello, how are you?')
        expect(json_response['data']['assistant_message']['content']).to be_present
        expect(json_response['data']['audio']['data']).to be_present
      end

      it 'creates user and assistant messages' do
        expect {
          post "/api/v1/conversations/#{conversation.id}/messages",
               params: { message: { content: 'Hello' } }
        }.to change(Message, :count).by(2)
      end

      it 'returns error for blank message' do
        post "/api/v1/conversations/#{conversation.id}/messages",
             params: { message: { content: '' } }

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe 'Conversation Audio' do
    let!(:user) { create(:user) }
    let!(:membership) { create(:membership, :active, user: user) }
    let!(:conversation) { create(:conversation, user: user) }
    let(:valid_audio_data) { Base64.strict_encode64('fake_audio_data') }

    describe 'POST /api/v1/conversations/:id/audio' do
      it 'processes audio and returns AI response' do
        post "/api/v1/conversations/#{conversation.id}/audio",
             params: {
               audio: {
                 data: valid_audio_data,
                 content_type: 'audio/webm'
               }
             }

        expect(response).to have_http_status(:created)
        expect(json_response['data']['user_message']['content']).to be_present
        expect(json_response['data']['assistant_message']['content']).to be_present
        expect(json_response['data']['audio']['data']).to be_present
      end

      it 'creates user and assistant messages' do
        expect {
          post "/api/v1/conversations/#{conversation.id}/audio",
               params: {
                 audio: {
                   data: valid_audio_data,
                   content_type: 'audio/webm'
                 }
               }
        }.to change(Message, :count).by(2)
      end

      it 'returns error for missing audio data' do
        post "/api/v1/conversations/#{conversation.id}/audio",
             params: { audio: { content_type: 'audio/webm' } }

        expect(response).to have_http_status(:bad_request)
        expect(json_response['error']['code']).to eq('invalid_audio')
      end

      it 'returns error for missing content type' do
        post "/api/v1/conversations/#{conversation.id}/audio",
             params: { audio: { data: valid_audio_data } }

        expect(response).to have_http_status(:bad_request)
      end

      it 'returns error for invalid base64 data' do
        post "/api/v1/conversations/#{conversation.id}/audio",
             params: {
               audio: {
                 data: 'not_valid_base64!!!',
                 content_type: 'audio/webm'
               }
             }

        expect(response).to have_http_status(:bad_request)
        expect(json_response['error']['message']).to include('Invalid base64')
      end
    end
  end

  private

  def json_response
    JSON.parse(response.body)
  end
end
