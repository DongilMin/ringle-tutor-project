# Project Roadmap: Ringle AI Tutor

> 각 작업 완료 시 `/checkpoint` → `/log-interaction` → 스크린샷 → 커밋 확인

---

## Phase 1: 초기 세팅 ✅ COMPLETED

### 1.1 프로젝트 구조
- [x] Rails 8 API 프로젝트 초기화 (`/backend`)
- [x] React 19 + TypeScript + Vite 초기화 (`/frontend`)
- [x] Ruby 3.3.6 환경 설정
- [x] Git 저장소 연결

### 1.2 자동화 (Boris Style)
- [x] PostToolUse Hook 설정 (`.claude/settings.json`)
- [x] 자동 포매팅 스크립트 (`scripts/auto-format.sh`)
- [x] husky + lint-staged 설정

### 1.3 테스트 환경
- [x] RSpec 설정 (Backend)
- [x] Vitest + React Testing Library 설정 (Frontend)
- [x] GitHub Actions CI 설정

### 1.4 문서화
- [x] CLAUDE.md 생성 (개발 규칙)
- [x] docs/coding_agent_interaction_history.md 구조화
- [x] 슬래시 커맨드 생성 (/commit, /test, /log-interaction, /fix-error, /checkpoint)

### 1.5 DB 설계 및 API 명세 ✅
- [x] DB 스키마 설계 및 ERD 작성 (`docs/db_schema.md`)
- [x] API 명세 작성 (`docs/api_specs/`)

---

## Phase 2: Backend - 멤버십 시스템

### 2.1 User 모델 생성 ✅
**파일:** `app/models/user.rb`, `db/migrate/20260114153300_create_users.rb`
- [x] User 모델 생성 (email:string, name:string)
- [x] 유효성 검사 (email 형식, 필수 필드, unique)
- [x] User 모델 스펙 작성 (9 examples, 0 failures)
- [x] shoulda-matchers 추가

### 2.2 Membership 모델 생성 ✅
**파일:** `app/models/membership.rb`, `db/migrate/20260114154755_create_memberships.rb`
- [x] Membership 모델 생성 (membership_type, start_date, end_date, status)
- [x] User `has_many :memberships` 관계 설정
- [x] `active?` 메서드 구현 (만료일 체크)
- [x] 경계값 테스트 4개 (19 examples, 0 failures)

