# Phase 4.2 - Conversation API 코드 리뷰

## 리뷰 정보
| 항목 | 내용 |
|------|------|
| 브랜치 | `phase-4.2` |
| 커밋 | 227b318 |
| 리뷰 일시 | 2026-01-15 |
| 리뷰어 | Claude Sonnet (Code Review Agent) |

## 리뷰 대상 파일
- `backend/app/models/conversation.rb` (35 lines)
- `backend/app/models/message.rb` (27 lines)
- `backend/app/controllers/api/v1/conversations_controller.rb` (87 lines)
- `backend/app/services/conversation_service.rb` (128 lines)
- `backend/app/serializers/conversation_serializer.rb` (22 lines)
- `backend/app/serializers/message_serializer.rb` (26 lines)
- `backend/db/migrate/20260115103944_create_conversations.rb`
- `backend/db/migrate/20260115103950_create_messages.rb`
- `backend/spec/requests/api/v1/conversations_spec.rb` (207 lines)

---

## 발견된 이슈

### 🔴 Critical (즉시 수정 필요)

#### 1. Binary 컬럼에 오디오 데이터 직접 저장

**파일:** `backend/db/migrate/20260115103950_create_messages.rb:8`

**이슈:** `audio_data`를 DB의 binary 컬럼에 직접 저장

**문제:**
```ruby
create_table :messages do |t|
  # ...
  t.binary :audio_data  # ← DB에 직접 저장
  t.string :audio_content_type
  t.float :audio_duration
end
```

**문제점:**
- DB 크기 폭발: 10초 오디오 ≈ 100KB, 1000개 메시지 = 100MB
- 메모리 문제: Active Record가 모든 메시지 로드 시 오디오도 함께 로드
- 백업 시간 증가
- 복제 성능 저하
- PostgreSQL TOAST 오버헤드

**실제 시나리오:**
```ruby
# 100개 메시지 조회 → 10MB 메모리 사용
messages = conversation.messages.limit(100)
# audio_data가 자동으로 모두 로드됨!
```

**해결책:**
```ruby
# 1. S3/클라우드 스토리지 사용
class Message < ApplicationRecord
  has_one_attached :audio  # Active Storage 사용

  def audio_url
    audio.url(expires_in: 1.hour)
  end
end

# 2. Migration 수정
class CreateMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :messages do |t|
      # binary 제거
      t.string :audio_storage_key  # S3 key 또는 파일 경로
      t.string :audio_content_type
      t.float :audio_duration
    end
  end
end

# 3. ConversationService 수정
def save_assistant_message(conversation, text, audio_data, content_type, duration)
  message = conversation.messages.create!(
    role: Message::ROLES[:assistant],
    content: text,
    audio_content_type: content_type,
    audio_duration: duration
  )

  # S3에 업로드
  storage_key = "audio/#{conversation.id}/#{message.id}.mp3"
  upload_to_s3(storage_key, audio_data, content_type)
  message.update!(audio_storage_key: storage_key)

  message
end
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 2. 동기 처리로 인한 누적 지연시간

**파일:** `backend/app/services/conversation_service.rb:13-42`

**이슈:** STT → LLM → TTS를 순차적으로 동기 호출

**문제:**
```ruby
def process_audio(conversation, audio_data, content_type: "audio/webm")
  # Step 1: STT (3-5초)
  stt_result = transcribe_audio(audio_data, content_type)

  # Step 2: DB 저장 (0.01초)
  user_message = save_user_message(conversation, user_text)

  # Step 3: LLM (2-4초)
  llm_result = generate_response(conversation)

  # Step 4: TTS (2-3초)
  tts_result = synthesize_speech(assistant_text)

  # Step 5: DB 저장 (0.01초)
  assistant_message = save_assistant_message(...)

  # 총 지연시간: 7-12초
