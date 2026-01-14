# /test - 전체 테스트 실행

Backend와 Frontend의 모든 테스트를 실행합니다.

## 기본 실행

```bash
# Backend (Rails RSpec)
cd /Users/mindong-il/ringle-tutor/backend && bundle exec rspec

# Frontend (Vitest)
cd /Users/mindong-il/ringle-tutor/frontend && npm test
```

## 인자 사용

특정 파일만 테스트하려면:
```
/test $ARGUMENTS
```

### 예시
- `/test membership` → membership 관련 spec 파일만 실행
- `/test backend` → Backend만 테스트
- `/test frontend` → Frontend만 테스트

## 테스트 결과 해석
- 모든 테스트 통과: 커밋 진행 가능
- 실패 테스트 존재: 수정 후 재실행 필요
