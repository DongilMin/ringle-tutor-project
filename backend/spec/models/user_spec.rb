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
end
