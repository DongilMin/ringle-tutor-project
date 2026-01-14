# Database Schema Design

## ERD (Entity Relationship Diagram)

```
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│     users       │       │    memberships      │       │     payments        │
├─────────────────┤       ├─────────────────────┤       ├─────────────────────┤
│ id (PK)         │──┐    │ id (PK)             │       │ id (PK)             │
│ email (unique)  │  │    │ user_id (FK)        │←──────│ user_id (FK)        │←─┐
│ name            │  └───→│ membership_type     │       │ membership_id (FK)  │──┘
│ created_at      │       │ start_date          │       │ amount              │
│ updated_at      │       │ end_date            │       │ status              │
└─────────────────┘       │ status              │       │ payment_method      │
                          │ created_at          │       │ transaction_id      │
                          │ updated_at          │       │ created_at          │
                          └─────────────────────┘       │ updated_at          │
                                                        └─────────────────────┘
```

## 관계
- User `has_many` Memberships
- User `has_many` Payments
- Membership `belongs_to` User
- Payment `belongs_to` User
- Payment `belongs_to` Membership (optional)

---

## 테이블 상세

### users
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | bigint | PK, auto | |
| email | string | NOT NULL, UNIQUE | 이메일 (로그인 ID) |
| name | string | NOT NULL | 사용자 이름 |
| created_at | datetime | NOT NULL | |
| updated_at | datetime | NOT NULL | |

### memberships
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | bigint | PK, auto | |
| user_id | bigint | FK, NOT NULL | users.id 참조 |
| membership_type | string | NOT NULL | basic, premium, enterprise |
| start_date | date | NOT NULL | 시작일 |
| end_date | date | NOT NULL | 만료일 |
| status | string | NOT NULL, default: 'active' | active, expired, cancelled |
| created_at | datetime | NOT NULL | |
| updated_at | datetime | NOT NULL | |

**인덱스:**
- `index_memberships_on_user_id`
- `index_memberships_on_status`
- `index_memberships_on_end_date`

### payments
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | bigint | PK, auto | |
| user_id | bigint | FK, NOT NULL | users.id 참조 |
| membership_id | bigint | FK, NULL | memberships.id 참조 (결제 성공 시) |
| amount | decimal(10,2) | NOT NULL | 결제 금액 |
| status | string | NOT NULL, default: 'pending' | pending, completed, failed |
| payment_method | string | NOT NULL | card, bank_transfer |
| transaction_id | string | UNIQUE | PG사 거래 ID |
| created_at | datetime | NOT NULL | |
| updated_at | datetime | NOT NULL | |

**인덱스:**
- `index_payments_on_user_id`
- `index_payments_on_membership_id`
- `index_payments_on_transaction_id` (unique)
- `index_payments_on_status`

---

## 멤버십 타입

| 타입 | 설명 | 가격 (예시) |
|------|------|-------------|
| basic | 기본 - 대화만 | 9,900원/월 |
| premium | 프리미엄 - 대화 + 분석 | 19,900원/월 |
| enterprise | 기업용 - 전체 기능 | 별도 협의 |

---

## 비즈니스 로직

### 멤버십 활성 여부 판단
```ruby
# membership.active?
start_date <= Date.current && end_date >= Date.current && status == 'active'
```

### 결제 → 멤버십 생성 플로우
```
1. Payment 생성 (status: pending)
2. Mock PG 호출
3. 성공 시:
   - Payment.status → completed
   - Membership 생성 (30일)
   - Payment.membership_id 연결
4. 실패 시:
   - Payment.status → failed
```
