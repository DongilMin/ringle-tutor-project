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
end
