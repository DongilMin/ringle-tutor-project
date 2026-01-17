# Phase 2.2 Review - Membership Model

## 리뷰 일시
2026-01-15 (Code Review Agent)

## 리뷰 대상 파일
- `backend/db/migrate/20260114154755_create_memberships.rb`
- `backend/app/models/membership.rb`
- `backend/spec/models/membership_spec.rb`
- `backend/spec/factories/memberships.rb`

---

## 발견된 이슈

### 🔴 Critical (즉시 수정 필요)

| 파일 | 라인 | 이슈 | 설명 |
|------|------|------|------|
| membership.rb | 16-20 | 데이터 불일치 | end_date가 지나도 status가 'active'로 남아있음. 배치 작업이나 자동 업데이트 로직 없음 |
| create_memberships.rb | 13-14 | 복합 인덱스 부재 | `user_id + status + end_date` 조합 쿼리가 빈번한데 단일 인덱스만 존재 |
| membership.rb | - | 동시성 제어 없음 | 한 유저가 여러 활성 멤버십을 가질 수 있는지 불명확. 비즈니스 로직 부재 |

### 🟡 Warning (개선 권장)

| 파일 | 라인 | 이슈 | 설명 |
|------|------|------|------|
| membership.rb | 17 | 매직 스트링 | `status == 'active'` 직접 비교. 상수 사용 권장 |
| membership.rb | 13-14 | Scope 중복 | `.active.not_expired`가 항상 함께 사용되는데 분리되어 있음 |
| membership.rb | 2 | 확장성 낮음 | TYPES 정의만 있고 타입별 차별화 로직 없음. Strategy 패턴 필요 |
| membership.rb | 30-36 | 검증 메시지 | 에러 메시지가 영어로만 제공. I18n 고려 필요 |
| membership.rb | 22-26 | 엣지케이스 미처리 | `days_remaining`이 0일 때와 만료된 경우를 구분하지 못함 |

### 🟢 Good Practices (잘된 점)

- ✅ **경계값 테스트 매우 우수**: 날짜 경계(어제/오늘/내일) 테스트가 철저히 작성됨
- ✅ **Factory Traits**: premium, enterprise, expired, cancelled 등 다양한 상태 테스트 가능
- ✅ **Foreign Key**: DB 레벨 제약으로 데이터 무결성 보장
- ✅ **Custom Validation**: end_date_after_start_date 검증이 적절함
- ✅ **Index 추가**: status, end_date 인덱스로 쿼리 성능 향상
- ✅ **Date Range 검증**: start_date = end_date 허용 (당일 멤버십 가능)

---

## 상세 분석

### 1. 확장성 (Extensibility) 🔴

**문제 1: 멤버십 타입별 로직 부재**

현재 코드:
```ruby
TYPES = %w[basic premium enterprise].freeze
# 하지만 타입별 차별화된 로직이 없음!
```

**향후 요구사항 예상:**
- Basic: 월 10시간
- Premium: 월 30시간 + 고급 기능
- Enterprise: 무제한 + 관리자 대시보드

**확장 시나리오:**
```ruby
# 새 기능 추가 시 if-else 지옥 발생 가능
def max_hours
  case membership_type
  when 'basic' then 10
  when 'premium' then 30
  when 'enterprise' then Float::INFINITY
  end
end

def has_admin_dashboard?
  membership_type == 'enterprise'
end

# 5개 기능 추가 시 5개 if-else 메서드 생성...
```

**권장: Strategy Pattern**
```ruby
# app/models/memberships/
#   basic_membership.rb
#   premium_membership.rb
#   enterprise_membership.rb

class Membership < ApplicationRecord
  def strategy
    @strategy ||= "Memberships::#{membership_type.capitalize}Membership".constantize.new(self)
  end

  delegate :max_hours, :features, :admin_dashboard?, to: :strategy
end
```

### 2. 성능 (Performance) 🔴

**문제 1: 복합 인덱스 부재**

