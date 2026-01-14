require 'rails_helper'

RSpec.describe Membership, type: :model do
  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'validations' do
    subject { build(:membership) }

    it { is_expected.to validate_presence_of(:membership_type) }
    it { is_expected.to validate_presence_of(:start_date) }
    it { is_expected.to validate_presence_of(:end_date) }
    it { is_expected.to validate_presence_of(:status) }

    it { is_expected.to validate_inclusion_of(:membership_type).in_array(Membership::TYPES) }
    it { is_expected.to validate_inclusion_of(:status).in_array(Membership::STATUSES) }

    describe 'end_date validation' do
      it 'is invalid when end_date is before start_date' do
        membership = build(:membership, start_date: Date.current, end_date: Date.current - 1.day)
        expect(membership).not_to be_valid
        expect(membership.errors[:end_date]).to include('must be after start date')
      end

      it 'is valid when end_date equals start_date' do
        membership = build(:membership, start_date: Date.current, end_date: Date.current)
        expect(membership).to be_valid
      end
    end
  end

  describe '#active?' do
    let(:user) { create(:user) }

    context 'boundary value tests (과제 핵심!)' do
      it 'returns false when expired yesterday' do
        membership = create(:membership,
          user: user,
          start_date: 30.days.ago,
          end_date: Date.current - 1.day,
          status: 'active'
        )
        expect(membership.active?).to be false
      end

      it 'returns true when expires today' do
        membership = create(:membership,
          user: user,
          start_date: 30.days.ago,
          end_date: Date.current,
          status: 'active'
        )
        expect(membership.active?).to be true
      end

      it 'returns true when expires tomorrow' do
        membership = create(:membership,
          user: user,
          start_date: 30.days.ago,
          end_date: Date.current + 1.day,
          status: 'active'
        )
        expect(membership.active?).to be true
      end

      it 'returns false when start_date is tomorrow (not yet started)' do
        membership = create(:membership,
          user: user,
          start_date: Date.current + 1.day,
          end_date: Date.current + 31.days,
          status: 'active'
        )
        expect(membership.active?).to be false
      end
    end

    context 'status checks' do
      it 'returns false when status is expired' do
        membership = create(:membership,
          user: user,
          start_date: 30.days.ago,
          end_date: Date.current + 30.days,
          status: 'expired'
        )
        expect(membership.active?).to be false
      end

      it 'returns false when status is cancelled' do
        membership = create(:membership,
          user: user,
          start_date: 30.days.ago,
          end_date: Date.current + 30.days,
          status: 'cancelled'
        )
        expect(membership.active?).to be false
      end
    end
  end

  describe '#days_remaining' do
    let(:user) { create(:user) }

    it 'returns correct days for active membership' do
      membership = create(:membership,
        user: user,
        start_date: Date.current,
        end_date: Date.current + 10.days,
        status: 'active'
      )
      expect(membership.days_remaining).to eq(10)
    end

    it 'returns 0 for expired membership' do
      membership = create(:membership,
        user: user,
        start_date: 30.days.ago,
        end_date: Date.current - 1.day,
        status: 'active'
      )
      expect(membership.days_remaining).to eq(0)
    end
  end

  describe 'scopes' do
    let(:user) { create(:user) }

    describe '.active' do
      it 'returns only active status memberships' do
        active = create(:membership, user: user, status: 'active')
        create(:membership, user: user, status: 'expired')
        create(:membership, user: user, status: 'cancelled')

        expect(Membership.active).to contain_exactly(active)
      end
    end

    describe '.not_expired' do
      it 'returns memberships with end_date >= today' do
        valid = create(:membership, user: user, end_date: Date.current)
        future = create(:membership, user: user, end_date: Date.current + 10.days)
        create(:membership, user: user, start_date: 30.days.ago, end_date: Date.current - 1.day)

        expect(Membership.not_expired).to contain_exactly(valid, future)
      end
    end
  end
end
