# Ringle AI Tutor

LLM API를 통해 대화형으로 영어 학습을 도와주는 풀스택 앱입니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Ruby 3.3.6, Rails 8.1 API, SQLite |
| Frontend | React 19, TypeScript, Vite |
| Testing | RSpec (Backend), Vitest (Frontend) |
| AI | OpenAI GPT-4o-mini (LLM), OpenAI Whisper (STT), OpenAI TTS |
| 자동화 | Claude Code Hooks, husky, lint-staged |

## 설계 및 기술 스택 선정 배경

### Backend: Ruby on Rails 8.1

- **선정 이유**: 과제 요구사항에서 Rails 사용이 명시됨
- **Rails 8 선택 이유**:
  - 최신 Rails의 API 모드는 프론트엔드와 분리된 JSON API 서버에 최적화
  - Active Record의 강력한 ORM으로 복잡한 멤버십/결제 관계 쉽게 모델링
  - 풍부한 테스트 도구(RSpec, FactoryBot)로 TDD 용이
- **SQLite 선택 이유**:
  - 개발/데모 환경에서 별도 DB 서버 없이 즉시 실행 가능
  - 프로덕션에서는 PostgreSQL로 쉽게 전환 가능

### Frontend: React 19 + TypeScript + Vite

- **선정 이유**: 과제 요구사항에서 React + TypeScript 사용이 명시됨
- **React 19 선택 이유**:
  - 최신 React의 개선된 성능 및 Suspense 지원
  - Context API로 간단한 상태 관리 구현
- **Vite 선택 이유**:
  - 빠른 개발 서버 시작 및 HMR(Hot Module Replacement)
  - TypeScript 네이티브 지원
- **TypeScript 선택 이유**:
  - 타입 안전성으로 런타임 에러 사전 방지
  - API 응답 타입 정의로 Frontend-Backend 계약 명확화

### AI 서비스 통합

- **OpenAI GPT-4o-mini (LLM)**: 빠른 응답 속도와 자연스러운 영어 대화 및 교정
- **OpenAI Whisper (STT)**: 높은 정확도의 음성 인식, 다국어 지원
- **OpenAI TTS**: 자연스러운 음성 합성, 다양한 음성 선택 가능 (alloy, echo, nova 등)
- **분리된 서비스 구조**: 각 AI 서비스를 별도 클래스로 캡슐화하여 교체 용이
- **SSE Streaming**: LLM 응답 실시간 스트리밍으로 체감 지연 시간 최소화

### 아키텍처 결정

```
[Frontend]                    [Backend]                    [OpenAI API]
    │                            │                              │
    │  REST API / SSE           │                              │
    ├──────────────────────────►│                              │
    │                            │  STT (Whisper)               │
    │                            ├─────────────────────────────►│
    │                            │  LLM (GPT-4o-mini)           │
    │                            ├─────────────────────────────►│
    │                            │  TTS (tts-1)                 │
    │                            ├─────────────────────────────►│
    │◄───────────────────────────┤                              │
```

- **서비스 계층 분리**: Controller → Service → External API
- **Concern 패턴**: 인증, 멤버십 체크, Rate Limiting 등 횡단 관심사 분리
- **의존성 주입**: 테스트 시 Mock 객체 쉽게 주입 가능

## 프로젝트 구조

```
ringle-tutor/
├── backend/                    # Rails API 서버
│   ├── app/
│   │   ├── controllers/        # API 엔드포인트
│   │   ├── models/             # Active Record 모델
│   │   ├── services/           # 비즈니스 로직 (AI 서비스 포함)
│   │   └── concerns/           # 공통 모듈 (Rate Limiting 등)
│   └── spec/                   # RSpec 테스트
├── frontend/                   # React 클라이언트
│   ├── src/
│   │   ├── pages/              # 페이지 컴포넌트
│   │   ├── components/         # UI 컴포넌트
│   │   ├── hooks/              # 커스텀 훅 (오디오 등)
│   │   ├── context/            # React Context
│   │   └── services/           # API 클라이언트
│   └── src/__tests__/          # Vitest 테스트
├── docs/                       # 문서
│   ├── coding_agent_interaction_history.md
│   ├── screenshots/            # AI 툴 사용 스크린샷
│   └── ...
└── .claude/                    # Claude Code 설정
```

## 실행 방법

### 1. 환경 설정

```bash
# Ruby 3.3.6 설치 (rbenv)
rbenv install 3.3.6
rbenv global 3.3.6

# Node.js 설치 (v18 이상 권장)
# nvm 사용 시: nvm install 18 && nvm use 18

# 환경 변수 설정
cp .env.example .env
# .env 파일에 API 키 입력 (아래 섹션 참조)
```