end
```

**사용자 경험:**
- 음성 입력 후 7-12초 대기 → 매우 느림
- 사용자는 3초 이상 대기 시 불안감 증가

**해결책 (단계별 응답):**
```ruby
# 1. 즉시 STT 결과 반환
def process_audio_async(conversation, audio_data, content_type)
  # Step 1: STT만 먼저 처리 (3-5초)
  stt_result = transcribe_audio(audio_data, content_type)
  user_message = save_user_message(conversation, stt_result[:text])

  # Step 2: 즉시 STT 결과 반환
  ActionCable.server.broadcast(
    "conversation_#{conversation.id}",
    type: 'user_message',
    message: MessageSerializer.new(user_message).as_json
  )

  # Step 3: Background Job으로 LLM + TTS 처리
  ProcessAiResponseJob.perform_later(conversation.id, user_message.id)

  { user_message: user_message }
end

# app/jobs/process_ai_response_job.rb
class ProcessAiResponseJob < ApplicationJob
  def perform(conversation_id, user_message_id)
    conversation = Conversation.find(conversation_id)
    llm_result = llm_service.chat(...)
    tts_result = tts_service.synthesize(llm_result[:message])

    assistant_message = save_assistant_message(...)

    # WebSocket으로 실시간 전송
    ActionCable.server.broadcast(
      "conversation_#{conversation_id}",
      type: 'assistant_message',
      message: MessageSerializer.new(assistant_message).as_json_with_audio
    )
  end
end
```

**대안 (스트리밍):**
```ruby
# LLM 토큰 스트리밍 + 실시간 TTS
def process_audio_streaming(conversation, audio_data)
  stt_result = transcribe_audio(audio_data)

  llm_service.chat_stream(stt_result[:text]) do |token|
    # 토큰 단위로 실시간 전송
    ActionCable.server.broadcast(
      "conversation_#{conversation.id}",
      type: 'token',
      token: token
    )
  end
end
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 3. N+1 쿼리 - message_history

**파일:** `backend/app/models/conversation.rb:30-33`

**이슈:** `message_history`에서 메시지마다 개별 쿼리 발생하지 않지만, 오디오 데이터까지 로드

**문제:**
```ruby
def message_history
  messages.order(:created_at).map do |msg|
    { role: msg.role, content: msg.content }
  end
end
```

- `messages` 호출 시 모든 컬럼 SELECT (audio_data 포함)
- 100개 메시지 × 100KB = 10MB 메모리 사용

**해결책:**
```ruby
def message_history
  messages
    .order(:created_at)
    .select(:id, :role, :content, :created_at)  # audio_data 제외
    .map { |msg| { role: msg.role, content: msg.content } }
end
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 4. LLM Context 크기 제한 없음

**파일:** `backend/app/services/conversation_service.rb:83-87`

**이슈:** 전체 메시지 히스토리를 LLM에 전달

**문제:**
```ruby
def generate_response(conversation)
  context = conversation.message_history  # ← 전체 히스토리
  last_user_message = context.last[:content]
  @llm_service.chat(last_user_message, context: context[0..-2])
end
```

**시나리오:**
- 100개 메시지 × 50 토큰 = 5000 토큰
- Gemini 1.5 Flash: 1M 토큰 제한이지만 비용 증가
- 긴 대화일수록 응답 시간 증가

**해결책:**
```ruby
MAX_CONTEXT_MESSAGES = 20  # 최근 20개만

def generate_response(conversation)
  all_messages = conversation.message_history
  last_user_message = all_messages.last[:content]

  # 최근 N개 메시지만 컨텍스트로 사용
  context = all_messages[-MAX_CONTEXT_MESSAGES..-2] || []

  @llm_service.chat(last_user_message, context: context)
end
```

**더 나은 방법 (슬라이딩 윈도우):**
```ruby
def generate_response(conversation)
  all_messages = conversation.message_history
  last_user_message = all_messages.last[:content]

  # 토큰 수 기반 제한
  context = []
  total_tokens = 0
  MAX_CONTEXT_TOKENS = 4000

  all_messages[-2..0].reverse_each do |msg|
    estimated_tokens = msg[:content].length / 4  # 대략 계산
    break if total_tokens + estimated_tokens > MAX_CONTEXT_TOKENS

    context.unshift(msg)
    total_tokens += estimated_tokens
  end

  @llm_service.chat(last_user_message, context: context)
