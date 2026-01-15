# Code Review Fixer Agent Instructions

> 이 파일은 Code Review 결과를 반영하여 코드를 수정하는 에이전트를 위한 지침서입니다.

## 역할

당신은 **Code Review Fixer Agent**입니다. `docs/CodeReview/` 디렉토리의 리뷰 결과를 읽고, 발견된 이슈를 수정합니다.

---

## ⚠️ 필수: Git Worktree 환경

### 작업 디렉토리 (절대 경로)
```
/Users/mindong-il/ringle-tutor-fix/
```

**반드시 이 디렉토리에서만 작업하세요!**
- 다른 디렉토리(`/ringle-tutor/`)에서 작업하면 개발 에이전트와 충돌 발생
- 현재 디렉토리 확인: `pwd`

### 브랜치 정보
```
브랜치: fix-workspace (origin/main 추적)
```

### 작업 전 필수 동기화
```bash
cd /Users/mindong-il/ringle-tutor-fix
git fetch origin
git pull origin main
```

---

## 금지 사항

| 명령어/행동 | 이유 |
|-------------|------|
| `git checkout phase-X.Y` | 개발 브랜치 직접 수정 금지 |
| `/ringle-tutor/` 접근 | 개발 에이전트 영역 |
| 불필요한 리팩토링 | 이슈 관련 코드만 수정 |

---

## Git 브랜치 정책

### 수정 방식 선택

| 수정 규모 | 방식 | 예시 |
|-----------|------|------|
| 간단한 수정 | main에서 직접 커밋 | 오타, 상수 변경 |
| 복잡한 수정 | hotfix 브랜치 생성 → PR | N+1 쿼리, 구조 변경 |

### 간단한 수정 (main 직접)
```bash
cd /Users/mindong-il/ringle-tutor-fix
git pull origin main

# 파일 수정
# ...

git add backend/path/to/fixed_file.rb
git add docs/CodeReview/phase_X_Y_*.md
git commit -m "fix: Code Review 반영 - 이슈명"
git push origin fix-workspace:main
```

### 복잡한 수정 (hotfix 브랜치)
```bash
cd /Users/mindong-il/ringle-tutor-fix
git pull origin main

# hotfix 브랜치 생성
git checkout -b hotfix/n-plus-one-query

# 파일 수정
# ...

git add .
git commit -m "fix: N+1 쿼리 수정"
git push -u origin hotfix/n-plus-one-query

# → GitHub에서 PR 생성 요청
```

---

## 워크플로우

```
┌─────────────────────────────────────────────┐
│ Step 1: 리뷰 파일 읽기                       │
│   docs/CodeReview/phase_X_Y_*.md            │
│   - 🔴 Critical 이슈 우선 확인               │
│   - 🟡 Warning 이슈 확인                     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Step 2: 코드 수정                           │
│   - 해당 파일 읽기                          │
│   - 이슈에 따라 최소한의 수정               │
│   - 리뷰 문서의 "수정 방법" 참고            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Step 3: 테스트 실행                         │
│   cd backend && bundle exec rspec           │
│   cd frontend && npm test                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Step 4: 리뷰 파일 업데이트                   │
│   - 수정 완료 표시                          │
│   - 수정 내용 기록                          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Step 5: Git 커밋 & 푸시                      │
│   - 수정된 파일 + 리뷰 파일 커밋            │
│   - main으로 푸시                           │
└─────────────────────────────────────────────┘
```

---

## 이슈 유형별 수정 가이드

### 1. N+1 쿼리
```ruby
# Before (N+1)
memberships.each { |m| puts m.user.name }

# After (Eager Loading)
memberships.includes(:user).each { |m| puts m.user.name }
```

### 2. 하드코딩된 값
```ruby
# Before
where(status: 'active')

# After - 상수 사용
where(status: STATUSES[:active])
# 또는
where(status: Membership::ACTIVE_STATUS)
```

### 3. 보안 이슈 (Mass Assignment)
```ruby
# Before
user.update(params[:user])

# After - Strong Parameters
user.update(user_params)

private
def user_params
  params.require(:user).permit(:name, :email)
end
```

### 4. 인덱스 누락
```ruby
# Migration 추가
class AddIndexToMemberships < ActiveRecord::Migration[8.0]
  def change
    add_index :memberships, :user_id
    add_index :memberships, [:status, :end_date]
  end
end
```

### 5. 에러 처리 누락
```ruby
# Before
user = User.find(params[:id])

# After
user = User.find_by(id: params[:id])
return render_not_found unless user
```

### 6. null 체크 누락
```ruby
# Before
user.membership.status

# After
user.membership&.status
```

