# Phase 4.1 - Backend AI Services 구현 리포트

## 개요
- **날짜:** 2026-01-15
- **브랜치:** phase-4.1
- **상태:** 완료

---

## 구현 내용

### 1. STT 서비스 (`app/services/stt_service.rb`)
**기능:** 음성 → 텍스트 변환

**주요 특징:**
- 지원 포맷: `audio/webm`, `audio/wav`, `audio/mp3`, `audio/ogg`
- 최대 파일 크기: 10MB
- 다국어 지원 (기본: 영어)
- Mock/실제 API 전환 가능

**API 메서드:**
```ruby
stt = SttService.new(api_key: "key")
result = stt.transcribe(audio_data, content_type: "audio/webm", language: "en")
# => { text: "...", confidence: 0.95, language: "en", duration: 2.5 }
```

**에러 처리:**
- `SttService::InvalidAudioError` - 잘못된 오디오 데이터
- `SttService::TimeoutError` - API 타임아웃
- `SttService::ApiError` - API 호출 실패

---

### 2. LLM 서비스 (`app/services/llm_service.rb`)
**기능:** AI 대화 생성 (Gemini API)

**주요 특징:**
- 기본 모델: `gemini-1.5-flash`
- 대화 히스토리 관리
- 영어 튜터 시스템 프롬프트 내장
- Max tokens: 2048

**API 메서드:**
```ruby
llm = LlmService.new(api_key: "key", model: "gemini-1.5-flash")
result = llm.chat("Hello, I want to practice English")
# => { message: "...", conversation_history: [...] }

llm.clear_history  # 대화 히스토리 초기화
```

**시스템 프롬프트:**
- 자연스러운 대화 참여
- 문법/발음 교정
- 더 나은 표현 제안
- 간결한 응답 (2-3문장)
- 격려적 태도

**에러 처리:**
- `LlmService::InvalidPromptError` - 잘못된 메시지
- `LlmService::RateLimitError` - API 요청 제한
- `LlmService::ApiError` - API 호출 실패

---

### 3. TTS 서비스 (`app/services/tts_service.rb`)
**기능:** 텍스트 → 음성 변환

**주요 특징:**
- 지원 음성: 5개 (미국/영국 영어)
  - `en-US-Standard-A`, `en-US-Standard-B`, `en-US-Standard-C`
  - `en-GB-Standard-A`, `en-GB-Standard-B`
- 기본 포맷: `audio/mp3`
- 최대 텍스트 길이: 5000자

**API 메서드:**
```ruby
tts = TtsService.new(api_key: "key")
result = tts.synthesize("Hello, how are you?", voice: "en-US-Standard-A")
# => { audio_data: "...", format: "audio/mp3", duration: 1.5 }
```

**에러 처리:**
- `TtsService::InvalidTextError` - 잘못된 텍스트/음성
- `TtsService::TimeoutError` - API 타임아웃
- `TtsService::ApiError` - API 호출 실패

---

## 테스트 결과

```
SttService
  #transcribe
    with valid audio data
      ✓ returns transcription result
      ✓ accepts different languages
    with invalid audio data
      ✓ raises error when audio data is blank
      ✓ raises error when audio data is empty
      ✓ raises error when audio is too large
      ✓ raises error for unsupported audio format
    with supported audio formats
      ✓ accepts audio/webm format
      ✓ accepts audio/wav format
      ✓ accepts audio/mp3 format
      ✓ accepts audio/ogg format
  error handling
    ✓ wraps timeout errors

LlmService
  #chat
    with valid message
      ✓ returns response with message
      ✓ maintains conversation history
      ✓ responds appropriately to greetings
      ✓ responds appropriately to thanks
    with context
      ✓ uses provided context
    with invalid message
      ✓ raises error when message is blank
      ✓ raises error when message is empty
      ✓ raises error when message is too long
  #clear_history
    ✓ clears conversation history
  configuration
    ✓ uses default model
    ✓ allows custom model

TtsService
  #synthesize
    with valid text
      ✓ returns audio data
      ✓ accepts custom voice
      ✓ accepts custom format
    with invalid text
      ✓ raises error when text is blank
      ✓ raises error when text is empty
      ✓ raises error when text is too long
    with invalid voice
      ✓ raises error for unsupported voice
    with supported voices
      ✓ accepts en-US-Standard-A
      ✓ accepts en-US-Standard-B
      ✓ accepts en-GB-Standard-A
  error handling
    ✓ wraps timeout errors

33 examples, 0 failures
```

---

## 환경 변수 설정

```bash
# Backend (.env)
GEMINI_API_KEY=your_gemini_api_key
STT_API_KEY=your_stt_api_key
STT_API_ENDPOINT=https://api.stt-provider.com/v1/transcribe
TTS_API_KEY=your_tts_api_key
TTS_API_ENDPOINT=https://api.tts-provider.com/v1/synthesize

# Mock 모드 (테스트용)
STT_MOCK_ENABLED=true
LLM_MOCK_ENABLED=true
TTS_MOCK_ENABLED=true
```

---

## 파일 구조

```
backend/
├── app/
│   └── services/
│       ├── stt_service.rb      # 음성 → 텍스트
│       ├── llm_service.rb      # AI 대화 생성
│       └── tts_service.rb      # 텍스트 → 음성
└── spec/
    └── services/
        ├── stt_service_spec.rb
        ├── llm_service_spec.rb
        └── tts_service_spec.rb
```

---

## 다음 단계
- **Phase 4.2:** 대화 API 엔드포인트 (`POST /api/v1/conversations`)
- **Phase 4.3:** Frontend AI 연동
