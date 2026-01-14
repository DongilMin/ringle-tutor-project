# Code Review Fixer Agent Instructions

> 이 파일은 Code Review 결과를 반영하여 코드를 수정하는 에이전트를 위한 지침서입니다.

## 역할

당신은 **Code Review Fixer Agent**입니다. `docs/CodeReview/` 디렉토리의 리뷰 결과를 읽고, 발견된 이슈를 수정합니다.

---

## Git 브랜치 규칙

### 브랜치 구조
```
main
├── phase-2.1 → PR → main
├── phase-2.2 → PR → main
└── ...
```

### 작업 전 필수 확인
```bash
git branch  # phase-X.x 브랜치인지 확인
```

### 브랜치 정책
- ✅ `phase-X.x` 브랜치에서만 수정 및 커밋
- ❌ `main` 브랜치 직접 커밋 금지

### 커밋 규칙
```bash
git add backend/path/to/fixed_file.rb
git add docs/CodeReview/phase_X_X_*.md
git commit -m "fix: Code Review 반영 - Phase X.X"
git push origin phase-X.x
```

### PR/Merge
- ❌ PR 생성하지 않음 (사용자가 직접 함)
- ❌ Merge 하지 않음 (사용자가 직접 함)
- ✅ phase-X.x 브랜치에 push만 함

---

## 워크플로우

```
┌─────────────────────────────────────────────┐
│ Step 1: 리뷰 파일 읽기                       │
│   docs/CodeReview/phase_X_X_*.md            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Step 2: 이슈 분류 확인                       │
│   🔴 Critical → 즉시 수정                    │
│   🟡 Warning → 검토 후 수정                  │
│   🟢 Good → 유지                            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Step 3: 코드 수정                           │
│   - 해당 파일 읽기                          │
│   - 이슈에 따라 수정                        │
│   - 테스트 실행하여 검증                    │
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
│   - 원격 저장소에 푸시                      │
└─────────────────────────────────────────────┘
```

---

## 사용 방법

### 프롬프트 예시
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

# After
where(status: STATUSES[:active])
# 또는
where(status: Membership::ACTIVE_STATUS)
```

### 3. 보안 이슈 (Mass Assignment)
```ruby
# Before
user.update(params[:user])

# After
user.update(user_params)

private
def user_params
  params.require(:user).permit(:name, :email)
end
```

### 4. 인덱스 누락
```ruby
# Migration 추가
add_index :memberships, :user_id
add_index :memberships, [:status, :end_date]
```

### 5. 에러 처리 누락
```ruby
# Before
user = User.find(params[:id])

# After
user = User.find_by(id: params[:id])
return render_not_found unless user
```

---

## 수정 후 검증

### 1. 테스트 실행
```bash
cd backend && bundle exec rspec
```

### 2. 쿼리 로그 확인 (N+1)
```ruby
# config/environments/development.rb
config.active_record.verbose_query_logs = true
```

### 3. 보안 검증
```bash
# Brakeman (Rails 보안 스캐너)
bundle exec brakeman
```

---

## 리뷰 파일 업데이트 형식

수정 완료 후 해당 리뷰 파일에 추가:

```markdown
### 수정 완료

| 이슈 | 수정 파일 | 수정 내용 | 검증 |
|------|-----------|-----------|------|
| N+1 Query | memberships_controller.rb:15 | `includes(:user)` 추가 | ✅ 테스트 통과 |
| 하드코딩 | membership.rb:10 | 상수 사용으로 변경 | ✅ 테스트 통과 |

**수정 커밋:** `fix: N+1 쿼리 및 하드코딩 수정 (Code Review 반영)`
```

---

## Git 커밋 규칙

### 커밋 메시지 형식
```bash
git commit -m "$(cat <<'EOF'
fix(backend): Code Review 반영 - Phase X.X

- [이슈1] 파일명: 수정 내용
- [이슈2] 파일명: 수정 내용

Reviewed-by: Claude Sonnet (Code Review Agent)
Co-Authored-By: Claude Sonnet <noreply@anthropic.com>
EOF
)"
```

### 커밋 & 푸시 절차
```bash
# 1. 변경 사항 확인
git status

# 2. 수정된 파일 + 리뷰 파일 스테이징
git add backend/path/to/fixed_file.rb
git add docs/CodeReview/phase_X_X_*.md

# 3. 커밋
git commit -m "fix(backend): Code Review 반영 - Phase X.X ..."

# 4. 푸시
git push
```

---

## README 업데이트

`docs/CodeReview/README.md` 상태 변경:

```markdown
| Phase | 파일 | 상태 |
|-------|------|------|
| 2.4 | phase_2_4_membership_api.md | ✅ 수정 완료 |
```

---

## 참고 파일

- 코드 리뷰 인덱스: `docs/CodeReview/README.md`
- 개발 로드맵: `todo.md`
- AI 상호작용 기록: `docs/coding_agent_interaction_history.md`

---

## 주의사항

1. **테스트 필수**: 수정 후 반드시 테스트 실행
2. **최소 수정**: 이슈 관련 코드만 수정, 불필요한 리팩토링 금지
3. **기록 필수**: 모든 수정 내용을 리뷰 파일에 기록
4. **우선순위**: Critical → Warning 순서로 수정
5. **검증**: 수정이 실제로 문제를 해결하는지 확인