가장 빈번한 쿼리:
```ruby
# User#active_membership에서 호출
user.memberships.active.not_expired.order(end_date: :desc).first
```

실행되는 SQL:
```sql
SELECT * FROM memberships
WHERE user_id = 1
  AND status = 'active'
  AND end_date >= '2026-01-15'
ORDER BY end_date DESC
LIMIT 1;
```

**현재 인덱스:**
- `user_id` (FK 인덱스)
- `status` (단일 인덱스)
- `end_date` (단일 인덱스)

**문제:** DB는 3개 중 하나만 선택해서 사용 (나머지는 풀 스캔)

**최적 인덱스:**
```ruby
add_index :memberships, [:user_id, :status, :end_date], name: 'idx_memberships_active_lookup'
```

**성능 차이:**
- 유저당 평균 5개 멤버십 보유 시
- Before: 전체 memberships 스캔 (수천~수만 건)
- After: user_id로 필터 → status로 필터 → end_date 정렬 (5건 이하)

**문제 2: 만료된 멤버십 자동 업데이트 로직 없음**

```ruby
# 만료된 멤버십이 status = 'active'로 남아있음
membership = Membership.create!(
  user: user,
  end_date: Date.current - 1,
  status: 'active'  # ← 이미 만료되었는데 active!
)

membership.active?  # => false (메서드는 false 반환)
Membership.active   # => [membership] (scope는 여전히 포함!)
```

**데이터 불일치:**
- `.active?` 메서드: false
- `.active` scope: true
- **결과**: 혼란스러운 버그 발생 가능

### 3. 보안 (Security) ✅

- SQL Injection: ActiveRecord 사용으로 안전
- Mass Assignment: Controller에서 strong parameters 필요
- 특별한 보안 이슈 없음

### 4. 엣지케이스 (Edge Cases) 🟡

**테스트되지 않은 케이스:**

```ruby
# Case 1: 여러 활성 멤버십 동시 존재
user.memberships.create!(type: 'basic', end_date: Date.current + 30)
user.memberships.create!(type: 'premium', end_date: Date.current + 60)
# 어떤 것이 우선? 비즈니스 로직 없음

# Case 2: days_remaining이 0일 때
membership = Membership.new(end_date: Date.current, status: 'active')
membership.days_remaining  # => 0
# 오늘 만료 vs 이미 만료를 구분 못함

# Case 3: 미래 시작 멤버십
membership = Membership.create!(
  start_date: Date.current + 7,
  end_date: Date.current + 37,
  status: 'active'  # ← status는 active인데 아직 시작 안됨
)
membership.active?  # => false
Membership.active   # => [membership] ← scope는 포함!
```

### 5. 지연시간 (Latency) ✅

- 인덱스가 적절히 추가되어 있음 (단, 복합 인덱스 필요)
- N+1 쿼리 이슈는 User 모델에서 발생 (이 모델 자체는 문제없음)

### 6. 코드 품질 (Code Quality) ✅

- 메서드 길이: 적절 (5줄 이하)
- 네이밍: 명확 (`active?`, `days_remaining`)
- 중복 코드 없음
- 테스트 커버리지 우수 (19개 테스트)

---

## 수정 제안

### 제안 1: 데이터 일관성 보장 (Status 자동 업데이트)

**Option A: Callback (간단하지만 성능 이슈 가능)**
```ruby
# membership.rb
before_save :update_status_based_on_dates

private

def update_status_based_on_dates
  return unless status == 'active'

  if end_date < Date.current
    self.status = 'expired'
  end
end
```

**Option B: 배치 작업 (권장)**
```ruby
# lib/tasks/memberships.rake
namespace :memberships do
  desc "Expire memberships past their end_date"
  task expire_old: :environment do
    expired_count = Membership
      .where(status: 'active')
      .where('end_date < ?', Date.current)
      .update_all(status: 'expired')

    puts "Expired #{expired_count} memberships"
  end
end

# config/schedule.rb (whenever gem 사용)
every 1.day, at: '1:00 am' do
  rake 'memberships:expire_old'
end
```

