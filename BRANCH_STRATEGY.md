# Git Branch Strategy

> Ringle AI Tutor 프로젝트 브랜치 전략

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
- ✅ phase-X.x 브랜치 생성
- ✅ phase-X.x 브랜치에 커밋 & 푸시
- ❌ main 브랜치 커밋 금지
- ❌ PR 생성 금지
- ❌ Merge 금지

### 리뷰 에이전트 (Sonnet Reviewer)
- ✅ docs/CodeReview/ 파일 작성
- ❌ 코드 수정 금지
- ❌ 커밋 금지

### 수정 에이전트 (Sonnet Fixer)
- ✅ 코드 수정
- ✅ phase-X.x 브랜치에 커밋 & 푸시
- ❌ main 브랜치 커밋 금지
- ❌ PR 생성 금지
- ❌ Merge 금지

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
