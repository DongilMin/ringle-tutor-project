require 'rails_helper'

RSpec.describe PaymentService do
  let(:user) { create(:user) }
  let(:membership_type) { 'basic' }
  let(:payment_method) { 'credit_card' }

  subject(:service) do
    described_class.new(
      user: user,
      membership_type: membership_type,
      payment_method: payment_method
    )
  end

  describe '#process' do
    context 'when payment succeeds' do
      before do
        allow_any_instance_of(MockPgClient).to receive(:charge).and_return(
          success: true,
          transaction_id: 'TXN_TEST_123'
        )
      end

      it 'creates a completed payment' do
        result = service.process

        expect(result[:success]).to be true
        expect(result[:payment]).to be_persisted
        expect(result[:payment].status).to eq('completed')
        expect(result[:payment].transaction_id).to eq('TXN_TEST_123')
      end

      it 'creates a membership with correct type' do
        result = service.process

        expect(result[:membership]).to be_persisted
        expect(result[:membership].membership_type).to eq('basic')
        expect(result[:membership].status).to eq('active')
      end

      it 'sets correct membership duration (30 days)' do
        result = service.process

        expect(result[:membership].start_date).to eq(Date.current)
        expect(result[:membership].end_date).to eq(Date.current + 30.days)
      end

      it 'sets correct amount based on membership type' do
        result = service.process

        expect(result[:payment].amount).to eq(29_900)
      end

      context 'with premium membership' do
        let(:membership_type) { 'premium' }

        it 'charges premium price' do
          result = service.process

          expect(result[:payment].amount).to eq(59_900)
        end
      end

      context 'with enterprise membership' do
        let(:membership_type) { 'enterprise' }

        it 'charges enterprise price' do
          result = service.process

          expect(result[:payment].amount).to eq(99_900)
        end
      end
    end

    context 'when payment fails' do
      before do
        allow_any_instance_of(MockPgClient).to receive(:charge).and_return(
          success: false,
          error: 'Card declined'
        )
      end

      it 'creates a failed payment' do
        result = service.process

        expect(result[:success]).to be false
        expect(result[:payment].status).to eq('failed')
      end

      it 'does not create a membership' do
        expect { service.process }.not_to change(Membership, :count)
      end

      it 'returns error message' do
        result = service.process

        expect(result[:error]).to eq('Card declined')
      end
    end

    context 'with invalid membership type' do
      let(:membership_type) { 'invalid_type' }

      it 'returns error without creating records' do
        expect { service.process }.not_to change(Payment, :count)

        result = service.process
        expect(result[:success]).to be false
        expect(result[:error]).to include('Invalid membership type')
      end
    end

    context 'transaction rollback' do
      before do
        allow_any_instance_of(MockPgClient).to receive(:charge).and_return(
          success: true,
          transaction_id: 'TXN_TEST_123'
        )
        # 멤버십 생성 실패 시뮬레이션
        allow_any_instance_of(User).to receive_message_chain(:memberships, :create!)
          .and_raise(ActiveRecord::RecordInvalid)
      end

      it 'rolls back payment on membership creation failure' do
        expect { service.process }.to raise_error(ActiveRecord::RecordInvalid)

        # 트랜잭션 롤백으로 payment도 생성되지 않아야 함
        expect(Payment.count).to eq(0)
      end
    end
  end

  describe 'MockPgClient integration' do
    it 'calls PG with correct parameters' do
      mock_client = instance_double(MockPgClient)
      allow(MockPgClient).to receive(:new).and_return(mock_client)
      allow(mock_client).to receive(:charge).and_return(
        success: true,
        transaction_id: 'TXN_123'
      )

      service.process

      expect(mock_client).to have_received(:charge).with(
        hash_including(
          amount: 29_900,
          payment_method: 'credit_card'
        )
      )
    end
  end
end
