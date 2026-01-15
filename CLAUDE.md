# CLAUDE.md - Ringle AI Tutor 개발 가이드

> Claude Code와의 효율적인 상호작용을 위한 프롬프트 가이드 및 개발 규칙

---

## 프로젝트 개요

| 항목 | 기술 스택 |
|------|----------|
| **Backend** | Rails 8 API (`/backend`) - Ruby 3.3.6 |
| **Frontend** | React 19 + TypeScript + Vite (`/frontend`) |
| **테스트** | RSpec (Backend), Vitest (Frontend) |
| **목표** | 영어 학습용 AI 튜터 앱 (멤버십 기반) |

---

## 1. 프롬프트 템플릿

### 1.1 Backend 개발

#### 모델 생성
```
User 모델을 생성해줘.
- 필드: email (string, unique), name (string)
- 유효성 검사: email 형식, 필수 필드
- 테스트: spec/models/user_spec.rb 작성
- 완료 후 /checkpoint 실행
```

#### API 엔드포인트 생성
```
GET /api/v1/memberships 엔드포인트를 만들어줘.
- 현재 유저의 활성 멤버십 목록 반환
- JSON 응답 형식: { memberships: [...] }
- Request Spec 작성
- 인증 실패 시 401, 멤버십 없으면 빈 배열
```

#### 서비스 클래스 생성
```
PaymentService를 만들어줘.
- Mock PG 결제 처리
- 성공 시 멤버십 자동 생성
- 실패 시 에러 반환
- instance_double로 테스트 작성
```

### 1.2 Frontend 개발

#### 컴포넌트 생성
```
MembershipCard 컴포넌트를 만들어줘.
- Props: membership (type, endDate, status)
- 만료일까지 남은 일수 표시
- 만료된 경우 빨간색 배지
- 테스트 작성
```

#### 커스텀 훅 생성
```
useAudioRecorder 훅을 만들어줘.
- MediaRecorder API 사용
- 상태: isRecording, audioBlob, duration
- 메서드: startRecording, stopRecording, resetRecording
- 브라우저 API는 Mock으로 테스트
```

#### 페이지 생성
```
대화 페이지(Conversation.tsx)를 만들어줘.
- 상단: 남은 시간 표시
- 중앙: 채팅 버블 목록
- 하단: 녹음 버튼 + Waveform
- 상태 관리: Context 사용
```

### 1.3 AI 통합

#### STT/TTS 서비스
```
STT 서비스를 만들어줘.
- 오디오 파일을 텍스트로 변환
- API: [사용할 STT API]
- 에러 핸들링: 타임아웃, 인식 실패
- Mock으로 테스트 가능하게
```

#### LLM 연동
```
Gemini API로 LLM 서비스를 만들어줘.
- API Key: ENV['GEMINI_API_KEY']
- 프롬프트 템플릿 관리
- 대화 히스토리 컨텍스트 유지
- 스트리밍 응답 처리
```

---

## 2. 테스트 프롬프트

### 2.1 단위 테스트 (Backend)
```
Membership 모델의 경계값 테스트를 작성해줘.
- 어제 만료된 멤버십 → active? = false
- 오늘 만료되는 멤버십 → active? = true
- 내일 만료되는 멤버십 → active? = true
- 시작일이 미래인 멤버십 → active? = false
```

### 2.2 단위 테스트 (Frontend)
```
MembershipCard 컴포넌트 테스트를 작성해줘.
- 활성 멤버십 렌더링 확인
- 만료 멤버십 시 빨간 배지 표시 확인
- 남은 일수 계산 정확성 확인
```

### 2.3 통합 테스트 (Request Spec)
```
멤버십 API 통합 테스트를 작성해줘.
- 인증된 유저 → 200 + 멤버십 목록
- 미인증 → 401 Unauthorized
- 만료된 멤버십으로 보호된 리소스 접근 → 403 Forbidden
```

### 2.4 전체 테스트 실행
```
/test
```

---

## 3. Chrome 테스트 (UI 검증)

### 3.1 Chrome 연동 시작
```bash
claude --chrome
```

### 3.2 Chrome 테스트 프롬프트

#### 로컬 개발 서버 테스트
```
localhost:5173 열어서 홈 화면이 제대로 렌더링되는지 확인해줘.
- 멤버십 카드가 보이는지
- 콘솔에 에러가 없는지
- 레이아웃이 깨지지 않았는지
```

