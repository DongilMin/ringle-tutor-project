require 'rails_helper'

RSpec.describe 'Api::V1::Payments', type: :request do
  let!(:user) { create(:user) }

  describe 'POST /api/v1/payments' do
    let(:valid_params) do
      {
        payment: {
          membership_type: 'basic',
          payment_method: 'credit_card'
        }
      }
    end

    context 'when payment succeeds' do
      before do
        allow_any_instance_of(MockPgClient).to receive(:charge).and_return(
          success: true,
          transaction_id: 'TXN_TEST_123'
        )
      end

      it 'returns 201 created' do
        post '/api/v1/payments', params: valid_params

        expect(response).to have_http_status(:created)
      end

      it 'returns payment and membership data' do
        post '/api/v1/payments', params: valid_params

        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']['payment']).to be_present
        expect(json['data']['membership']).to be_present
      end

      it 'creates payment with correct amount' do
        post '/api/v1/payments', params: valid_params

        json = JSON.parse(response.body)
        expect(json['data']['payment']['amount']).to eq(29_900.0)
        expect(json['data']['payment']['status']).to eq('completed')
      end

      it 'creates active membership' do
        post '/api/v1/payments', params: valid_params

        json = JSON.parse(response.body)
        expect(json['data']['membership']['membership_type']).to eq('basic')
        expect(json['data']['membership']['is_active']).to be true
      end
    end

    context 'when payment fails' do
      before do
        allow_any_instance_of(MockPgClient).to receive(:charge).and_return(
          success: false,
          error: 'Card declined'
        )
      end

      it 'returns 422 unprocessable entity' do
        post '/api/v1/payments', params: valid_params

        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'returns error message' do
        post '/api/v1/payments', params: valid_params

        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']['code']).to eq('PAYMENT_FAILED')
      end

      it 'returns failed payment data' do
        post '/api/v1/payments', params: valid_params

        json = JSON.parse(response.body)
        expect(json['data']['payment']['status']).to eq('failed')
      end
    end

    context 'with invalid membership type' do
      let(:invalid_params) do
        {
          payment: {
            membership_type: 'invalid',
            payment_method: 'credit_card'
          }
        }
      end

      it 'returns 422 with error' do
        post '/api/v1/payments', params: invalid_params

        expect(response).to have_http_status(:unprocessable_entity)

        json = JSON.parse(response.body)
        expect(json['error']['message']).to include('Invalid membership type')
      end
    end
  end

  describe 'GET /api/v1/payments' do
    let!(:payment1) { create(:payment, user: user, created_at: 1.day.ago) }
    let!(:payment2) { create(:payment, :completed, user: user, created_at: Time.current) }

    it 'returns user payments ordered by created_at desc' do
      get '/api/v1/payments'

      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json['data'].length).to eq(2)
      expect(json['data'][0]['id']).to eq(payment2.id)
    end
  end

  describe 'GET /api/v1/payments/:id' do
    let!(:payment) { create(:payment, :completed, user: user) }

    it 'returns the payment' do
      get "/api/v1/payments/#{payment.id}"

      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json['data']['id']).to eq(payment.id)
    end

    context 'when payment does not exist' do
      it 'returns 404' do
        get '/api/v1/payments/999999'

        expect(response).to have_http_status(:not_found)
      end
    end
  end
end