### 2.3 Payment 모델 생성 ✅
**파일:** `app/models/payment.rb`, `db/migrate/20260114155918_create_payments.rb`
- [x] Payment 모델 생성 (amount, status, payment_method, transaction_id)
- [x] User `has_many :payments` 관계 설정
- [x] 상태 변경 메서드 (#complete!, #fail!, #refund!)
- [x] 17 examples, 0 failures

### 2.4 멤버십 API ✅
**파일:** `app/controllers/api/v1/memberships_controller.rb`, `app/controllers/api/v1/admin/memberships_controller.rb`

**설계 패턴 적용:**
- BaseController + Concerns (ErrorHandler, ResponseRenderer)
- BaseSerializer 상속 구조
- Namespace 기반 API 버저닝 (v1)

**구현 완료:**
- [x] GET /api/v1/memberships (목록)
- [x] GET /api/v1/memberships/:id (상세)
- [x] GET /api/v1/memberships/current (현재 활성)
- [x] POST /api/v1/admin/memberships (생성)
- [x] DELETE /api/v1/admin/memberships/:id (soft delete)
- [x] Request Spec 16개 작성 (61 examples 전체 통과)

### 2.5 멤버십 만료 체크 Concern ✅
**파일:** `app/controllers/concerns/membership_check.rb`
- [x] `before_action` 훅으로 만료 체크
- [x] 만료 시 403 Forbidden 응답
- [x] Request Spec 8개 (경계값 테스트 포함)
- [x] 버그 수정: `started` scope 추가 (미래 시작일 필터링)

### 2.6 결제 서비스 (Mock)
**예상 파일:** `app/services/payment_service.rb`
- [x] PaymentService 클래스 생성
- [x] MockPG 호출 시뮬레이션
- [x] `POST /api/v1/payments` 엔드포인트
- [x] 결제 성공 시 멤버십 자동 생성
- [x] Service Spec: `instance_double`로 PG Mocking
- [x] `/checkpoint "결제 서비스"` 실행

---

## Phase 3: Frontend - UI & 오디오

### 3.1 기본 UI

#### 3.1.1 홈 화면
**예상 파일:** `src/pages/Home.tsx`, `src/components/MembershipCard.tsx`
- [x] 홈 페이지 컴포넌트
- [x] 멤버십 상태 카드 컴포넌트
- [x] API 연동 (멤버십 조회)
- [x] 컴포넌트 테스트
- [x] `/checkpoint "홈 화면"` 실행

#### 3.1.2 멤버십 구매 화면
**예상 파일:** `src/pages/Purchase.tsx`, `src/components/PlanSelector.tsx`
- [x] 구매 페이지 컴포넌트
- [x] 요금제 선택 컴포넌트
- [x] 결제 API 연동
- [x] 컴포넌트 테스트
- [x] `/checkpoint "구매 화면"` 실행

#### 3.1.3 대화 화면 레이아웃
**예상 파일:** `src/pages/Conversation.tsx`, `src/components/ChatBubble.tsx`
- [x] 대화 페이지 컴포넌트
- [x] 채팅 버블 컴포넌트
- [x] 레이아웃 스타일링

### 3.2 오디오 기능 (Web Audio API) ✅ COMPLETED (phase-3.2-fix)

#### 3.2.1 마이크 권한 훅
**파일:** `src/hooks/useAudioPermission.ts`
- [x] `navigator.mediaDevices.getUserMedia` 권한 요청
- [x] 권한 상태 관리 (granted, denied, prompt)
- [x] 에러 핸들링
- [x] 훅 테스트 (Mock 처리)

#### 3.2.2 녹음 기능 훅
**파일:** `src/hooks/useAudioRecorder.ts`
- [x] MediaRecorder API 사용
- [x] 녹음 시작/중지/일시정지
- [x] Blob 데이터 생성
- [x] 훅 테스트

#### 3.2.3 Waveform 시각화 컴포넌트
**파일:** `src/components/Waveform.tsx`
- [x] AudioContext + AnalyserNode 설정
- [x] Canvas 렌더링
- [x] `getByteTimeDomainData()` 사용
- [x] 실시간 애니메이션
- [x] 컴포넌트 테스트

### 3.3 상태 관리 ✅ COMPLETED (phase-3.3-fix)
**파일:** `src/context/ConversationContext.tsx`
- [x] 대화 상태 Context 생성
- [x] 메시지 히스토리 관리
- [x] 녹음 상태 관리
- [x] 테스트 13개 통과

### 3.4 VAD (Voice Activity Detection) ✅ COMPLETED
**파일:** `src/hooks/useAudioRecorder.ts`
- [x] AudioContext + AnalyserNode로 오디오 레벨 모니터링
- [x] 침묵 감지 알고리즘 구현 (silenceThreshold, silenceDuration)
- [x] 자동 녹음 중지 기능 (사용자가 말 끝나면 자동 전송)
- [x] VAD 설정 인터페이스 (enabled, silenceThreshold, silenceDuration, minRecordingTime)
- [x] Conversation.tsx에 VAD 상태 UI 표시 (음량 바, 자동 중지 표시)

---

## Phase 4: AI 통합

### 4.1 Backend AI 서비스 ✅ COMPLETED (phase-4.1)

#### 4.1.1 STT 서비스
**파일:** `app/services/stt_service.rb`
- [x] STT API 연동 클래스
- [x] 오디오 파일 → 텍스트 변환 (4개 포맷 지원)
- [x] 에러 핸들링 (InvalidAudioError, TimeoutError, ApiError)
- [x] Service Spec (11 examples)

#### 4.1.2 LLM 서비스 (Gemini)
**파일:** `app/services/llm_service.rb`
- [x] Gemini API 연동 클래스 (gemini-1.5-flash)
- [x] 영어 튜터 시스템 프롬프트
- [x] 대화 컨텍스트 관리 (conversation_history)
- [x] Mock/실제 API 전환 가능
- [x] Service Spec (11 examples)

#### 4.1.3 TTS 서비스
**파일:** `app/services/tts_service.rb`
- [x] TTS API 연동 클래스
- [x] 텍스트 → 오디오 변환 (5개 음성 지원)
- [x] 오디오 파일 반환 (Base64 디코딩)
- [x] Service Spec (11 examples)

**전체 테스트:** 33 examples, 0 failures

### 4.2 대화 API ✅ COMPLETED (phase-4.2)

#### 4.2.1 모델
**파일:** `app/models/conversation.rb`, `app/models/message.rb`
- [x] Conversation 모델 (user 연결, status 관리)
- [x] Message 모델 (role, content, audio_data)

#### 4.2.2 서비스
**파일:** `app/services/conversation_service.rb`
- [x] ConversationService (STT→LLM→TTS 파이프라인)
- [x] process_audio(): 오디오 입력 처리
- [x] process_text(): 텍스트 입력 처리

#### 4.2.3 API 엔드포인트
**파일:** `app/controllers/api/v1/conversations_controller.rb`
- [x] GET /api/v1/conversations (목록)
- [x] GET /api/v1/conversations/:id (상세)
- [x] POST /api/v1/conversations (생성)
- [x] GET /api/v1/conversations/:id/messages (메시지 목록)
- [x] POST /api/v1/conversations/:id/messages (텍스트 전송)
- [x] POST /api/v1/conversations/:id/audio (오디오 전송)

**테스트:** 165 examples, 0 failures (27개 추가)

### 4.3 Frontend AI 연동 ✅ COMPLETED

#### 4.3.1 대화 서비스
**파일:** `src/services/conversationService.ts`
- [x] 오디오 업로드 함수 (sendAudioMessage)
- [x] 응답 처리 (createSession, sendTextMessage)
- [x] 에러 핸들링 (ConversationError, error codes)
- [x] 테스트 작성 (conversationService.test.ts)

#### 4.3.2 대화 플로우 통합
**파일:** `src/pages/Conversation.tsx`
- [x] 녹음 → 전송 → 응답 → 재생 플로우 (playResponseAudio)
- [x] 로딩 상태 표시 (isProcessing, membershipChecking)
- [x] 에러 핸들링 UI (ErrorToast, initError)
- [x] 테스트 작성 (Conversation.test.tsx)

### 4.4 Streaming 응답 ✅ COMPLETED

#### 4.4.1 Backend Streaming
**파일:** `app/services/llm_service.rb`, `app/controllers/api/v1/conversations_controller.rb`
- [x] LlmService#chat_stream 메서드 추가 (OpenAI streaming API 사용)
- [x] POST /api/v1/conversations/:id/stream 엔드포인트 (SSE)
- [x] 실시간 청크 전송 + TTS 오디오 완료 시 전송

#### 4.4.2 Frontend Streaming
**파일:** `src/services/api.ts`, `src/pages/Conversation.tsx`
- [x] sendTextMessageStream 함수 (fetch + ReadableStream으로 SSE 처리)
- [x] StreamCallbacks 인터페이스 (onChunk, onComplete, onError)
- [x] 실시간 텍스트 표시 UI (타이핑 효과 + 커서 애니메이션)
- [x] 스트리밍 모드 토글 버튼 (헤더에 Stream 버튼)

---

## Phase 5: 프로덕션 레벨 멤버십 시스템 ✅ COMPLETED

### 5.1 유저/어드민 시스템 ✅
**파일:** `frontend/src/context/UserContext.tsx`, `frontend/src/pages/Home.tsx`
- [x] UserContext 생성 (현재 유저, 멤버십, 어드민 상태 관리)
- [x] 홈 화면을 유저/어드민 선택 화면으로 변경
- [x] 5명의 데모 유저 (김철수, 이영희, 박민수, 정수진, 최동훈)
- [x] 백엔드 시드 데이터 생성 (`db/seeds.rb`)

### 5.2 유저 대시보드 ✅
**파일:** `frontend/src/pages/Dashboard.tsx`
- [x] 멤버십 상태 카드 (타입, 만료일, 남은 일수)
- [x] 기능별 접근 카드 (학습, 대화, 분석)
- [x] 멤버십 없으면 기능 잠금 표시
- [x] 만료 임박 경고 (7일 이하)

### 5.3 결제 페이지 프로덕션 레벨 ✅
**파일:** `frontend/src/pages/Purchase.tsx`
- [x] 플랜 선택 (Basic ₩9,900/30일, Premium ₩19,900/60일)
- [x] 카드 정보 입력 (번호, 유효기간, CVC, 소유자명)
- [x] 카드번호 포매팅 (XXXX XXXX XXXX XXXX)
- [x] 입력 유효성 검사
- [x] 결제 처리 상태 (processing, success, error)
- [x] Mock PG 연동

### 5.4 어드민 멤버십 CRUD ✅
**파일:** `frontend/src/pages/Admin.tsx`, `backend/app/controllers/api/v1/admin/memberships_controller.rb`
- [x] 중복 방지 (활성 멤버십 보유 유저 필터링)
- [x] 클라이언트 + 서버 양쪽 중복 체크
- [x] 에러 메시지 표시
- [x] 로그아웃 버튼 추가

### 5.5 기능별 권한 체크 ✅
**파일:** `frontend/src/pages/Learning.tsx`, `frontend/src/pages/Analysis.tsx`, `frontend/src/pages/Conversation.tsx`
- [x] Learning 페이지 (학습 자료, 진행률)
- [x] Analysis 페이지 (레벨 분석 리포트)
- [x] Conversation 페이지에 UserContext 연동
- [x] hasFeature() 기반 접근 제어
- [x] 권한 없으면 대시보드로 리다이렉트

### 5.6 테스트 업데이트 ✅
- [x] Home.test.tsx 업데이트 (유저/어드민 선택 테스트)
- [x] Purchase.test.tsx 업데이트 (카드 입력 테스트)
- [x] Conversation.test.tsx 업데이트 (UserContext 연동)
- [x] App.test.tsx 업데이트

**전체 테스트:** Backend 171, Frontend 79 - 모두 통과

**추가 기능 (VAD + Streaming):** Phase 3.4, 4.4 구현 완료

---

## Phase 6: 마무리 및 배포

### 6.1 문서 정리
- [ ] README.md 최종 정리
- [ ] API 명세 완성 (`docs/api_specs/`)
- [ ] coding_agent_interaction_history.md 스크린샷 확인

### 6.2 테스트 최종 확인
- [x] Backend 전체 테스트 통과 (171 examples)
- [x] Frontend 전체 테스트 통과 (79 examples)
- [ ] CI/CD 파이프라인 확인

### 6.3 배포 준비
- [ ] GitHub repo 정리
- [ ] 시연 영상 촬영 (선택)

---

## 슬래시 커맨드 사용 가이드

| 시점 | 커맨드 | 용도 |
|------|--------|------|
| 기능 완료 후 | `/checkpoint "기능명"` | 테스트 실행 및 결과 확인 |
| 체크포인트 후 | `/log-interaction "기능명"` | docs에 상호작용 기록 |
| 기록 후 | `/commit` | 커밋 메시지 생성 (사용자 확인 후) |
| 에러 발생 시 | `/fix-error "에러명"` | 에러 해결 및 기록 |
| 테스트만 | `/test` | 전체 테스트 실행 |

---

## 환경 변수 (.env)

```bash
# Backend
GEMINI_API_KEY=your_key_here

# Frontend (Vite)
VITE_API_URL=http://localhost:3000/api/v1
```