### 2. Backend 실행

```bash
cd backend
bundle install
rails db:create db:migrate db:seed
rails server -p 3000
```

### 3. Frontend 실행

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

## API 키 설정

`.env` 파일에 다음 키를 설정하세요:

```bash
# OpenAI API - LLM, STT, TTS 모두 OpenAI 사용
OPENAI_API_KEY=your_openai_api_key
```

**API 키 발급 방법:**
- OpenAI API: [OpenAI Platform](https://platform.openai.com/api-keys)

> **Note**: 모든 AI 서비스(LLM, STT, TTS)가 OpenAI API를 사용하므로 하나의 API 키만 필요합니다.

## 테스트 실행 및 검증 방법

### 테스트 실행

```bash
# Backend (RSpec) - 221개 테스트
cd backend && bundle exec rspec

# Frontend Unit (Vitest) - 118개 테스트
cd frontend && npm test

# Frontend E2E (Playwright) - 13개 테스트 x 3 브라우저
cd frontend && npm run test:e2e

# 전체 테스트 (루트에서)
npm test
```

### 테스트 피라미드

| 계층 | 프레임워크 | 테스트 수 | 설명 |
|------|-----------|----------|------|
| Unit | Vitest | 118 | 컴포넌트, 훅, 서비스 |
| Integration | RSpec | 221 | API, 모델, 서비스 |
| E2E | Playwright | 13 x 3 | 사용자 플로우 (Chrome, Firefox, Safari) |

### 테스트 커버리지 항목

**Backend 테스트:**
- 모델 테스트: 멤버십 만료 경계값, Payment 상태 전환
- Request 테스트: API 엔드포인트, 인증/권한, 에러 핸들링
- 서비스 테스트: PaymentService, ConversationService, AI 서비스 (Mock)
- Rate Limiter 테스트: 분당/시간당/일일 제한, 최소 간격

**Frontend 테스트:**
- 컴포넌트 테스트: ChatBubble, MembershipCard, Waveform, ErrorToast
- 훅 테스트: useAudioRecorder, useAudioPermission
- 페이지 테스트: Home, Conversation, Purchase
- Context 테스트: ConversationContext
- 서비스 테스트: conversationService

### 수동 검증 체크리스트

1. **멤버십 기능**
   - [ ] 홈에서 멤버십 상태 확인
   - [ ] 멤버십 구매 플로우
   - [ ] Admin 페이지에서 멤버십 부여/취소

2. **AI 대화 기능**
   - [ ] 대화 시작 시 AI 인사말 표시
   - [ ] 음성 녹음 및 Waveform 표시
   - [ ] STT → LLM → TTS 파이프라인 동작
   - [ ] AI 음성 응답 재생

3. **오남용 방지**
   - [ ] 빠른 연속 요청 시 Rate Limit 에러
   - [ ] 에러 메시지에 대기 시간 표시

## 주요 기능

### 멤버십 시스템
- 3가지 멤버십 타입: Basic (학습), Premium (학습+대화+분석), Enterprise
- 만료일 기반 접근 제어 (경계값 테스트 완료)
- Mock PG 결제 시스템
- Admin 페이지: 멤버십 부여/취소 관리

### AI 대화
- 음성 녹음 및 Waveform 시각화
- STT → LLM → TTS 파이프라인
- 실시간 스트리밍 응답 (SSE)
- AI 응답 재생 버튼

### 오남용 방지 (Rate Limiting)
- 오디오 요청: 10회/분, 60회/시간, 200회/일
- 텍스트 요청: 20회/분, 120회/시간, 500회/일
- 최소 요청 간격: 오디오 2초, 텍스트 1초
- Rate Limit 헤더로 남은 요청 수 확인 가능

### 네트워크 에러 처리
- Exponential Backoff 재시도 (최대 3회)
- ErrorToast로 사용자 친화적 에러 표시
- 재시도 버튼 제공

## 개발 규칙

자세한 개발 규칙은 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

- 코드 수정 후 자동 포매팅 (RuboCop, Prettier)
- 커밋 전 lint-staged 실행
- AI 상호작용은 `/log-interaction` 커맨드로 기록

## 문서

- [과제 요구사항](./docs/requirements.md)
- [개발 로드맵](./todo.md)
- [AI 상호작용 기록](./docs/coding_agent_interaction_history.md)
- [에러 로그](./docs/error_log.md)
- [DB 스키마](./docs/db_schema.md)
- [설계 가정](./docs/assumptions.md)

## 라이선스

Private - Ringle Tech Team 과제용
