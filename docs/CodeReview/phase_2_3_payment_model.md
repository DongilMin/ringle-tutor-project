# Phase 2.3 Review - Payment Model

## 리뷰 일시
2026-01-15 (Code Review Agent)

## 리뷰 대상 파일
- `backend/db/migrate/20260114155918_create_payments.rb`
- `backend/app/models/payment.rb`
- `backend/spec/models/payment_spec.rb`
- `backend/spec/factories/payments.rb`

---

## 발견된 이슈

### 🔴 Critical (즉시 수정 필요)

| 파일 | 라인 | 이슈 | 설명 |
|------|------|------|------|
| payment.rb | 24-26 | 잘못된 상태 전이 | `refund!`가 pending 상태에서도 실행 가능. completed만 환불 가능해야 함 |
| payment.rb | 16-26 | Race Condition | 동시에 `complete!`와 `fail!` 호출 시 데이터 불일치 가능 |
| payment.rb | - | 비즈니스 로직 누락 | Payment와 Membership 연결이 없음. 결제 성공 시 멤버십 자동 생성 로직 필요 |
| payment.rb | 16-18 | 멱등성(Idempotency) 부재 | 같은 transaction_id로 중복 complete! 호출 시 에러 없음 |

### 🟡 Warning (개선 권장)

| 파일 | 라인 | 이슈 | 설명 |
|------|------|------|------|
| create_payments.rb | 5 | 금액 범위 제한 | decimal(10, 2)는 최대 9,999만원. Enterprise 멤버십 고려 시 부족 가능 |
| payment.rb | 3 | 확장성 낮음 | 결제 방법별 차별화 로직 없음 (PG사별 처리 로직 필요) |
| payment.rb | - | 부분 환불 미지원 | 환불 금액을 추적하지 않아 부분 환불 불가 |
| payment.rb | - | 감사 로그 없음 | 상태 변경 이력이 없어 디버깅/환불 분쟁 시 어려움 |
| payment.rb | - | Timeout 처리 없음 | pending 상태가 영구히 남을 수 있음 (10분 후 자동 만료 등) |
| create_payments.rb | 14 | NULL 인덱스 | transaction_id unique index에 NULL 허용. 의도인지 불명확 |

### 🟢 Good Practices (잘된 점)

- ✅ **transaction_id Uniqueness**: 중복 결제 방지
- ✅ **Amount Validation**: 0 이하 금액 거부
- ✅ **Foreign Key**: DB 레벨 무결성 보장
- ✅ **Factory Traits**: completed, failed, refunded, kakao_pay, naver_pay 등 다양한 시나리오 테스트 가능
- ✅ **Default Status**: pending으로 안전하게 초기화
- ✅ **Decimal Precision**: 소수점 금액 정확히 처리 (float 대신 decimal)

---

## 상세 분석

### 1. 확장성 (Extensibility) 🔴

**문제 1: Payment와 Membership이 분리됨**

```ruby
# 현재: 결제 성공 후 멤버십 생성이 Controller나 Service에서 처리 필요
payment.complete!('TXN_123')
# ... 어딘가에서 Membership.create!(...)

# 문제: 두 작업이 트랜잭션으로 묶이지 않으면 데이터 불일치 발생 가능
```

**향후 시나리오:**
- 결제 성공 → 멤버십 생성 실패 (DB 에러 등)
- 멤버십 생성 성공 → Payment 업데이트 실패
- **결과**: 결제는 되었는데 멤버십이 없거나, 멤버십은 있는데 결제 기록이 pending

**문제 2: 결제 방법별 로직 부재**

```ruby
PAYMENT_METHODS = %w[credit_card bank_transfer kakao_pay naver_pay].freeze
# 하지만 각 PG사별 처리 로직이 없음!
```

**향후 요구사항:**
- credit_card: Stripe API
- kakao_pay: 카카오페이 API
- naver_pay: 네이버페이 API
- 각각 다른 request/response 형식, webhook, 환불 절차

**확장 시 코드:**
```ruby
# Bad: if-else 지옥
def process_payment
  case payment_method
  when 'credit_card'
    # Stripe 로직
  when 'kakao_pay'
    # 카카오페이 로직
  when 'naver_pay'
    # 네이버페이 로직
  end
end
```

### 2. 성능 (Performance) ✅

- 단순 CRUD 모델로 특별한 성능 이슈 없음
- 인덱스가 적절히 추가됨 (status, transaction_id)
- 복합 인덱스 필요성:
  ```ruby
  # 유저별 결제 내역 조회 시
  Payment.where(user_id: 1, status: 'completed').order(created_at: :desc)
  # → user_id + status + created_at 복합 인덱스 고려
  ```

### 3. 보안 (Security) 🔴

**문제 1: 멱등성(Idempotency) 부재**

