# /checkpoint - 기능 완료 확인 워크플로우

기능 구현 완료 후 검증 및 커밋 준비를 수행합니다.

## 사용법

```
/checkpoint $ARGUMENTS
```

$ARGUMENTS: 완료된 기능명 (예: "User 모델 구현")

## Git 브랜치 규칙

### 작업 전 필수 확인
```bash
git branch  # phase-X.x 브랜치인지 확인
```

### 브랜치 정책
- ✅ `phase-X.x` 브랜치에서 체크포인트
- ❌ `main` 브랜치에서는 커밋 제안 금지

## 수행 단계

### 1. 테스트 실행
```bash
# Backend 변경이 있는 경우
cd backend && bundle exec rspec

# Frontend 변경이 있는 경우
cd frontend && npm test -- --run
```

### 2. 린트/포맷 확인
```bash
# Backend
cd backend && bundle exec rubocop

# Frontend
cd frontend && npm run lint
```

### 3. 변경사항 요약
- 수정된 파일 목록
- 추가된 테스트 목록
- 통과한 테스트 수

### 4. 사용자에게 확인 요청

**체크포인트 완료 보고:**

```
## $ARGUMENTS 완료

### 변경 파일
- file1.rb (추가)
- file2.tsx (수정)

### 테스트 결과
- Backend: X examples, 0 failures
- Frontend: X tests passed

### 다음 단계
- [ ] 스크린샷 촬영 (docs/screenshots/...)
- [ ] /log-interaction으로 기록
- [ ] 커밋 진행 여부 확인

커밋을 진행할까요?
```

## 워크플로우

```
기능 구현 완료
    ↓
/checkpoint "기능명"
    ↓
테스트 자동 실행
    ↓
결과 보고
    ↓
사용자 확인
    ↓
/log-interaction "기능명"
    ↓
사용자 스크린샷 촬영
    ↓
커밋 요청 시 /commit
```

## 중요
- 테스트가 실패하면 커밋을 제안하지 않음
- 사용자가 명시적으로 승인해야 다음 단계 진행
- 스크린샷 촬영은 사용자가 직접 수행