end
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 5. Base64 인코딩 예외 처리 누락

**파일:** `backend/app/serializers/message_serializer.rb:17`

**이슈:** `Base64.strict_encode64`가 실패할 수 있음

**문제:**
```ruby
def as_json_with_audio
  return as_json unless object.has_audio?

  as_json.merge(
    audio: {
      data: Base64.strict_encode64(object.audio_data),  # ← 예외 가능
      content_type: object.audio_content_type,
      duration: object.audio_duration
    }
  )
end
```

- `audio_data`가 nil이거나 손상된 경우 에러
- 클라이언트에 500 에러 반환

**해결책:**
```ruby
def as_json_with_audio
  return as_json unless object.has_audio?

  begin
    audio_base64 = Base64.strict_encode64(object.audio_data)
  rescue ArgumentError, TypeError => e
    Rails.logger.error("Audio encoding failed: #{e.message}")
    return as_json.merge(audio_error: "Audio data corrupted")
  end

  as_json.merge(
    audio: {
      data: audio_base64,
      content_type: object.audio_content_type,
      duration: object.audio_duration
    }
  )
end
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

### 🟡 Warning (개선 권장)

#### 6. ConversationSerializer N+1 가능성

**파일:** `backend/app/serializers/conversation_serializer.rb:15-19`

**이슈:** `as_json_with_messages`에서 메시지 개별 직렬화

**문제:**
```ruby
def as_json_with_messages
  as_json.merge(
    messages: object.messages.chronological.map do |message|
      MessageSerializer.new(message).as_json  # ← 각 메시지마다 serializer 생성
    end
  )
end
```

- 메시지마다 `has_audio?` 호출 → audio_data 컬럼 접근
- 100개 메시지 = 100번 serializer 초기화

**해결책:**
```ruby
def as_json_with_messages
  # Eager load로 최적화
  messages_data = object.messages
    .chronological
    .select(:id, :role, :content, :audio_content_type, :audio_duration, :created_at)
    .map { |msg| MessageSerializer.new(msg).as_json }

  as_json.merge(messages: messages_data)
end
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

#### 7. 트랜잭션 부재

**파일:** `backend/app/services/conversation_service.rb:13-42`

**이슈:** 여러 DB 작업이 트랜잭션 없이 실행

**문제:**
```ruby
def process_audio(conversation, audio_data, content_type)
  # Step 1: user_message 저장
  user_message = save_user_message(conversation, user_text)

  # Step 2: LLM 호출 (실패 가능)
  llm_result = generate_response(conversation)  # ← 여기서 실패하면?

  # Step 3: assistant_message 저장 (실행 안됨)
  assistant_message = save_assistant_message(...)
end
```

**시나리오:**
- user_message 저장 성공
- LLM 호출 실패 (타임아웃, API 에러)
- assistant_message 생성 안됨
- DB에 사용자 메시지만 남고 AI 응답 없음 → 불완전한 대화

**해결책:**
```ruby
def process_audio(conversation, audio_data, content_type)
  stt_result = transcribe_audio(audio_data, content_type)
  user_text = stt_result[:text]

  # 트랜잭션으로 묶기
  result = nil
  ActiveRecord::Base.transaction do
    user_message = save_user_message(conversation, user_text)

    llm_result = generate_response(conversation)
    assistant_text = llm_result[:message]

    tts_result = synthesize_speech(assistant_text)

    assistant_message = save_assistant_message(
      conversation,
      assistant_text,
      tts_result[:audio_data],
      tts_result[:content_type],
      tts_result[:duration]
    )

    result = build_response(user_message, assistant_message, tts_result)
  end

  result
rescue LlmService::LlmError, TtsService::TtsError => e
  # 트랜잭션 롤백됨 → user_message도 저장 안됨
  raise ProcessingError, e.message
end
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

#### 8. 오디오 데이터 중복 인코딩

**파일:** `backend/app/services/conversation_service.rb:118`, `backend/app/serializers/message_serializer.rb:17`

**이슈:** Base64 인코딩이 두 곳에서 발생

**문제:**
```ruby
# ConversationService.rb:118
def build_response(user_message, assistant_message, tts_result)
  {
    audio: {
      data: Base64.strict_encode64(tts_result[:audio_data]),  # ← 1번째 인코딩
      # ...
    }
  }
