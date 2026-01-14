# Phase 2.1 Review - User Model

## 리뷰 일시
2026-01-15 (Code Review Agent)

## 리뷰 대상 파일
- `backend/db/migrate/20260114153300_create_users.rb`
- `backend/app/models/user.rb`
- `backend/spec/models/user_spec.rb`
- `backend/spec/factories/users.rb`

---

## 발견된 이슈

### 🔴 Critical (즉시 수정 필요)

| 파일 | 라인 | 이슈 | 설명 |
|------|------|------|------|
| user.rb | 14-16 | N+1 Query 가능성 | `active_membership` 메서드가 호출될 때마다 쿼리 실행. 여러 유저의 active_membership을 조회 시 N+1 발생 |
| user_spec.rb | - | 테스트 누락 | `active_membership`, `has_active_membership?` 메서드에 대한 테스트 없음 |

### 🟡 Warning (개선 권장)

| 파일 | 라인 | 이슈 | 설명 |
|------|------|------|------|
| user.rb | 2 | 이메일 검증 약함 | EMAIL_REGEX가 일부 edge case를 놓칠 수 있음 (예: consecutive dots) |
| user.rb | 15 | Scope 체이닝 | `.active.not_expired`가 중복 필터링일 가능성 (Membership 모델 확인 필요) |
| create_users.rb | 4 | 인덱스 부족 | created_at 인덱스 부재로 시간순 정렬 시 성능 저하 가능 |
| user.rb | 14-20 | 결합도 높음 | User가 Membership의 scope(active, not_expired)에 강하게 의존 |

### 🟢 Good Practices (잘된 점)

- ✅ **Email Normalization**: `normalizes :email, with: ->(email) { email.strip.downcase }` 로 데이터 일관성 확보
- ✅ **Cascade Delete**: `dependent: :destroy`로 데이터 무결성 보장
- ✅ **Case-Insensitive Uniqueness**: 중복 가입 방지가 적절히 구현됨
- ✅ **Factory 패턴**: sequence를 사용한 중복 방지
- ✅ **Database Constraint**: unique index로 DB 레벨 중복 방지

---

## 상세 분석

### 1. 확장성 (Extensibility) ⚠️

**문제점:**
- User 모델이 Membership의 scope 이름(`active`, `not_expired`)에 강하게 결합됨
- Membership 모델에서 scope 이름을 변경하면 User 모델도 수정 필요

**영향:**
- 새로운 멤버십 타입 추가 시 User 모델 수정 필요
- Membership의 "활성" 정의가 바뀌면 User도 변경 필요

### 2. 성능 (Performance) 🔴

**N+1 Query 시나리오:**
```ruby
# Controller에서 users를 조회하고 각각의 active_membership을 확인
users = User.all
users.each do |user|
  puts user.active_membership&.type  # N+1 발생!
end
```

**발생 쿼리:**
```sql
SELECT * FROM users;                          -- 1번
SELECT * FROM memberships WHERE user_id = 1;  -- N번
SELECT * FROM memberships WHERE user_id = 2;
...
```

### 3. 보안 (Security) ✅

- SQL Injection: ActiveRecord 사용으로 안전
- Mass Assignment: strong parameters 사용 전제 (Controller에서 처리 필요)
- Email Validation: 기본적인 형식 검증 존재

### 4. 엣지케이스 (Edge Cases) ⚠️

**테스트되지 않은 케이스:**
```ruby
# 1. 여러 활성 멤버십이 존재할 때
user.memberships.create!(status: 'active', end_date: Date.current + 30)
user.memberships.create!(status: 'active', end_date: Date.current + 60)
user.active_membership  # 어떤 것을 반환? (최신 end_date 것)

# 2. 모든 멤버십이 만료되었을 때
user.has_active_membership?  # false 반환해야 함 (테스트 없음)

# 3. memberships가 빈 배열일 때
User.create!(email: 'test@example.com', name: 'Test')
user.active_membership  # nil 반환 (테스트 없음)
```

### 5. 지연시간 (Latency) 🔴

**문제:**
- `active_membership`이 매번 DB 쿼리 실행
- 여러 번 호출 시 캐싱 없음

**개선 가능:**
```ruby
# Memoization 추가
def active_membership
  @active_membership ||= memberships.active.not_expired.order(end_date: :desc).first
end
```

### 6. 코드 품질 (Code Quality) ✅

- 메서드 길이: 적절 (각 3줄 이하)
- 네이밍: 명확 (`active_membership`, `has_active_membership?`)
- 단일 책임: User는 인증/식별 담당, Membership은 권한 담당으로 분리됨

---

## 수정 제안

### 제안 1: N+1 쿼리 방지

