require 'rails_helper'

RSpec.describe 'Api::V1::Memberships', type: :request do
  let!(:user) { create(:user) }

  describe 'GET /api/v1/memberships' do
    context 'when user has memberships' do
      let!(:membership1) { create(:membership, user: user, created_at: 1.day.ago) }
      let!(:membership2) { create(:membership, user: user, created_at: Time.current) }

      it 'returns all memberships ordered by created_at desc' do
        get '/api/v1/memberships'

        expect(response).to have_http_status(:ok)

        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data'].length).to eq(2)
        expect(json['data'][0]['id']).to eq(membership2.id)
        expect(json['data'][1]['id']).to eq(membership1.id)
      end

      it 'returns membership with correct attributes' do
        get '/api/v1/memberships'

        json = JSON.parse(response.body)
        membership_data = json['data'][0]

        expect(membership_data).to include(
          'id',
          'membership_type',
          'status',
          'start_date',
          'end_date',
          'is_active',
          'days_remaining'
        )
      end
    end

    context 'when user has no memberships' do
      it 'returns empty array' do
        get '/api/v1/memberships'

        expect(response).to have_http_status(:ok)

        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']).to eq([])
      end
    end
  end

  describe 'GET /api/v1/memberships/:id' do
    context 'when membership exists' do
      let!(:membership) { create(:membership, user: user) }

      it 'returns the membership' do
        get "/api/v1/memberships/#{membership.id}"

        expect(response).to have_http_status(:ok)

        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']['id']).to eq(membership.id)
      end
    end

    context 'when membership does not exist' do
      it 'returns not found error' do
        get '/api/v1/memberships/999999'

        expect(response).to have_http_status(:not_found)

        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']['code']).to eq('NOT_FOUND')
      end
    end
  end

  describe 'GET /api/v1/memberships/current' do
    context 'when user has active membership' do
      let!(:active_membership) do
        create(:membership,
          user: user,
          start_date: 10.days.ago,
          end_date: 20.days.from_now,
          status: 'active'
        )
      end

      it 'returns the active membership' do
        get '/api/v1/memberships/current'

        expect(response).to have_http_status(:ok)

        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']['id']).to eq(active_membership.id)
        expect(json['data']['is_active']).to be true
      end
    end

    context 'when user has no active membership' do
      let!(:expired_membership) do
        create(:membership,
          user: user,
          start_date: 30.days.ago,
          end_date: 1.day.ago,
          status: 'active'
        )
      end

      it 'returns not found error' do
        get '/api/v1/memberships/current'

        expect(response).to have_http_status(:not_found)

        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']['code']).to eq('NO_ACTIVE_MEMBERSHIP')
      end
    end
  end
end