end

# MessageSerializer.rb:17
def as_json_with_audio
  as_json.merge(
    audio: {
      data: Base64.strict_encode64(object.audio_data),  # ← 2번째 인코딩
      # ...
    }
  )
end
```

- 동일한 데이터를 서로 다른 곳에서 인코딩
- 일관성 부족

**해결책:**
```ruby
# Serializer에서만 처리
def build_response(user_message, assistant_message, tts_result)
  {
    user_message: MessageSerializer.new(user_message).as_json,
    assistant_message: MessageSerializer.new(assistant_message).as_json_with_audio
  }
end
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

#### 9. 타이틀 자동 생성 없음

**파일:** `backend/app/controllers/api/v1/conversations_controller.rb:23`

**이슈:** 대화 생성 시 타이틀이 필수는 아니지만 비어있을 수 있음

**문제:**
```ruby
def create
  conversation = current_user.conversations.create!(title: conversation_params[:title])
  # title이 nil → "Untitled Conversation" 같은 기본값 없음
end
```

**해결책:**
```ruby
# Model에서 처리
class Conversation < ApplicationRecord
  before_validation :set_default_title, if: -> { title.blank? }

  private

  def set_default_title
    self.title = "Conversation #{Time.current.strftime('%Y-%m-%d %H:%M')}"
  end
end

# 또는 Service에서
def create_conversation(user, title: nil)
  user.conversations.create!(
    title: title.presence || generate_title_from_first_message
  )
end
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

#### 10. 메시지 content가 nil 가능

**파일:** `backend/db/migrate/20260115103950_create_messages.rb:7`

**이슈:** `content` 컬럼에 null 제약 없음

**문제:**
```ruby
create_table :messages do |t|
  # ...
  t.text :content  # ← null: false 없음
end
```

- STT 실패 시 content가 nil로 저장될 수 있음
- Model에는 validation 있지만 DB 레벨 제약 없음

**해결책:**
```ruby
# Migration 수정
class CreateMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :messages do |t|
      t.text :content, null: false  # ← null: false 추가
    end
  end
end
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

### 🟢 Good Practices (잘된 점)

1. **서비스 레이어 분리**
   - ConversationService가 STT/LLM/TTS 오케스트레이션
   - Controller가 얇아서 비즈니스 로직 분리 잘됨

2. **명확한 에러 계층**
   - `ConversationError < StandardError`
   - `ProcessingError < ConversationError`
   - 클라이언트가 에러 타입으로 처리 가능

3. **멤버십 체크 통합**
   - `MembershipCheck` concern으로 일관된 접근 제어
   - 모든 대화 API가 활성 멤버십 필요

4. **RESTful 라우팅**
   - `/conversations/:id/messages` - 메시지 목록
   - `/conversations/:id/audio` - 오디오 전송
   - 명확한 리소스 구조

5. **테스트 커버리지**
   - 멤버십 체크 경계값 테스트 (만료일, 미래 시작일 등)
   - 207줄의 상세한 Request Spec

6. **인덱스 추가**
   - `[user_id, status]` - 사용자별 활성 대화 조회 최적화
   - `[conversation_id, created_at]` - 메시지 시간순 정렬 최적화

---

## 수정 권장 사항

### 즉시 수정 (Critical)
- [ ] #1: 오디오 데이터를 S3/Active Storage로 이전
- [ ] #2: WebSocket + Background Job으로 비동기 처리 구현
- [ ] #3: message_history에서 audio_data 제외 (select 사용)
- [ ] #4: LLM Context 크기 제한 (최근 20개 또는 4000 토큰)
- [ ] #5: Base64 인코딩 예외 처리 추가