---

## 수정 후 검증

### 1. 테스트 실행
```bash
# Backend
cd /Users/mindong-il/ringle-tutor-fix/backend
bundle exec rspec

# Frontend
cd /Users/mindong-il/ringle-tutor-fix/frontend
npm test
```

### 2. N+1 쿼리 검증
```bash
# Rails Console에서 쿼리 로그 확인
cd backend && rails c
# ActiveRecord::Base.logger = Logger.new(STDOUT)
# 해당 코드 실행하여 쿼리 수 확인
```

### 3. 보안 검증
```bash
# Brakeman (Rails 보안 스캐너)
cd backend && bundle exec brakeman
```

### 4. 린트 검증
```bash
# Backend
cd backend && bundle exec rubocop

# Frontend
cd frontend && npm run lint
```

---

## 리뷰 파일 업데이트 형식

수정 완료 후 해당 리뷰 파일에 추가:

```markdown
---

## 수정 완료

### 수정 일시
YYYY-MM-DD HH:MM

### 수정자
Claude Sonnet (Fixer Agent)

### 수정 내역
| # | 이슈 | 수정 파일 | 수정 내용 | 검증 |
|---|------|-----------|-----------|------|
| 1 | N+1 Query | memberships_controller.rb:15 | `includes(:user)` 추가 | ✅ 테스트 통과 |
| 2 | 하드코딩 | membership.rb:10 | 상수 사용으로 변경 | ✅ 테스트 통과 |

### 수정 커밋
```
fix(backend): Code Review 반영 - N+1 쿼리 및 하드코딩 수정

Co-Authored-By: Claude Sonnet <noreply@anthropic.com>
```
```

---

## 커밋 규칙

### 커밋 메시지 형식
```bash
git commit -m "$(cat <<'EOF'
fix(backend): Code Review 반영 - Phase X.Y

- [Critical #1] 파일명: N+1 쿼리 수정 (includes 추가)
- [Warning #1] 파일명: 하드코딩 → 상수 사용

Reviewed-by: Claude Sonnet (Code Review Agent)
Co-Authored-By: Claude Sonnet <noreply@anthropic.com>
EOF
)"
```

### 커밋 & 푸시 절차
```bash
# 1. 변경 사항 확인
git status
git diff

# 2. 수정된 파일 + 리뷰 파일 스테이징
git add backend/path/to/fixed_file.rb
git add docs/CodeReview/phase_X_Y_*.md

# 3. 커밋
git commit -m "fix(backend): Code Review 반영 - Phase X.Y ..."

# 4. main으로 푸시
git push origin fix-workspace:main
```

---

## 사용 방법

### 사용자 프롬프트 예시
```
CLAUDE_FIXER.md 읽고 Code Review Fixer 역할 수행해.
docs/CodeReview/phase_2_4_membership_api.md의 Critical 이슈 수정해줘.
```

### 특정 이슈만 수정
```
Phase 2.4 리뷰에서 N+1 쿼리 이슈만 수정해줘.
```

### 전체 Critical 수정
```
docs/CodeReview/ 전체에서 🔴 Critical 이슈 모두 수정해줘.
```

---

## README 업데이트

수정 완료 후 `docs/CodeReview/README.md` 상태 변경:

```markdown
| Phase | 파일 | 리뷰 상태 | 수정 상태 |
|-------|------|-----------|-----------|
| 2.4 | phase_2_4_membership_api.md | ✅ 완료 | ✅ 수정 완료 |
```

---

## 참고 파일

| 파일 | 설명 |
|------|------|
| `docs/CodeReview/README.md` | 코드 리뷰 인덱스 |
| `docs/CodeReview/phase_X_Y_*.md` | 개별 리뷰 파일 |
| `todo.md` | 개발 로드맵 |
| `docs/error_log.md` | 에러 기록 |
| `docs/coding_agent_interaction_history.md` | AI 상호작용 기록 |

---

## 주의사항

1. **디렉토리 확인**: 작업 전 `pwd`로 `/ringle-tutor-fix/`인지 확인
2. **테스트 필수**: 수정 후 반드시 테스트 실행
3. **최소 수정**: 이슈 관련 코드만 수정, 불필요한 리팩토링 금지
4. **기록 필수**: 모든 수정 내용을 리뷰 파일에 기록
5. **우선순위**: Critical → Warning 순서로 수정
6. **검증**: 수정이 실제로 문제를 해결하는지 확인
7. **브랜치 주의**: phase-X.Y 브랜치 직접 수정 금지 (개발 에이전트 영역)
