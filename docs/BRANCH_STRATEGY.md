# Git Branch Strategy

> Ringle AI Tutor 프로젝트 브랜치 전략

---

## ⚠️ 멀티 에이전트 환경: Git Worktree

### 문제점
여러 Claude 에이전트(개발, 리뷰, 수정)가 동일한 디렉토리에서 작업하면 `git checkout` 시 충돌 발생.

### 해결책: Git Worktree
각 에이전트가 **독립된 디렉토리**에서 작업하여 브랜치 충돌 방지.

```
/Users/mindong-il/
├── ringle-tutor/           ← 개발 에이전트 (Opus)
│   └── 브랜치: main 또는 phase-X.Y
├── ringle-tutor-review/    ← 리뷰 에이전트 (Sonnet)
│   └── 브랜치: review-workspace (origin/main 추적)
└── ringle-tutor-fix/       ← 수정 에이전트 (Sonnet)
    └── 브랜치: fix-workspace (origin/main 추적)
```

### Worktree 설정 (최초 1회) - ✅ 설정 완료
```bash
cd /Users/mindong-il/ringle-tutor
git worktree add ../ringle-tutor-review -b review-workspace origin/main
git worktree add ../ringle-tutor-fix -b fix-workspace origin/main
```

### 현재 Worktree 상태
```
/Users/mindong-il/ringle-tutor         [main]
/Users/mindong-il/ringle-tutor-fix     [fix-workspace]
/Users/mindong-il/ringle-tutor-review  [review-workspace]
```

### 에이전트별 작업 디렉토리
| 에이전트 | 디렉토리 | 브랜치 | 푸시 대상 |
|----------|----------|--------|-----------|
| 개발 (Opus) | `/ringle-tutor/` | phase-X.Y | `origin/phase-X.Y` |
| 리뷰 (Sonnet) | `/ringle-tutor-review/` | review-workspace | `origin main` |
| 수정 (Sonnet) | `/ringle-tutor-fix/` | fix-workspace | `origin main` |

### 리뷰/수정 에이전트 푸시 방법
```bash
# review-workspace → main으로 푸시
git push origin review-workspace:main

# fix-workspace → main으로 푸시
git push origin fix-workspace:main
```

---

## 브랜치 구조 (플랫)

```
main (production)
│
├── phase-2.1 → PR → main
├── phase-2.2 → PR → main
├── phase-2.3 → PR → main
├── phase-2.4 → PR → main
├── phase-2.5 → PR → main
├── phase-2.6 → PR → main
│
├── phase-3.1 → PR → main
├── phase-3.2 → PR → main
└── ...
```

---

## 브랜치 종류

| 브랜치 | 용도 | 머지 대상 |
|--------|------|-----------|
| `main` | 프로덕션 코드 | - |
| `phase-X.x` | Phase별 기능 개발 | main |

---

## 워크플로우

```
main ────●────●────●────●────●────▶
         ↑    ↑    ↑    ↑    ↑
         │    │    │    │    │
phase-2.1●    │    │    │    │
phase-2.2─────●    │    │    │
phase-2.3──────────●    │    │
phase-2.4───────────────●    │
phase-2.5────────────────────●
```

### PR 흐름
1. `phase-2.1` 브랜치 생성 (from main)
2. 개발 완료 후 PR 생성
3. CI 통과 (테스트 + 린트)
4. main으로 Merge
5. 다음 Phase 반복

---

## 에이전트별 권한

### 개발 에이전트 (Opus)
**디렉토리: `/ringle-tutor/`**
- ✅ phase-X.x 브랜치 생성
- ✅ phase-X.x 브랜치에 커밋 & 푸시
- ❌ main 브랜치 커밋 금지
- ❌ PR 생성 금지
- ❌ Merge 금지

### 리뷰 에이전트 (Sonnet Reviewer)
**디렉토리: `/ringle-tutor-review/`**
**브랜치: `review-workspace`**
- ✅ docs/CodeReview/ 파일 작성 및 커밋
- ✅ `git show origin/phase-X.Y:파일`로 원격 코드 확인
- ✅ `git push origin review-workspace:main`으로 푸시
- ❌ 코드 파일 수정 금지
- ❌ `git checkout` 금지

### 수정 에이전트 (Sonnet Fixer)
**디렉토리: `/ringle-tutor-fix/`**
**브랜치: `fix-workspace`**
- ✅ 코드 수정 및 커밋
- ✅ `git push origin fix-workspace:main`으로 푸시
- ✅ hotfix/이슈명 브랜치 생성 가능
- ❌ phase-X.x 브랜치 직접 수정 금지

### 사용자 (Human)
- ✅ PR 생성
- ✅ PR 리뷰 & 승인
- ✅ Merge 실행
- ✅ 모든 브랜치 접근 가능

---

## CI (GitHub Actions)

### 모든 PR에서 실행
```yaml
# Backend
- bundle exec rspec          # 전체 테스트
- bundle exec rubocop        # 린트

# Frontend
- npm test -- --run          # 전체 테스트
- npm run lint               # 린트
- npx tsc --noEmit           # 타입 체크
```

### Branch Protection (main)
- ✅ Require pull request before merging
- ✅ Require status checks to pass
- ✅ Require branches to be up to date

---

## 커밋 메시지 규칙

### 형식
```
<type>(<scope>): <description>

[body]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Type
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 등

---

## 참고

- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Conventional Commits](https://www.conventionalcommits.org/)