**Option C: Database Trigger (가장 안전)**
```sql
CREATE TRIGGER auto_expire_memberships
BEFORE UPDATE ON memberships
FOR EACH ROW
BEGIN
  IF NEW.status = 'active' AND NEW.end_date < CURRENT_DATE THEN
    SET NEW.status = 'expired';
  END IF;
END;
```

### 제안 2: 복합 인덱스 추가

**마이그레이션:**
```ruby
class AddCompositeIndexToMemberships < ActiveRecord::Migration[8.1]
  def change
    # 가장 빈번한 쿼리 패턴에 최적화
    add_index :memberships, [:user_id, :status, :end_date],
              name: 'idx_memberships_active_lookup',
              comment: 'Optimizes User#active_membership query'

    # 기존 단일 인덱스 제거 (복합 인덱스가 커버함)
    remove_index :memberships, :status
    remove_index :memberships, :end_date
  end
end
```

**성능 검증:**
```sql
-- Before
EXPLAIN SELECT * FROM memberships
WHERE user_id = 1 AND status = 'active' AND end_date >= '2026-01-15'
ORDER BY end_date DESC LIMIT 1;
-- Using index: user_id (type: ref, Extra: Using where; Using filesort)

-- After
EXPLAIN ...
-- Using index: idx_memberships_active_lookup (type: ref, Extra: Using index condition)
```

### 제안 3: Scope 통합

**Before:**
```ruby
scope :active, -> { where(status: 'active') }
scope :not_expired, -> { where('end_date >= ?', Date.current) }

# 사용
memberships.active.not_expired  # 항상 함께 사용
```

**After:**
```ruby
scope :active, -> { where(status: 'active') }
scope :not_expired, -> { where('end_date >= ?', Date.current) }
scope :currently_active, -> {
  where(
    status: 'active',
    start_date: ..Date.current,
    end_date: Date.current..
  )
}

# 사용
memberships.currently_active  # 명확한 의미
```

**또는 active? 로직과 통일:**
```ruby
scope :currently_active, -> {
  where(status: 'active')
    .where('start_date <= ?', Date.current)
    .where('end_date >= ?', Date.current)
}
```

### 제안 4: 동시성 제어 (Uniqueness Constraint)

비즈니스 규칙에 따라:

**Option A: 유저당 하나의 활성 멤버십만 허용**
```ruby
# migration
add_index :memberships, :user_id,
          unique: true,
          where: "status = 'active' AND end_date >= CURRENT_DATE",
          name: 'idx_one_active_membership_per_user'

# model validation
validate :only_one_active_membership

private

def only_one_active_membership
  return unless status == 'active'
  return unless end_date >= Date.current

  existing = user.memberships
    .where.not(id: id)
    .currently_active
    .exists?

  if existing
    errors.add(:base, 'User already has an active membership')
  end
end
```

**Option B: 멤버십 타입별 하나만 허용**
```ruby
add_index :memberships, [:user_id, :membership_type],
          unique: true,
          where: "status = 'active'",
          name: 'idx_one_active_per_type'
```

### 제안 5: Strategy Pattern (확장성)

```ruby
# app/models/membership.rb
def strategy
  @strategy ||= "Memberships::#{membership_type.capitalize}".constantize.new(self)
end

delegate :max_hours, :features, to: :strategy

# app/models/memberships/basic.rb
module Memberships
  class Basic
    def initialize(membership)
      @membership = membership
    end

    def max_hours
      10
    end

    def features
      ['basic_chat', 'vocabulary_review']
    end
  end
end

# app/models/memberships/premium.rb
module Memberships
  class Premium
    def initialize(membership)
      @membership = membership
    end

    def max_hours
      30
    end

    def features
      ['basic_chat', 'vocabulary_review', 'pronunciation_analysis', 'essay_review']
    end
  end
end

# 사용
membership = user.active_membership
membership.max_hours  # => 10 or 30 depending on type
```

