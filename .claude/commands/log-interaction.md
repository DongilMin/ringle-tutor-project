# /log-interaction - AI 상호작용 상세 기록

현재 작업을 `docs/coding_agent_interaction_history.md`에 상세히 기록합니다.

## 사용법

```
/log-interaction $ARGUMENTS
```

$ARGUMENTS: 작업 제목 (예: "2.1 User 모델 생성")

## 수행 단계

1. **현재 Phase 확인** - todo.md에서 현재 진행 중인 Phase 확인
2. **기록 작성** - 아래 템플릿에 맞춰 coding_agent_interaction_history.md에 추가
3. **스크린샷 위치 안내** - 사용자에게 스크린샷 저장 위치 안내

## 기록 템플릿

```markdown
## [날짜] $ARGUMENTS

### 1. 프롬프트 (Input)
```
(사용자가 입력한 원본 프롬프트)
```

### 2. AI 출력 (Output)
**생성된 파일:**
- `path/to/file1.rb` - 설명
- `path/to/file2.tsx` - 설명

**핵심 코드:**
```언어
// 가장 중요한 코드 스니펫 (20줄 이내)
```

### 3. 검토/수정
- [ ] 코드 리뷰 완료
- [ ] 보안 체크 (SQL Injection, XSS 등)
- [ ] 성능 고려

### 4. 검증 (테스트)
```bash
$ (실행한 테스트 명령어)
# 결과: (테스트 결과)
```

### 5. 스크린샷
- [ ] 입력: `screenshots/{phase}/{번호}_input.png`
- [ ] 출력: `screenshots/{phase}/{번호}_output.png`
- [ ] 테스트: `screenshots/{phase}/{번호}_test.png`

### 6. 배운 점 / 이슈
| 이슈 | 원인 | 해결 |
|------|------|------|
| (있다면 기록) | | |
```

## 스크린샷 디렉토리
- `docs/screenshots/01_setup/` - Phase 1: 초기 세팅
- `docs/screenshots/02_backend/` - Phase 2: Backend 개발
- `docs/screenshots/03_frontend/` - Phase 3: Frontend 개발
- `docs/screenshots/04_ai/` - Phase 4: AI 통합

## 예시

```
/log-interaction "2.1 User 모델 생성"
```

## 중요
- 모든 기능 구현마다 기록 필수 (과제 제출 요구사항)
- 스크린샷은 사용자가 직접 촬영하여 해당 위치에 저장
- Input/Output이 명확히 구분되어야 함
