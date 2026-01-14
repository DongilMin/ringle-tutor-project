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
- [ ] PaymentService 클래스 생성
- [ ] MockPG 호출 시뮬레이션
- [ ] `POST /api/v1/payments` 엔드포인트
- [ ] 결제 성공 시 멤버십 자동 생성
- [ ] Service Spec: `instance_double`로 PG Mocking
- [ ] `/checkpoint "결제 서비스"` 실행

---

## Phase 3: Frontend - UI & 오디오

### 3.1 기본 UI

#### 3.1.1 홈 화면
**예상 파일:** `src/pages/Home.tsx`, `src/components/MembershipCard.tsx`
- [ ] 홈 페이지 컴포넌트
- [ ] 멤버십 상태 카드 컴포넌트
- [ ] API 연동 (멤버십 조회)
- [ ] 컴포넌트 테스트
- [ ] `/checkpoint "홈 화면"` 실행

#### 3.1.2 멤버십 구매 화면
**예상 파일:** `src/pages/Purchase.tsx`, `src/components/PlanSelector.tsx`
- [ ] 구매 페이지 컴포넌트
- [ ] 요금제 선택 컴포넌트
- [ ] 결제 API 연동
- [ ] 컴포넌트 테스트
- [ ] `/checkpoint "구매 화면"` 실행

#### 3.1.3 대화 화면 레이아웃
**예상 파일:** `src/pages/Conversation.tsx`, `src/components/ChatBubble.tsx`
- [ ] 대화 페이지 컴포넌트
- [ ] 채팅 버블 컴포넌트
- [ ] 레이아웃 스타일링
- [ ] `/checkpoint "대화 화면"` 실행

### 3.2 오디오 기능 (Web Audio API)

#### 3.2.1 마이크 권한 훅
**예상 파일:** `src/hooks/useAudioPermission.ts`
- [ ] `navigator.mediaDevices.getUserMedia` 권한 요청
- [ ] 권한 상태 관리 (granted, denied, prompt)
- [ ] 에러 핸들링
- [ ] 훅 테스트 (Mock 처리)
- [ ] `/checkpoint "마이크 권한 훅"` 실행

#### 3.2.2 녹음 기능 훅
**예상 파일:** `src/hooks/useAudioRecorder.ts`
- [ ] MediaRecorder API 사용
- [ ] 녹음 시작/중지/일시정지
- [ ] Blob 데이터 생성
- [ ] 훅 테스트
- [ ] `/checkpoint "녹음 기능 훅"` 실행

#### 3.2.3 Waveform 시각화 컴포넌트
**예상 파일:** `src/components/Waveform.tsx`
- [ ] AudioContext + AnalyserNode 설정
- [ ] Canvas 렌더링
- [ ] `getByteTimeDomainData()` 사용
- [ ] 실시간 애니메이션
- [ ] 컴포넌트 테스트
- [ ] `/checkpoint "Waveform 컴포넌트"` 실행

### 3.3 상태 관리
**예상 파일:** `src/context/ConversationContext.tsx`
- [ ] 대화 상태 Context 생성
- [ ] 메시지 히스토리 관리
- [ ] 녹음 상태 관리
- [ ] `/checkpoint "상태 관리"` 실행

---

## Phase 4: AI 통합

### 4.1 Backend AI 서비스

#### 4.1.1 STT 서비스
**예상 파일:** `app/services/stt_service.rb`
- [ ] STT API 연동 클래스
- [ ] 오디오 파일 → 텍스트 변환
- [ ] 에러 핸들링
- [ ] Service Spec
- [ ] `/checkpoint "STT 서비스"` 실행

#### 4.1.2 LLM 서비스 (Gemini)
**예상 파일:** `app/services/llm_service.rb`
- [ ] Gemini API 연동 클래스
- [ ] 프롬프트 템플릿 관리
- [ ] 대화 컨텍스트 관리
- [ ] 스트리밍 응답 처리
- [ ] Service Spec
- [ ] `/checkpoint "LLM 서비스"` 실행

#### 4.1.3 TTS 서비스
**예상 파일:** `app/services/tts_service.rb`
- [ ] TTS API 연동 클래스
- [ ] 텍스트 → 오디오 변환
- [ ] 오디오 파일 반환
- [ ] Service Spec
- [ ] `/checkpoint "TTS 서비스"` 실행

### 4.2 대화 API
**예상 파일:** `app/controllers/api/v1/conversations_controller.rb`

#### 4.2.1 대화 엔드포인트
- [ ] `POST /api/v1/conversations` 엔드포인트
- [ ] 오디오 업로드 처리
- [ ] STT → LLM → TTS 파이프라인
- [ ] 응답 스트리밍
- [ ] Request Spec
- [ ] `/checkpoint "대화 API"` 실행

### 4.3 Frontend AI 연동

#### 4.3.1 대화 서비스
**예상 파일:** `src/services/conversationService.ts`
- [ ] 오디오 업로드 함수
- [ ] 스트리밍 응답 처리
- [ ] 에러 핸들링
- [ ] `/checkpoint "대화 서비스"` 실행

#### 4.3.2 대화 플로우 통합
- [ ] 녹음 → 전송 → 응답 → 재생 플로우
- [ ] 로딩 상태 표시
- [ ] 에러 핸들링 UI
- [ ] E2E 테스트
- [ ] `/checkpoint "대화 플로우"` 실행

---

## Phase 5: 마무리 및 배포

### 5.1 문서 정리
- [ ] README.md 최종 정리
- [ ] API 명세 완성 (`docs/api_specs/`)
- [ ] coding_agent_interaction_history.md 스크린샷 확인

### 5.2 테스트 최종 확인
- [ ] Backend 전체 테스트 통과
- [ ] Frontend 전체 테스트 통과
- [ ] CI/CD 파이프라인 확인

### 5.3 배포 준비
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