### 제안 6: days_remaining 개선

**Before:**
```ruby
def days_remaining
  return 0 unless active?

  (end_date - Date.current).to_i
end
```

**문제:** 만료된 멤버십과 오늘 만료되는 멤버십을 구분 못함

**After:**
```ruby
def days_remaining
  return 0 unless active?

  (end_date - Date.current).to_i
end

def expires_today?
  active? && end_date == Date.current
end

def status_message
  if !active?
    'Expired'
  elsif expires_today?
    'Expires today'
  else
    "#{days_remaining} days remaining"
  end
end
```

---

## 검증 방법

### 1. 복합 인덱스 성능 테스트

```ruby
# Rails Console
require 'benchmark'

user = User.first

# 쿼리 로그 활성화
ActiveRecord::Base.logger = Logger.new(STDOUT)

# 쿼리 실행
user.active_membership

# 로그 확인
# Bad: Using filesort, Using temporary
# Good: Using index condition
```

### 2. 데이터 일관성 테스트

```ruby
# spec/models/membership_spec.rb
describe 'status auto-update' do
  it 'sets status to expired when end_date passes' do
    membership = create(:membership,
      end_date: Date.current - 1,
      status: 'active'
    )

    # 배치 작업 실행
    Membership.expire_old_memberships

    expect(membership.reload.status).to eq('expired')
  end
end
```

### 3. 동시성 테스트

```ruby
describe 'concurrent active memberships' do
  let(:user) { create(:user) }

  it 'prevents multiple active memberships' do
    create(:membership, user: user, status: 'active')

    duplicate = build(:membership, user: user, status: 'active')
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:base]).to include('User already has an active membership')
  end
end
```

---

## 우선순위

1. **즉시 수정 필요 (P0)**:
   - 복합 인덱스 추가 (성능 Critical)
   - 데이터 일관성: 배치 작업으로 만료 멤버십 status 업데이트

2. **1주일 내 수정 (P1)**:
   - 동시성 제어 (비즈니스 로직 명확화)
   - `currently_active` scope 추가

3. **다음 스프린트 (P2)**:
   - Strategy Pattern 적용 (멤버십 타입별 로직 분리)
   - `expires_today?`, `status_message` 메서드 추가

---

## 결론

**Overall Rating: 🟡 양호 (개선 필요)**

Membership 모델은 **경계값 테스트가 매우 우수**하고 기본적인 검증이 잘 구현되어 있습니다. 특히 날짜 경계 처리가 정확합니다.

그러나 다음 Critical Issue가 있습니다:

1. **복합 인덱스 부재**: 가장 빈번한 쿼리 패턴에 최적화되지 않음 → 성능 저하
2. **데이터 불일치**: status가 자동으로 업데이트되지 않아 `active?` 메서드와 `active` scope가 다른 결과 반환 가능
3. **확장성 낮음**: 멤버십 타입별 로직이 없어 향후 기능 추가 시 if-else 지옥 발생 가능

**프로덕션 배포 전 필수 수정**: 복합 인덱스 추가, 배치 작업 구현

---

## 수정 완료 (2026-01-15)

| 이슈 | 수정 파일 | 수정 내용 | 검증 |
|------|-----------|-----------|------|
| 복합 인덱스 부재 | db/migrate/20260114170727_add_composite_index_to_memberships.rb | `user_id + status + end_date` 복합 인덱스 추가, 중복 단일 인덱스 제거 | ✅ 마이그레이션 성공 |
| 데이터 불일치 | lib/tasks/memberships.rake | 만료된 멤버십 자동 처리 배치 작업 추가 (`rake memberships:expire_old`) | ✅ rake 태스크 생성 완료 |
| currently_active scope | app/models/membership.rb | `currently_valid` scope가 이미 구현되어 있음 (16번 줄) | ✅ 기존 구현 확인 |

**수정 커밋:** `fix(backend): Phase 2.2 Code Review 반영 - Membership 모델 개선`
