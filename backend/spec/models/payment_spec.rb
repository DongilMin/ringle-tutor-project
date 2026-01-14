require 'rails_helper'

RSpec.describe Payment, type: :model do
  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'validations' do
    subject { build(:payment) }

    it { is_expected.to validate_presence_of(:amount) }
    it { is_expected.to validate_numericality_of(:amount).is_greater_than(0) }
    it { is_expected.to validate_presence_of(:status) }
    it { is_expected.to validate_presence_of(:payment_method) }

    it { is_expected.to validate_inclusion_of(:status).in_array(Payment::STATUSES) }
    it { is_expected.to validate_inclusion_of(:payment_method).in_array(Payment::PAYMENT_METHODS) }

    describe 'transaction_id uniqueness' do
      it 'allows nil transaction_id' do
        payment = build(:payment, transaction_id: nil)
        expect(payment).to be_valid
      end

      it 'enforces uniqueness when transaction_id is present' do
        create(:payment, :completed, transaction_id: 'TXN_123')
        duplicate = build(:payment, transaction_id: 'TXN_123')
        expect(duplicate).not_to be_valid
        expect(duplicate.errors[:transaction_id]).to include('has already been taken')
      end
    end

    describe 'amount validation' do
      it 'rejects zero amount' do
        payment = build(:payment, amount: 0)
        expect(payment).not_to be_valid
      end

      it 'rejects negative amount' do
        payment = build(:payment, amount: -100)
        expect(payment).not_to be_valid
      end
    end
  end

  describe 'scopes' do
    let(:user) { create(:user) }

    describe '.pending' do
      it 'returns only pending payments' do
        pending_payment = create(:payment, user: user, status: 'pending')
        create(:payment, :completed, user: user)
        create(:payment, :failed, user: user)

        expect(Payment.pending).to contain_exactly(pending_payment)
      end
    end

    describe '.completed' do
      it 'returns only completed payments' do
        completed = create(:payment, :completed, user: user)
        create(:payment, user: user, status: 'pending')

        expect(Payment.completed).to contain_exactly(completed)
      end
    end

    describe '.failed' do
      it 'returns only failed payments' do
        failed = create(:payment, :failed, user: user)
        create(:payment, user: user, status: 'pending')

        expect(Payment.failed).to contain_exactly(failed)
      end
    end
  end

  describe '#complete!' do
    let(:payment) { create(:payment) }

    it 'updates status to completed and sets transaction_id' do
      payment.complete!('TXN_ABC123')

      expect(payment.status).to eq('completed')
      expect(payment.transaction_id).to eq('TXN_ABC123')
    end

    context 'when transaction_id is nil' do
      it 'raises ArgumentError' do
        expect {
          payment.complete!(nil)
        }.to raise_error(ArgumentError, 'transaction_id is required')
      end
    end

    context 'when transaction_id is blank' do
      it 'raises ArgumentError' do
        expect {
          payment.complete!('')
        }.to raise_error(ArgumentError, 'transaction_id is required')
      end
    end

    context 'idempotency' do
      it 'allows duplicate complete! with same transaction_id' do
        payment.complete!('TXN_123')
        expect { payment.complete!('TXN_123') }.not_to raise_error
        expect(payment.transaction_id).to eq('TXN_123')
      end

      it 'raises error on different transaction_id' do
        payment.complete!('TXN_123')
        expect {
          payment.complete!('TXN_456')
        }.to raise_error(PaymentError, /already completed with different transaction_id/)
      end
    end

    context 'state transition validation' do
      it 'raises error when payment is already failed' do
        payment.fail!
        expect {
          payment.complete!('TXN_123')
        }.to raise_error(PaymentError, /Cannot complete payment with status 'failed'/)
      end

      it 'raises error when payment is already refunded' do
        payment.complete!('TXN_123')
        payment.refund!
        expect {
          payment.complete!('TXN_456')
        }.to raise_error(PaymentError, /Cannot complete payment with status 'refunded'/)
      end
    end
  end

  describe '#fail!' do
    let(:payment) { create(:payment) }

    it 'updates status to failed' do
      payment.fail!

      expect(payment.status).to eq('failed')
    end

    context 'state transition validation' do
      it 'raises error when payment is already completed' do
        payment.complete!('TXN_123')
        expect {
          payment.fail!
        }.to raise_error(PaymentError, /Cannot fail payment with status 'completed'/)
      end

      it 'raises error when payment is already refunded' do
        payment.complete!('TXN_123')
        payment.refund!
        expect {
          payment.fail!
        }.to raise_error(PaymentError, /Cannot fail payment with status 'refunded'/)
      end
    end
  end

  describe '#refund!' do
    let(:payment) { create(:payment, :completed) }

    it 'updates status to refunded' do
      payment.refund!

      expect(payment.status).to eq('refunded')
    end

    context 'state transition validation' do
      it 'raises error when payment is pending' do
        pending_payment = create(:payment, status: 'pending')
        expect {
          pending_payment.refund!
        }.to raise_error(PaymentError, /Cannot refund payment with status 'pending'/)
      end

      it 'raises error when payment is failed' do
        failed_payment = create(:payment, :failed)
        expect {
          failed_payment.refund!
        }.to raise_error(PaymentError, /Cannot refund payment with status 'failed'/)
      end

      it 'raises error when payment is already refunded' do
        payment.refund!
        expect {
          payment.refund!
        }.to raise_error(PaymentError, /Cannot refund payment with status 'refunded'/)
      end
    end
  end

  describe 'optimistic locking' do
    it 'prevents race condition with concurrent updates' do
      payment1 = Payment.find(create(:payment).id)
      payment2 = Payment.find(payment1.id)

      payment1.complete!('TXN_123')

      expect {
        payment2.fail!
      }.to raise_error(ActiveRecord::StaleObjectError)
    end
  end
end