```ruby
payment = Payment.pending.first

# 네트워크 타임아웃으로 재시도
payment.complete!('TXN_123')  # 성공
payment.complete!('TXN_123')  # 또 성공! (멱등하지 않음)
```

**문제 2: Race Condition**

```ruby
# Thread 1
payment.complete!('TXN_123')  # status = 'completed'

# Thread 2 (동시 실행)
payment.fail!  # status = 'failed'로 덮어씀!
```

**결과**: 실제로는 결제 성공했는데 DB에는 failed로 기록됨

**문제 3: 잘못된 상태 전이**

```ruby
payment = Payment.create!(status: 'pending', amount: 10_000)
payment.refund!  # 성공! (pending → refunded)
# 문제: 아직 완료되지 않은 결제를 환불?
```

**올바른 상태 전이:**
```
pending → completed → refunded
pending → failed
completed (재시도 불가)
refunded (재시도 불가)
```

### 4. 엣지케이스 (Edge Cases) 🟡

**테스트되지 않은 케이스:**

```ruby
# Case 1: 중복 complete! 호출
payment.complete!('TXN_123')
payment.complete!('TXN_123')  # 에러 발생? 무시? (현재: 에러 발생 - transaction_id 중복)

# Case 2: complete! 후 fail! 호출
payment.complete!('TXN_123')
payment.fail!  # 허용되어야 하는가? (현재: 허용됨 - 문제!)

# Case 3: refund! 후 다시 refund! 호출
payment.refund!
payment.refund!  # 중복 환불 시도 (현재: 허용됨 - 문제!)

# Case 4: nil transaction_id로 complete! 호출
payment.complete!(nil)  # 허용되어야 하는가? (현재: 허용됨 - 문제!)

# Case 5: 매우 큰 금액
payment = Payment.create!(amount: 100_000_000.00)  # 1억원 (decimal(10, 2) 한계 근접)

# Case 6: pending 상태가 영구히 남는 경우
Payment.create!(status: 'pending')
# 10분 후에도 여전히 pending → 자동 만료 로직 없음
```

### 5. 지연시간 (Latency) ✅

- 현재 코드는 단순하여 지연시간 이슈 없음
- 향후 고려사항:
  - PG사 API 호출 시 timeout 설정
  - Webhook 비동기 처리

### 6. 코드 품질 (Code Quality) ✅

- 메서드 길이: 매우 짧음 (1-2줄)
- 네이밍: 명확 (`complete!`, `fail!`, `refund!`)
- 중복 코드 없음
- 테스트 커버리지 양호 (17개 테스트)

---

## 수정 제안

### 제안 1: 상태 전이 검증 (State Machine)

**Before:**
```ruby
def refund!
  update!(status: 'refunded')  # 어떤 상태에서든 실행 가능
end
```

**After (AASM gem 사용):**
```ruby
class Payment < ApplicationRecord
  include AASM

  aasm column: 'status' do
    state :pending, initial: true
    state :completed
    state :failed
    state :refunded

    event :complete do
      transitions from: :pending, to: :completed, guard: :valid_transaction_id?
    end

    event :fail do
      transitions from: :pending, to: :failed
    end

    event :refund do
      transitions from: :completed, to: :refunded, after: :process_refund
    end
  end

  def complete!(transaction_id)
    self.transaction_id = transaction_id
    complete!  # AASM event
  end

  private

  def valid_transaction_id?
    transaction_id.present?
  end

  def process_refund
    # 환불 처리 로직
    RefundService.new(self).process
  end
end
```

**이점:**
- 잘못된 상태 전이 자동 방지
- 상태 전이 로그 자동 기록
- 상태별 guard, after hook 지원

### 제안 2: Payment-Membership 트랜잭션 통합

**Before:**
```ruby
# Controller에서 처리
payment.complete!('TXN_123')
Membership.create!(user: payment.user, ...)  # 실패 시 롤백 안됨
```

**After:**
```ruby
# payment.rb
def complete_with_membership!(transaction_id, membership_params)
  ApplicationRecord.transaction do
    complete!(transaction_id)
    membership = user.memberships.create!(membership_params)
    update!(membership: membership)  # optional: payment → membership FK
  end
rescue ActiveRecord::RecordInvalid => e
  fail!  # 멤버십 생성 실패 시 payment도 실패 처리
  raise e
end

# 또는 Service 객체 사용
class PaymentCompletionService
  def initialize(payment)
    @payment = payment
  end

  def complete!(transaction_id, membership_type)
    ApplicationRecord.transaction do
      @payment.complete!(transaction_id)
      create_membership!(membership_type)
    end
  rescue => e
    @payment.fail!
    raise e
  end

  private

  def create_membership!(type)
    @payment.user.memberships.create!(
      membership_type: type,
      start_date: Date.current,
      end_date: Date.current + duration_for(type)
    )
  end

  def duration_for(type)
    { 'basic' => 30, 'premium' => 30, 'enterprise' => 365 }[type].days
  end
end
```

