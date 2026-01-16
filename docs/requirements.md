# [Ringle] AI 튜터 풀스택 구현 프로젝트 - 요구사항 체크리스트

## 1. 프로젝트 개요
- **목표:** 영어 학습용 AI 튜터 앱 개발 (멤버십 구매 → 음성 대화)
- **핵심 기술:** Backend(Rails API), Frontend(React + TypeScript), AI(STT/LLM/TTS)
- **평가 기준:** AI 도구 활용 능력, 코드 퀄리티(테스트 코드 필수), 오디오 UX 완성도

---

## 2. 필수 구현 사항 체크리스트

### A. Backend - 멤버십 관리 (생성, 삭제)

| 요구사항 | 상태 | 구현 위치 |
|----------|------|-----------|
| 멤버십 이용 기한 존재 | ✅ | `Membership#start_date`, `end_date` |
| 기한 만료 시 사용 불가 | ✅ | `Membership#active?` 경계값 테스트 |
| 다양한 멤버십 종류 (학습, 대화, 분석) | ✅ | `MEMBERSHIP_FEATURES` 상수 |
| 시드 데이터로 멤버십 생성 | ✅ | `db/seeds.rb` |
| 멤버십 생성 API | ✅ | `POST /api/v1/admin/memberships` |
| 어드민 UI | ✅ | `/admin` 페이지 |

### B. Backend - 멤버십 할당 (Optional → 구현 완료)

| 요구사항 | 상태 | 구현 위치 |
|----------|------|-----------|
| 어드민 멤버십 부여 API | ✅ | `POST /api/v1/admin/memberships` |
| 어드민 멤버십 삭제 API | ✅ | `DELETE /api/v1/admin/memberships/:id` |
| 유저 결제 API (Mock PG) | ✅ | `POST /api/v1/payments`, `PaymentService` |

### C. Frontend - AI와 대화 진행

| 요구사항 | 상태 | 구현 위치 |
|----------|------|-----------|
| 홈 화면에서 멤버십 확인 | ✅ | `Home.tsx` |
| 멤버십 구매 가능 | ✅ | `Purchase.tsx` |
| 멤버십 존재 여부 판단 | ✅ | `MembershipChecker` concern |
| AI가 먼저 대화 시작 | ✅ | `ConversationService#create_initial_greeting` |
| 마이크 버튼으로 오디오 인식 | ✅ | `useAudioRecorder` hook |
| Waveform 시각화 | ✅ | `Waveform.tsx` |
| 답변완료 → 텍스트 생성 → AI 답변 | ✅ | `Conversation.tsx` |
| LLM/STT/TTS 실제 연동 | ✅ | OpenAI API (GPT-4o-mini, Whisper, TTS) |

### D. Optional 구현 사항 (모두 구현 완료)

| 요구사항 | 상태 | 구현 위치 |
|----------|------|-----------|
| 네트워크 오류 대비 | ✅ | Exponential Backoff, `ErrorToast` |
| 재생 버튼 (다시 듣기) | ✅ | `ChatBubble` 재생 버튼 |
| VAD 활용 공백 제거 | ✅ | `useAudioRecorder` VAD 옵션 |
| Prompt로 일관된 주제 대화 | ✅ | `LlmService::SYSTEM_PROMPT` |
| 응답 지연 시간 단축 (Streaming) | ✅ | SSE `/conversations/:id/stream` |
| 오남용 방지 | ✅ | `RateLimiter` concern |

---

## 3. 기술 스택 요구사항

| 요구사항 | 상태 | 구현 |
|----------|------|------|
| Backend: Ruby on Rails | ✅ | Rails 8.1 API mode |
| Frontend: React + TypeScript | ✅ | React 19 + TypeScript + Vite |
| AI 도구 사용 필수 | ✅ | Claude Code (Anthropic) |
| Persistent Storage | ✅ | SQLite (PostgreSQL 전환 가능) |
| 테스트 코드 필수 | ✅ | RSpec 221개, Vitest 118개, Playwright 13개 |

---

## 4. 제출물 체크리스트

| 항목 | 상태 | 파일 |
|------|------|------|
| GitHub Private Repository | ✅ | `ringle-tutor-project` |
| README.md (실행 방법) | ✅ | `README.md` |
| README.md (설계 배경) | ✅ | `README.md` |
| README.md (테스트 방법) | ✅ | `README.md` |
| AI 상호작용 기록 | ✅ | `docs/coding_agent_interaction_history.md` |
| 스크린샷 포함 | ⏳ | `docs/screenshots/` |
| 시연 영상 | ⏳ | 별도 첨부 필요 |

---

## 5. 테스트 커버리지

### Backend (RSpec) - 221개
- Model Spec: 멤버십 만료 경계값, Payment 상태 전환
- Request Spec: 전체 API 엔드포인트
- Service Spec: PaymentService, ConversationService, AI 서비스
- Concern Spec: RateLimiter

### Frontend (Vitest) - 118개
- Component: ChatBubble, MembershipCard, Waveform, ErrorToast
- Hooks: useAudioRecorder, useAudioPermission
- Pages: Home, Conversation, Purchase, Admin
- Context: ConversationContext

### E2E (Playwright) - 13개 x 3 브라우저
- 홈페이지 렌더링
- 멤버십 구매 플로우
- AI 대화 플로우

---

## 6. API 엔드포인트 요약

### 멤버십
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/memberships/current` | 현재 활성 멤버십 |
| GET | `/api/v1/membership_plans` | 플랜 목록 (가격, 기능) |

### 결제
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/payments` | 결제 및 멤버십 생성 |

### 대화
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/conversations` | 새 대화 생성 |
| POST | `/api/v1/conversations/:id/audio` | 음성 메시지 전송 |
| POST | `/api/v1/conversations/:id/messages` | 텍스트 메시지 전송 |
| POST | `/api/v1/conversations/:id/stream` | SSE 스트리밍 응답 |

### 어드민
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/admin/memberships` | 전체 멤버십 목록 |
| POST | `/api/v1/admin/memberships` | 멤버십 수동 부여 |
| DELETE | `/api/v1/admin/memberships/:id` | 멤버십 취소 |

---

## 7. 제외된 요구사항 (과제 명시)

- ❌ 실제 PG사 결제 API 연동
- ❌ 인증 로직 (JWT 등)
- ❌ 디자인 완성도
- ❌ 대화 기록 관리 (서버 저장은 구현됨, 필수 아님)