**Before:**
```ruby
# Controller
users = User.all
users.each { |u| u.active_membership }  # N+1 발생
```

**After:**
```ruby
# user.rb에 scope 추가
scope :with_active_membership, -> {
  includes(:memberships).where(
    memberships: {
      status: 'active',
      start_date: ..Date.current,
      end_date: Date.current..
    }
  )
}

# Controller
users = User.with_active_membership
users.each { |u| u.active_membership }  # 쿼리 1번만 실행
```

### 제안 2: 결합도 낮추기

**Before:**
```ruby
def active_membership
  memberships.active.not_expired.order(end_date: :desc).first
end
```

**After:**
```ruby
# Membership 모델에 class method 추가
# class Membership
#   def self.active_for_date(date = Date.current)
#     active.where('start_date <= ? AND end_date >= ?', date, date)
#   end
# end

def active_membership
  memberships.active_for_date.order(end_date: :desc).first
end
```

이렇게 하면 "활성" 정의가 Membership 모델 안에 캡슐화됨.

### 제안 3: Memoization으로 지연시간 개선

**Before:**
```ruby
def active_membership
  memberships.active.not_expired.order(end_date: :desc).first
end

def has_active_membership?
  active_membership.present?  # active_membership을 다시 호출 → 쿼리 2번
end
```

**After:**
```ruby
def active_membership
  @active_membership ||= memberships.active.not_expired.order(end_date: :desc).first
end

def has_active_membership?
  active_membership.present?  # 캐시된 값 사용
end

# reload 시 캐시 초기화
after_save :clear_membership_cache
after_destroy :clear_membership_cache

private

def clear_membership_cache
  @active_membership = nil
end
```

### 제안 4: 테스트 추가

**추가 필요한 테스트:**
```ruby
# spec/models/user_spec.rb
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
    let!(:expired) { create(:membership, user: user, end_date: Date.current - 1) }

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
end
```

### 제안 5: 인덱스 추가

**After (마이그레이션):**
```ruby
class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :name, null: false

      t.timestamps
    end

    add_index :users, :email, unique: true
    add_index :users, :created_at  # 가입일순 정렬을 위한 인덱스
  end
end
```

---

## 검증 방법

### N+1 쿼리 확인
```ruby
# Rails Console
User.all.each do |user|
  user.active_membership
end

# 로그에서 SELECT 쿼리 개수 확인
# Bad: SELECT * FROM memberships WHERE user_id = ? (N번 실행)
# Good: SELECT * FROM memberships WHERE user_id IN (1,2,3,...) (1번 실행)
```

### 테스트 실행
```bash
bundle exec rspec spec/models/user_spec.rb
# 기대: 15+ examples, 0 failures (추가 테스트 포함)
```

### 성능 벤치마크
```ruby
require 'benchmark'

users = User.limit(100)

# Before
time_before = Benchmark.measure do
  users.each { |u| u.active_membership }
end

# After (with includes)
time_after = Benchmark.measure do
  User.includes(:memberships).limit(100).each { |u| u.active_membership }
end

puts "Before: #{time_before.real}s"
puts "After: #{time_after.real}s"
```

---

## 우선순위

1. **즉시 수정 필요 (P0)**:
   - 테스트 추가 (`active_membership`, `has_active_membership?`)

2. **1주일 내 수정 (P1)**:
   - N+1 쿼리 방지 (with_active_membership scope)
   - Memoization 추가

3. **다음 스프린트 (P2)**:
   - 결합도 낮추기 (Membership에 active_for_date 메서드 추가)
   - created_at 인덱스 추가

---

## 결론

**Overall Rating: 🟡 양호 (개선 필요)**

User 모델은 기본적인 검증과 정규화가 잘 구현되어 있으나, **성능 최적화(N+1 쿼리)**와 **테스트 커버리지** 부족이 Critical Issue입니다. 특히 프로덕션 환경에서 많은 유저의 멤버십을 조회할 때 성능 문제가 발생할 수 있습니다.

확장성 측면에서는 Membership 모델과의 결합도를 낮추는 것이 좋지만, 현재 프로젝트 규모에서는 큰 문제는 아닙니다.

---

## 수정 완료 (2026-01-15)

| 이슈 | 수정 파일 | 수정 내용 | 검증 |
|------|-----------|-----------|------|
| 테스트 누락 | spec/models/user_spec.rb | `active_membership`, `has_active_membership?` 메서드 테스트 추가 (8개 테스트 케이스) | ✅ 111 examples, 0 failures |
| 인덱스 부족 | db/migrate/20260114170659_add_created_at_index_to_users.rb | created_at 인덱스 추가 | ✅ 마이그레이션 성공 |

**수정 커밋:** `fix(backend): Phase 2.1 Code Review 반영 - User 모델 개선`