### 제안 3: 멱등성(Idempotency) 보장

**Before:**
```ruby
def complete!(transaction_id)
  update!(status: 'completed', transaction_id: transaction_id)
end
```

**After:**
```ruby
def complete!(transaction_id)
  raise ArgumentError, 'transaction_id is required' if transaction_id.blank?

  # 이미 완료된 경우 멱등하게 처리
  if completed? && self.transaction_id == transaction_id
    Rails.logger.info("Payment #{id} already completed with #{transaction_id}")
    return true
  end

  # 다른 transaction_id로 완료 시도 시 에러
  if completed? && self.transaction_id != transaction_id
    raise PaymentError, "Payment already completed with different transaction_id"
  end

  update!(status: 'completed', transaction_id: transaction_id)
end
```

### 제안 4: Optimistic Locking (동시성 제어)

**마이그레이션:**
```ruby
class AddLockVersionToPayments < ActiveRecord::Migration[8.1]
  def change
    add_column :payments, :lock_version, :integer, default: 0, null: false
  end
end
```

**사용:**
```ruby
# Rails가 자동으로 lock_version 체크
payment = Payment.find(1)  # lock_version = 5

# Thread 1
payment.complete!('TXN_123')  # lock_version = 6으로 업데이트

# Thread 2 (동시 실행, 같은 payment 객체 사용)
payment.fail!  # ActiveRecord::StaleObjectError 발생!
```

### 제안 5: 부분 환불 지원

**마이그레이션:**
```ruby
class AddRefundFieldsToPayments < ActiveRecord::Migration[8.1]
  def change
    add_column :payments, :refunded_amount, :decimal, precision: 10, scale: 2, default: 0
    add_column :payments, :refund_reason, :string
  end
end
```

**모델:**
```ruby
def refund!(amount: nil, reason: nil)
  amount ||= self.amount  # 전액 환불이 기본값
  raise ArgumentError, 'Refund amount exceeds payment amount' if amount > self.amount

  ApplicationRecord.transaction do
    update!(
      status: 'refunded',
      refunded_amount: refunded_amount + amount,
      refund_reason: reason
    )
  end
end

def partially_refunded?
  refunded_amount > 0 && refunded_amount < amount
end

def fully_refunded?
  refunded_amount >= amount
end
```

### 제안 6: Timeout 처리

**배치 작업:**
```ruby
# lib/tasks/payments.rake
namespace :payments do
  desc "Fail pending payments older than 10 minutes"
  task expire_pending: :environment do
    expired_count = Payment
      .where(status: 'pending')
      .where('created_at < ?', 10.minutes.ago)
      .update_all(status: 'failed')

    puts "Expired #{expired_count} pending payments"
  end
end

# config/schedule.rb (whenever gem)
every 5.minutes do
  rake 'payments:expire_pending'
end
```

### 제안 7: 감사 로그 (Audit Trail)

**Option A: paper_trail gem**
```ruby
class Payment < ApplicationRecord
  has_paper_trail
end

# 사용
payment.complete!('TXN_123')
payment.versions  # 모든 변경 이력 조회
payment.versions.last.reify  # 이전 상태로 복원
```

**Option B: 별도 테이블**
```ruby
# migration
create_table :payment_events do |t|
  t.references :payment, foreign_key: true
  t.string :event_type  # 'completed', 'failed', 'refunded'
  t.string :from_status
  t.string :to_status
  t.json :metadata  # transaction_id, refund_amount 등
  t.timestamps
end

# model
class Payment < ApplicationRecord
  has_many :payment_events

  after_update :log_status_change

  private

  def log_status_change
    if status_changed?
      payment_events.create!(
        event_type: status,
        from_status: status_was,
        to_status: status,
        metadata: { transaction_id: transaction_id }
      )
    end
  end
end
```

### 제안 8: Strategy Pattern (결제 방법별 로직)

```ruby
# app/services/payment_processors/
#   base_processor.rb
#   credit_card_processor.rb
#   kakao_pay_processor.rb
#   naver_pay_processor.rb

class Payment < ApplicationRecord
  def processor
    @processor ||= "PaymentProcessors::#{payment_method.camelize}Processor".constantize.new(self)
  end

  def process!
    processor.charge
  end

  def refund_via_gateway!
    processor.refund
  end
end

# app/services/payment_processors/kakao_pay_processor.rb
module PaymentProcessors
  class KakaoPayProcessor
    def initialize(payment)
      @payment = payment
    end

    def charge
      response = HTTParty.post('https://kapi.kakao.com/v1/payment/ready', ...)
      @payment.complete!(response['tid'])
    end

    def refund
      HTTParty.post('https://kapi.kakao.com/v1/payment/cancel', ...)
    end
  end
end
```

