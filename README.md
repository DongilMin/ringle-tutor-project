# Ringle AI Tutor

LLM API를 통해 대화형으로 영어 학습을 도와주는 풀스택 앱입니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Ruby 3.3.6, Rails 8.1 API, SQLite |
| Frontend | React 19, TypeScript, Vite |
| Testing | RSpec (Backend), Vitest (Frontend) |
| AI | Gemini API (LLM), STT, TTS |
| 자동화 | Claude Code Hooks, husky, lint-staged |

## 프로젝트 구조

```
ringle-tutor/
├── backend/          # Rails API 서버
├── frontend/         # React 클라이언트
├── docs/             # AI 상호작용 기록, 에러 로그
├── .claude/          # Claude Code 설정
└── scripts/          # 자동화 스크립트
```

## 실행 방법

### 1. 환경 설정

```bash
# Ruby 3.3.6 설치 (rbenv)
rbenv install 3.3.6
rbenv global 3.3.6

# 환경 변수 설정
cp .env.example .env
# .env 파일에 API 키 입력
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

## 테스트 실행

```bash
# Backend (RSpec)
cd backend && bundle exec rspec

# Frontend (Vitest)
cd frontend && npm test

# 전체 테스트 (루트에서)
npm test
```

## API 키 설정

`.env` 파일에 다음 키들을 설정하세요:

```
GEMINI_API_KEY=your_gemini_api_key
```

## 주요 기능

### 멤버십 시스템
- 학습(Learning), 대화(Talk), 분석(Analysis) 기능 조합
- 만료일 기반 접근 제어
- Mock 결제 시스템

### AI 대화
- 음성 녹음 및 Waveform 시각화
- STT → LLM → TTS 파이프라인
- 실시간 스트리밍 응답

## 개발 규칙

자세한 개발 규칙은 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

- 코드 수정 후 자동 포매팅 (RuboCop, Prettier)
- 커밋 전 lint-staged 실행
- AI 상호작용은 `/log-interaction` 커맨드로 기록

## 문서

- [과제 요구사항](./requirements.md)
- [개발 로드맵](./todo.md)
- [AI 상호작용 기록](./docs/coding_agent_interaction_history.md)
- [에러 로그](./docs/error_log.md)

## 라이선스

Private - Ringle Tech Team 과제용
