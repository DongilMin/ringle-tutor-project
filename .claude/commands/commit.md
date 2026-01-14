# /commit - 자동 커밋 생성

현재 staged 변경사항을 분석하고 Conventional Commits 형식의 커밋 메시지를 생성합니다.

## Git 브랜치 규칙

### 작업 전 필수 확인
```bash
git branch  # phase-X.x 브랜치인지 확인
```

### 브랜치 정책
- ✅ `phase-X.x` 브랜치에서 커밋
- ❌ `main` 브랜치 직접 커밋 금지

## 실행 단계

1. `git branch`로 현재 브랜치 확인 (main이면 중단)
2. `git status`로 변경된 파일 확인
2. `git diff --staged`로 변경 내용 분석
3. 변경 유형 판단 (feat/fix/refactor/test/docs/chore)
4. 적절한 커밋 메시지 생성
5. `git commit` 실행

## 커밋 메시지 형식

```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: Claude Code <noreply@anthropic.com>
```

## 타입 가이드
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `docs`: 문서 수정
- `chore`: 빌드, 설정 변경

## 주의사항
- .env, credentials 등 민감한 파일은 커밋하지 않음
- 테스트 실패 시 커밋 중단 권고