---

## 검증 방법

### 1. 상태 전이 테스트

```ruby
# spec/models/payment_spec.rb
describe 'state transitions' do
  let(:payment) { create(:payment, status: 'pending') }

  describe '#refund!' do
    context 'when payment is pending' do
      it 'raises error' do
        expect { payment.refund! }.to raise_error(AASM::InvalidTransition)
      end
    end

    context 'when payment is completed' do
      before { payment.complete!('TXN_123') }

      it 'transitions to refunded' do
        payment.refund!
        expect(payment.status).to eq('refunded')
      end
    end

    context 'when payment is already refunded' do
      before do
        payment.complete!('TXN_123')
        payment.refund!
      end

      it 'raises error on duplicate refund' do
        expect { payment.refund! }.to raise_error(AASM::InvalidTransition)
      end
    end
  end
end
```

### 2. 멱등성 테스트

```ruby
describe '#complete! idempotency' do
  let(:payment) { create(:payment) }

  it 'allows duplicate complete! with same transaction_id' do
    payment.complete!('TXN_123')
    expect { payment.complete!('TXN_123') }.not_to raise_error
    expect(payment.transaction_id).to eq('TXN_123')
  end

  it 'raises error on different transaction_id' do
    payment.complete!('TXN_123')
    expect {
      payment.complete!('TXN_456')
    }.to raise_error(PaymentError, /already completed/)
  end
end
```

### 3. Race Condition 테스트

```ruby
describe 'concurrent updates' do
  it 'prevents race condition with optimistic locking' do
    payment1 = Payment.find(payment.id)
    payment2 = Payment.find(payment.id)

    payment1.complete!('TXN_123')

    expect {
      payment2.fail!
    }.to raise_error(ActiveRecord::StaleObjectError)
  end
end
```

---

## 우선순위

1. **즉시 수정 필요 (P0)**:
   - 상태 전이 검증 (AASM 또는 수동 검증)
   - 멱등성 보장 (중복 complete! 방지)
   - Optimistic Locking 추가

2. **1주일 내 수정 (P1)**:
   - Payment-Membership 트랜잭션 통합 (Service 객체)
   - Timeout 처리 (배치 작업)
   - 감사 로그 추가

3. **다음 스프린트 (P2)**:
   - Strategy Pattern (결제 방법별 로직 분리)
   - 부분 환불 지원
   - 금액 범위 확장 (decimal(12, 2))

---

## 결론

**Overall Rating: 🔴 심각 (즉시 수정 필요)**

Payment 모델은 기본적인 CRUD는 잘 구현되어 있으나, **결제 시스템의 핵심 요구사항**이 누락되어 있습니다:

1. **상태 전이 검증 부재**: 잘못된 상태 전이(pending → refunded)가 가능함
2. **Race Condition**: 동시 요청 시 데이터 불일치 발생 가능
3. **멱등성 부재**: 중복 요청 처리 로직 없음
4. **비즈니스 로직 분리 안됨**: Payment와 Membership이 분리되어 있어 데이터 불일치 위험

**프로덕션 배포 전 필수 수정**:
- AASM으로 상태 전이 제어
- Optimistic Locking으로 동시성 제어
- PaymentService로 Payment-Membership 트랜잭션 통합

**결제 시스템은 금전이 오가는 Critical한 부분**이므로, 위 이슈들을 반드시 해결해야 합니다.

---

## 수정 완료 (2026-01-15)

| 이슈 | 수정 파일 | 수정 내용 | 검증 |
|------|-----------|-----------|------|
| Race Condition | db/migrate/20260114170845_add_lock_version_to_payments.rb | Optimistic Locking을 위한 `lock_version` 컬럼 추가 | ✅ 마이그레이션 성공 |
| 상태 전이 검증 부재 | app/models/payment.rb | `complete!`, `fail!`, `refund!` 메서드에 상태 전이 검증 로직 추가 | ✅ 111 examples, 0 failures |
| 멱등성 부재 | app/models/payment.rb | `complete!` 메서드에 멱등성 보장 로직 추가 (같은 transaction_id 허용) | ✅ 테스트 통과 |
| 테스트 부족 | spec/models/payment_spec.rb | 상태 전이, 멱등성, Optimistic Locking 테스트 추가 (13개 테스트 추가) | ✅ 111 examples, 0 failures |
| PaymentError 추가 | app/models/payment.rb | 커스텀 에러 클래스 `PaymentError` 정의 | ✅ 테스트 통과 |

**수정 커밋:** `fix(backend): Phase 2.3 Code Review 반영 - Payment 모델 보안 강화`

**참고**: AASM gem 사용은 향후 검토 예정. 현재는 수동 검증 로직으로 구현.