#### 폼 유효성 검사 테스트
```
localhost:5173/purchase 열어서 결제 폼 테스트해줘.
- 빈 필드로 제출 시 에러 메시지 확인
- 잘못된 카드번호 입력 시 에러 확인
- 정상 입력 시 다음 단계로 이동 확인
```

#### 오디오 기능 테스트
```
localhost:5173/conversation 열어서 녹음 기능 테스트해줘.
- 녹음 버튼 클릭 시 마이크 권한 요청 확인
- 녹음 중 Waveform 애니메이션 확인
- 녹음 완료 후 오디오 재생 가능한지 확인
```

#### 반응형 디자인 테스트
```
localhost:5173을 모바일 크기(375x667)로 열어서 확인해줘.
- 레이아웃이 모바일에 맞게 조정되는지
- 버튼이 터치하기 적절한 크기인지
- 스크롤이 자연스러운지
```

#### 사용자 플로우 테스트
```
전체 사용자 플로우를 테스트해줘.
1. 홈 → 멤버십 구매 버튼 클릭
2. 요금제 선택 → 결제 정보 입력
3. 결제 완료 → 대화 페이지로 이동
4. 녹음 → AI 응답 확인
각 단계 스크린샷 찍어줘.
```

#### GIF 녹화
```
녹음부터 AI 응답까지의 플로우를 GIF로 녹화해줘.
저장 위치: docs/screenshots/demo_conversation.gif
```

#### 콘솔 에러 디버깅
```
localhost:5173 열고 모든 페이지를 돌아다니면서
콘솔에 에러나 경고가 있는지 확인해줘.
발견되면 원인 분석하고 수정해줘.
```

---

## 4. 자동화 규칙

### 4.1 PostToolUse Hook (자동 실행)
코드 수정(`Edit`) 또는 생성(`Write`) 후 자동으로:
- `.rb` 파일 → `bundle exec rubocop -A`
- `.ts/.tsx` 파일 → `npx prettier --write` + `npx eslint --fix`

### 4.2 자동 수정 원칙
- 포맷팅/사소한 문법 에러 → 묻지 말고 자동 수정
- 테스트 실패 → 원인 분석 후 수정
- 린트 에러 → 자동 수정

### 4.3 수동 검증 필수
로직 수정 시 반드시:
```bash
# Backend
cd backend && bundle exec rspec

# Frontend
cd frontend && npm test
```

---

## 5. 슬래시 커맨드

| 커맨드 | 용도 | 사용 시점 |
|--------|------|----------|
| `/checkpoint "기능명"` | 테스트 실행 + 결과 확인 | 기능 구현 완료 후 |
| `/log-interaction "기능명"` | docs에 상호작용 기록 | 체크포인트 통과 후 |
| `/commit` | 커밋 메시지 생성 | 사용자 승인 후 |
| `/test` | 전체 테스트 실행 | 수시로 |
| `/fix-error "에러명"` | 에러 해결 + 기록 | 에러 발생 시 |
| `/chrome` | Chrome 연동 상태 확인 | Chrome 테스트 전 |

---

## 6. 체크포인트 워크플로우

```
기능 구현 완료
    ↓
/checkpoint "기능명"    ← 테스트 실행, 결과 확인
    ↓
사용자 확인 대기       ← 수정 요청
    ↓
/log-interaction "기능명"  ← docs에 상세 기록
    ↓
스크린샷 촬영 (사용자)   ← docs/screenshots/ 저장
    ↓
커밋 → /commit
```

### 중요 원칙
- **커밋은 사용자 확인 후에만** 실행
- 테스트 실패 시 커밋 불가
- Chrome 테스트는 UI 변경 시 필수

---

## 6.1 Git 브랜치 규칙 (필수!)

### 브랜치 작업 완료 후 반드시 main으로 이동

```
phase-X.Y 브랜치에서 작업
    ↓
코드 작성 + 테스트 통과
    ↓
git add && git commit && git push
    ↓
★★★ git checkout main ★★★   ← 필수! 브랜치 작업 후 반드시 실행
    ↓
다음 phase 브랜치로 이동 (phase-X.Z)
```

### 절대 지켜야 할 규칙
1. **브랜치 작업이 끝나면 즉시 main 브랜치로 이동**
2. 다른 브랜치에서 작업 중인 상태로 대기하지 않음
3. 한 phase 완료 후 바로 main으로 나와서 다음 phase 준비