### 다음 Phase에서 개선 (Warning)
- [ ] #6: ConversationSerializer에서 select로 필요한 컬럼만 조회
- [ ] #7: ConversationService에 트랜잭션 추가
- [ ] #8: Base64 인코딩 로직 Serializer로 통일
- [ ] #9: Conversation 타이틀 자동 생성
- [ ] #10: Message content에 null: false 제약 추가

---

## 검증 방법

### 1. 오디오 스토리지 변경 테스트
```ruby
# spec/services/conversation_service_spec.rb
it "uploads audio to S3 instead of DB" do
  result = service.process_audio(conversation, audio_data)

  message = conversation.messages.assistant.last
  expect(message.audio_storage_key).to be_present
  expect(message.audio_data).to be_nil  # DB에 저장 안됨
end
```

### 2. 성능 테스트
```ruby
# 100개 메시지 로드 시 메모리 사용량
before_memory = get_memory_usage
conversation.messages.limit(100).to_a
after_memory = get_memory_usage

expect(after_memory - before_memory).to be < 1.megabyte  # 1MB 이하
```

### 3. Context 크기 테스트
```ruby
it "limits LLM context to recent 20 messages" do
  # 50개 메시지 생성
  50.times { conversation.messages.create!(role: 'user', content: 'test') }

  allow(llm_service).to receive(:chat) do |_, options|
    expect(options[:context].size).to be <= 20
  end

  service.generate_response(conversation)
end
```

### 4. 전체 테스트 실행
```bash
cd backend
bundle exec rspec spec/services/conversation_service_spec.rb
bundle exec rspec spec/requests/api/v1/conversations_spec.rb
```

---

## 보안 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| 멤버십 체크 | ✅ Pass | MembershipCheck concern 적용 |
| 인증/권한 | ✅ Pass | current_user 기반 접근 제어 |
| Base64 검증 | ⚠️ Caution | decode 시 예외 처리 필요 |
| SQL Injection | ✅ Pass | Active Record 사용 |
| Mass Assignment | ✅ Pass | Strong Parameters |

---

## 성능 분석

| 지표 | 현재 (동기) | 개선 후 (비동기) |
|------|-------------|------------------|
| 음성 입력 응답 시간 | 7-12초 | 3-5초 (STT만) |
| 사용자 체감 대기 | 매우 느림 | 빠름 (즉시 피드백) |
| 메시지 100개 조회 | 10MB 메모리 | 100KB (S3 사용 시) |
| LLM 토큰 사용 | 무제한 | 4000 토큰 제한 |
| DB 크기 증가율 | 100KB/메시지 | 1KB/메시지 |

---

## 아키텍처 개선 제안

### 현재 구조 (동기)
```
Client → Controller → Service → STT (3-5초)
                              → LLM (2-4초)
                              → TTS (2-3초)
                              → DB 저장
       ← 응답 (7-12초 후)
```

### 제안 구조 (비동기 + WebSocket)
```
Client → Controller → STT (3-5초)
                   → DB 저장
       ← 즉시 STT 결과 반환

Background Job → LLM (2-4초)
              → TTS (2-3초)
              → S3 업로드
              → DB 저장
              → WebSocket 전송

Client ← WebSocket으로 실시간 수신
```

### 제안 구조 (스트리밍)
```
Client → Controller → STT (3-5초)
                   → LLM 스트리밍 시작

       ← WebSocket: 토큰 단위 실시간 전송
       ← 완료 후 TTS 오디오 전송
```

---

## 다음 Phase 제안

### Phase 4.3 - 성능 최적화
1. Active Storage 또는 S3 통합
2. WebSocket (Action Cable) 구현
3. Background Job (Sidekiq) 구현
4. Redis 캐싱 (대화 세션)

### Phase 4.4 - 실시간 기능
1. LLM 스트리밍 응답
2. TTS 청크 단위 전송
3. 타이핑 인디케이터
4. 읽음 상태 표시

### Phase 5 - 프론트엔드 연동
1. WebSocket 클라이언트
2. 오디오 재생 UI
3. 실시간 메시지 업데이트
4. 로딩 상태 관리
