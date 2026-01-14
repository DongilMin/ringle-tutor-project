require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'validations' do
    subject { build(:user) }

    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_uniqueness_of(:email).case_insensitive }

    describe 'email format' do
      it 'accepts valid email' do
        user = build(:user, email: 'test@example.com')
        expect(user).to be_valid
      end

      it 'rejects invalid email without @' do
        user = build(:user, email: 'invalid-email')
        expect(user).not_to be_valid
        expect(user.errors[:email]).to include('is invalid')
      end

      it 'rejects invalid email without domain' do
        user = build(:user, email: 'test@')
        expect(user).not_to be_valid
      end
    end
  end

  describe 'normalizations' do
    it 'normalizes email to lowercase' do
      user = create(:user, email: 'TEST@EXAMPLE.COM')
      expect(user.email).to eq('test@example.com')
    end

    it 'strips whitespace from email' do
      user = create(:user, email: '  test@example.com  ')
      expect(user.email).to eq('test@example.com')
    end
  end

  describe 'uniqueness' do
    it 'prevents duplicate emails (case insensitive)' do
      create(:user, email: 'test@example.com')
      duplicate = build(:user, email: 'TEST@example.com')
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:email]).to include('has already been taken')
    end
  end

  describe 'associations' do
    it { is_expected.to have_many(:memberships).dependent(:destroy) }
  end

  describe '#active_membership' do
    let(:user) { create(:user) }

    context 'when user has active membership' do
      let!(:membership) { create(:membership, user: user, end_date: Date.current + 30) }

      it 'returns the active membership' do
        expect(user.active_membership).to eq(membership)
      end
    end

    context 'when user has multiple active memberships' do
      let!(:short_membership) { create(:membership, user: user, end_date: Date.current + 10) }
      let!(:long_membership) { create(:membership, user: user, end_date: Date.current + 30) }

      it 'returns the membership with latest end_date' do
        expect(user.active_membership).to eq(long_membership)
      end
    end

    context 'when user has no active membership' do
      it 'returns nil' do
        expect(user.active_membership).to be_nil
      end
    end

    context 'when all memberships are expired' do
      let!(:expired) { create(:membership, user: user, start_date: Date.current - 10, end_date: Date.current - 1) }

      it 'returns nil' do
        expect(user.active_membership).to be_nil
      end
    end

    context 'when membership has not started yet' do
      let!(:future) { create(:membership, user: user, start_date: Date.current + 5, end_date: Date.current + 35) }

      it 'returns nil' do
        expect(user.active_membership).to be_nil
      end
    end
  end

  describe '#has_active_membership?' do
    let(:user) { create(:user) }

    context 'with active membership' do
      before { create(:membership, user: user, end_date: Date.current + 30) }

      it 'returns true' do
        expect(user.has_active_membership?).to be true
      end
    end

    context 'without active membership' do
      it 'returns false' do
        expect(user.has_active_membership?).to be false
      end
    end

    context 'with expired membership' do
      before { create(:membership, user: user, start_date: Date.current - 10, end_date: Date.current - 1) }

      it 'returns false' do
        expect(user.has_active_membership?).to be false
      end
    end
  end
end
