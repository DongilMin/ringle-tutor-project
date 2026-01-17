require 'rails_helper'

RSpec.describe 'Api::V1::Admin::Memberships', type: :request do
  let!(:user) { create(:user) }

  describe 'GET /api/v1/admin/memberships' do
    let!(:membership1) { create(:membership, user: user) }
    let!(:user2) { create(:user, email: 'other@example.com') }
    let!(:membership2) { create(:membership, user: user2) }

    it 'returns all memberships from all users' do
      get '/api/v1/admin/memberships'

      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json['success']).to be true
      expect(json['data'].length).to eq(2)
    end
  end

  describe 'GET /api/v1/admin/memberships/:id' do
    let!(:membership) { create(:membership, user: user) }

    it 'returns the membership' do
      get "/api/v1/admin/memberships/#{membership.id}"

      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json['data']['id']).to eq(membership.id)
    end
  end

  describe 'POST /api/v1/admin/memberships' do
    let(:valid_params) do
      {
        user_id: user.id,
        membership: {
          membership_type: 'premium',
          start_date: Date.current,
          end_date: Date.current + 30.days,
          status: 'active'
        }
      }
    end

    context 'with valid parameters' do
      it 'creates a new membership' do
        expect {
          post '/api/v1/admin/memberships', params: valid_params
        }.to change(Membership, :count).by(1)

        expect(response).to have_http_status(:created)

        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']['membership_type']).to eq('premium')
      end
    end

    context 'with invalid parameters' do
      it 'returns validation errors for invalid membership_type' do
        invalid_params = valid_params.deep_merge(membership: { membership_type: 'invalid' })

        post '/api/v1/admin/memberships', params: invalid_params

        expect(response).to have_http_status(:unprocessable_entity)

        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']['code']).to eq('CREATION_FAILED')
      end

      it 'returns validation errors when end_date is before start_date' do
        invalid_params = valid_params.deep_merge(
          membership: {
            start_date: Date.current,
            end_date: Date.current - 1.day
          }
        )

        post '/api/v1/admin/memberships', params: invalid_params

        expect(response).to have_http_status(:unprocessable_entity)

        json = JSON.parse(response.body)
        expect(json['error']['details']).to include('End date must be after start date')
      end
    end

    context 'with non-existent user' do
      it 'returns not found error' do
        invalid_params = valid_params.merge(user_id: 999999)

        post '/api/v1/admin/memberships', params: invalid_params

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'DELETE /api/v1/admin/memberships/:id' do
    let!(:membership) { create(:membership, user: user, status: 'active') }

    it 'deletes the membership from database' do
      delete "/api/v1/admin/memberships/#{membership.id}"

      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json['success']).to be true
      expect(json['message']).to eq('Membership deleted successfully')

      expect(Membership.find_by(id: membership.id)).to be_nil
    end

    it 'decreases membership count' do
      expect {
        delete "/api/v1/admin/memberships/#{membership.id}"
      }.to change(Membership, :count).by(-1)
    end

    context 'when membership does not exist' do
      it 'returns not found error' do
        delete '/api/v1/admin/memberships/999999'

        expect(response).to have_http_status(:not_found)
      end
    end
  end
end
