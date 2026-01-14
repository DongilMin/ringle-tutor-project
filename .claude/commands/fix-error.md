# /fix-error - 에러 해결 및 기록

에러를 분석하고 해결한 뒤 `docs/error_log.md`에 기록합니다.

## 사용법

```
/fix-error $ARGUMENTS
```

$ARGUMENTS에는 에러 메시지 또는 설명을 입력합니다.

## Git 브랜치 규칙

### 작업 전 필수 확인
```bash
git branch  # phase-X.x 브랜치인지 확인
```

### 브랜치 정책
- ✅ `phase-X.x` 브랜치에서 수정
- ❌ `main` 브랜치 직접 커밋 금지

### 에러 수정 후 커밋
```bash
git add .
git commit -m "fix: 에러명 수정"
git push origin phase-X.x
```

## 실행 단계

1. **브랜치 확인**
   - 현재 브랜치가 phase-X.x인지 확인
   - main이면 작업 중단

2. **에러 분석**
   - 에러 메시지 파싱
   - 관련 파일 및 라인 확인
   - 원인 파악

3. **해결책 적용**
   - 코드 수정
   - 설정 변경 (필요시)

4. **테스트 확인**
   - 관련 테스트 실행
   - 에러 재발 방지 확인

5. **커밋 & 문서화**
   - feature/fix 브랜치에 커밋
   - `docs/error_log.md`에 기록

## 기록 형식

| 날짜 | 에러 | 원인 | 해결책 | 참고 |
|------|------|------|--------|------|
| YYYY-MM-DD | 에러 메시지 | 원인 설명 | 해결 방법 | 관련 링크 |

## 예시

```
/fix-error ActiveRecord::RecordNotFound in MembershipsController
```