### 잘못된 예시 (금지)
```bash
# phase-3.1 작업 완료 후
git push origin phase-3.1
# (main으로 이동하지 않고 그냥 대기) ← 금지!
```

### 올바른 예시
```bash
# phase-3.1 작업 완료 후
git push origin phase-3.1
git checkout main              # ← 필수!
git checkout -b phase-3.2      # 다음 작업
```

---

## 7. 테스트 전략

### Backend (RSpec)
| 유형 | 대상 | 원칙 |
|------|------|------|
| Model Spec | Membership | 경계값 테스트 (만료일) |
| Request Spec | API 엔드포인트 | 인증/권한 테스트 |
| Service Spec | PaymentService | `instance_double` 사용 |

### Frontend (Vitest)
| 유형 | 대상 | 원칙 |
|------|------|------|
| Component | UI 컴포넌트 | React Testing Library |
| Hook | Custom Hooks | renderHook 사용 |
| Browser API | 마이크/오디오 | Mock 필수 |

### Chrome (E2E)
| 유형 | 대상 | 원칙 |
|------|------|------|
| 렌더링 | 페이지 로드 | 콘솔 에러 없음 |
| 인터랙션 | 폼, 버튼 | 클릭/입력 동작 |
| 플로우 | 사용자 여정 | 전체 시나리오 |

---

## 8. 프로젝트 구조

```
ringle-tutor/
├── backend/                 # Rails 8 API
│   ├── app/
│   │   ├── controllers/api/v1/
│   │   ├── models/
│   │   └── services/
│   └── spec/               # RSpec
├── frontend/               # React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── context/
│   └── ...
├── docs/
│   ├── coding_agent_interaction_history.md
│   ├── error_log.md
│   ├── screenshots/
│   │   ├── 01_setup/
│   │   ├── 02_backend/
│   │   ├── 03_frontend/
│   │   └── 04_ai/
│   └── api_specs/
└── .claude/
    ├── settings.json
    └── commands/
```

---

## 9. 커밋 규칙

### Conventional Commits
```
<type>(<scope>): <description>

Co-Authored-By: Claude Code <noreply@anthropic.com>
```

### 타입
- `feat`: 새 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링
- `test`: 테스트
- `docs`: 문서
- `chore`: 설정/빌드

---

## 10. 자주 발생하는 에러

| 에러 | 원인 | 해결책 |
|------|------|--------|
| Ruby 3.2 + Rails 8 빌드 실패 | bigdecimal 호환성 | Ruby 3.3 이상 사용 |
| AudioContext not allowed | 브라우저 정책 | 사용자 클릭 후 resume() |
| CORS 에러 | API 설정 누락 | rack-cors 설정 |
| Hydration mismatch | SSR/CSR 불일치 | useEffect로 클라이언트 전용 처리 |
| Chrome 연동 실패 | 확장 프로그램 | /chrome으로 재연결 |

---

## 11. 환경 변수

```bash
# Backend (.env)
GEMINI_API_KEY=your_key_here
RAILS_ENV=development

# Frontend (.env.local)
VITE_API_URL=http://localhost:3000/api/v1
```

---

## 12. 빠른 참조

### 자주 쓰는 명령어
```bash
# 개발 서버
cd backend && rails s -p 3000
cd frontend && npm run dev

# 테스트
cd backend && bundle exec rspec
cd frontend && npm test

# 린트
cd backend && bundle exec rubocop
cd frontend && npm run lint

# Chrome 모드
claude --chrome
```

### 유용한 프롬프트
```
# 현재 상태 확인
"현재 진행 상황 알려줘"
"todo.md에서 다음 할 일 뭐야?"

# 디버깅
"이 에러 왜 나는지 분석해줘: [에러 메시지]"
"콘솔 에러 확인하고 수정해줘"

# 리뷰
"방금 작성한 코드 보안 이슈 없는지 확인해줘"
"테스트 커버리지 충분한지 확인해줘"
```

---

## 13. 참고 자료

- [프로젝트 요구사항](./requirements.md)
- [개발 로드맵](./todo.md)
- [AI 상호작용 기록](./docs/coding_agent_interaction_history.md)
- [에러 로그](./docs/error_log.md)
