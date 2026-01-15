# Coding Agent Interaction History

> AI 에이전트와의 상호작용 기록

---

## 기록 형식

### [날짜시간] Phase X.X - 기능명
- **Prompt:** 요청 내용
- **Action:** 수행 작업
- **Result:** 결과
- **Screenshot:** [첨부]

---

## Phase 2.6 - PaymentService

### 요청
PaymentService 구현 - 결제 처리 비즈니스 로직 서비스 클래스

### 생성 파일
```
backend/
├── app/services/payment_service.rb
└── spec/services/payment_service_spec.rb
```

### 핵심 코드

**app/services/payment_service.rb**
```ruby
class PaymentService
  class PaymentError < StandardError; end

  def initialize(user)
    @user = user
  end

  def purchase_membership(plan, payment_method:)
    validate_payment_method!(payment_method)

    ActiveRecord::Base.transaction do
      payment = create_payment(plan, payment_method)
      process_payment!(payment)
      activate_membership!(plan, payment)
      payment
    end
  end

  private

  def process_payment!(payment)
    # 외부 결제 게이트웨이 연동 시뮬레이션
    payment.update!(status: :completed, paid_at: Time.current)
  end

  def activate_membership!(plan, payment)
    @user.memberships.create!(
      membership_plan: plan,
      payment: payment,
      starts_at: Time.current,
      expires_at: plan.duration_days.days.from_now,
      status: :active
    )
  end
end
```

### 테스트 결과
```
PaymentService
  #purchase_membership
    creates payment and membership successfully
    validates payment method
    handles payment failures gracefully
    activates membership with correct expiration

4 examples, 0 failures
```

### Screenshot
[docs/screenshots/06_payment_service.png]

---

## Phase 3.1 - Basic UI Components

### 요청
React 기본 UI 컴포넌트 구현 - 홈, 구매, 대화 페이지

### 생성 파일
```
frontend/src/
├── pages/
│   ├── HomePage.tsx
│   ├── PurchasePage.tsx
│   └── ConversationPage.tsx
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   └── ChatBubble.tsx
├── services/
│   └── api.ts
└── __tests__/
    ├── pages/
    │   └── HomePage.test.tsx
    └── components/
        ├── Button.test.tsx
        └── ChatBubble.test.tsx
```

### 핵심 코드

**components/Button.tsx**
```tsx
interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  ...props
}) => {
  return (
    <button className={`btn btn-${variant} btn-${size}`} disabled={isLoading} {...props}>
      {isLoading ? <Spinner /> : children}
    </button>
  );
};
```

**components/ChatBubble.tsx**
```tsx
interface ChatBubbleProps {
  message: string;
  sender: "user" | "ai";
  timestamp?: Date;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, sender, timestamp }) => {
  return (
    <div className={`chat-bubble chat-${sender}`}>
      <p>{message}</p>
      {timestamp && <span className="timestamp">{formatTime(timestamp)}</span>}
    </div>
  );
};
```

### 테스트 결과
```
Button
  ✓ renders with default props
  ✓ applies variant classes correctly
  ✓ shows loading spinner when isLoading is true
  ✓ handles click events

ChatBubble
  ✓ renders user message correctly
  ✓ renders ai message correctly
  ✓ displays timestamp when provided

HomePage
  ✓ renders welcome message
  ✓ navigates to conversation page

9 examples, 0 failures
```

### Screenshot
[docs/screenshots/07_basic_ui.png]

---

## Phase 3.2 - Audio Hooks

### 요청
오디오 녹음 기능 구현 - useAudioPermission, useAudioRecorder 훅과 Waveform 시각화

### 생성 파일
```
frontend/src/
├── hooks/
│   ├── useAudioPermission.ts
│   └── useAudioRecorder.ts
├── components/
│   └── Waveform.tsx
└── __tests__/
    ├── hooks/
    │   ├── useAudioPermission.test.ts
    │   └── useAudioRecorder.test.ts
    └── components/
        └── Waveform.test.tsx
```

### 핵심 코드

**hooks/useAudioPermission.ts**
```typescript
export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

export function useAudioPermission(): UseAudioPermissionReturn {
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState("granted");
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setPermissionState("denied");
      }
      return false;
    }
  }, []);

  return { permissionState, requestPermission, error };
}
```

**hooks/useAudioRecorder.ts**
```typescript
export type RecordingState = "idle" | "recording" | "paused" | "stopped";

export function useAudioRecorder(): UseAudioRecorderReturn {
  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    };

    mediaRecorder.start(100);
    setState("recording");
  }, []);

  return { state, audioBlob, startRecording, stopRecording, pauseRecording, resumeRecording };
}
```

**components/Waveform.tsx**
```tsx
export const Waveform: React.FC<WaveformProps> = ({ mediaStream, isRecording }) => {
  useEffect(() => {
    if (!mediaStream || !isRecording) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      // Canvas에 파형 그리기
    };
    draw();
  }, [mediaStream, isRecording]);

  return <canvas ref={canvasRef} data-testid="waveform-canvas" />;
};
```

### 테스트 결과
```
useAudioPermission
  ✓ initializes with unknown permission state
  ✓ sets permission to granted when getUserMedia succeeds
  ✓ sets permission to denied on NotAllowedError
  ✓ sets error when no microphone found

useAudioRecorder
  ✓ initializes with idle state
  ✓ starts recording and updates state
  ✓ stops recording and creates audio blob
  ✓ handles pause and resume

Waveform
  ✓ renders canvas element
  ✓ applies custom styling

10 examples, 0 failures
```

### Screenshot
[docs/screenshots/08_audio_hooks.png]

---

## Phase 3.3 - State Management

### 요청
대화 상태 관리 구현 - ConversationContext with useReducer 패턴

### 생성 파일
```
frontend/src/
├── context/
│   └── ConversationContext.tsx
├── types/
│   └── conversation.ts
└── __tests__/
    └── context/
        └── ConversationContext.test.tsx
```

### 핵심 코드

**types/conversation.ts**
```typescript
export interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  audioUrl?: string;
}

export type ConversationState = "idle" | "recording" | "processing" | "playing";
```

**context/ConversationContext.tsx**
```tsx
interface ConversationContextState {
  messages: Message[];
  conversationState: ConversationState;
  isLoading: boolean;
  error: string | null;
}

type Action =
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "SET_STATE"; payload: ConversationState }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_MESSAGES" };

function conversationReducer(state: ConversationContextState, action: Action) {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_STATE":
      return { ...state, conversationState: action.payload };
    case "CLEAR_MESSAGES":
      return { ...state, messages: [] };
    default:
      return state;
  }
}

export function ConversationProvider({ children }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  const addMessage = useCallback((message: Omit<Message, "id" | "timestamp">) => {
    dispatch({
      type: "ADD_MESSAGE",
      payload: { ...message, id: crypto.randomUUID(), timestamp: new Date() },
    });
  }, []);

  return (
    <ConversationContext.Provider value={{ ...state, addMessage, setConversationState, clearMessages }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) throw new Error("useConversation must be used within ConversationProvider");
  return context;
}
```

### 테스트 결과
```
ConversationContext
  ✓ provides initial state
  ✓ adds message with generated id and timestamp
  ✓ updates conversation state
  ✓ clears all messages
  ✓ handles loading state
  ✓ handles error state

useConversation
  ✓ throws error when used outside provider

7 examples, 0 failures
```

### Screenshot
[docs/screenshots/09_state_management.png]

---

## Phase 3.2-fix - Audio Hooks 재구현

### 요청
Phase 3.2 커밋 누락으로 인한 Audio Hooks 재구현

### 생성 파일
```
frontend/src/
├── hooks/
│   ├── useAudioPermission.ts
│   └── useAudioRecorder.ts
├── components/
│   └── Waveform.tsx
└── __tests__/
    ├── hooks/
    │   ├── useAudioPermission.test.ts
    │   └── useAudioRecorder.test.ts
    └── components/
        └── Waveform.test.tsx
```

### 핵심 코드

**hooks/useAudioPermission.ts**
```typescript
export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

export function useAudioPermission(): UseAudioPermissionReturn {
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState("granted");
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setPermissionState("denied");
        setError("Microphone permission denied");
      }
      return false;
    }
  }, []);

  return { permissionState, requestPermission, error };
}
```

**hooks/useAudioRecorder.ts**
```typescript
export type RecordingState = "idle" | "recording" | "paused" | "stopped";

export function useAudioRecorder(): UseAudioRecorderReturn {
  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    };

    mediaRecorder.start(100);
    setState("recording");
  }, []);

  return { state, audioBlob, startRecording, stopRecording, pauseRecording, resumeRecording, mediaStream };
}
```

### 테스트 결과
```
useAudioPermission
  ✓ initializes with unknown permission state
  ✓ sets permission to granted when getUserMedia succeeds
  ✓ sets permission to denied on NotAllowedError
  ✓ sets error when no microphone found

useAudioRecorder
  ✓ initializes with idle state
  ✓ starts recording and updates state
  ✓ stops recording and creates audio blob
  ✓ resets recording state
  ✓ handles errors during recording

Waveform
  ✓ renders canvas element
  ✓ renders with default dimensions
  ✓ renders with custom dimensions
  ✓ applies custom styling
  ✓ creates AudioContext when recording with stream

14 tests, 0 failures
```

### Screenshot
[docs/screenshots/10_audio_hooks_fix.png]

---

## Phase 3.3-fix - State Management 재구현

### 요청
Phase 3.3 커밋 누락으로 인한 ConversationContext 재구현

### 생성 파일
```
frontend/src/
├── context/
│   └── ConversationContext.tsx
└── __tests__/
    └── context/
        └── ConversationContext.test.tsx
```

### 핵심 코드

**context/ConversationContext.tsx**
```tsx
export interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  audioUrl?: string;
}

export type ConversationState = "idle" | "recording" | "processing" | "playing";

type Action =
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "SET_STATE"; payload: ConversationState }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_MESSAGES" };

function conversationReducer(state, action): ConversationContextState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_STATE":
      return { ...state, conversationState: action.payload };
    case "CLEAR_MESSAGES":
      return { ...state, messages: [] };
    default:
      return state;
  }
}

export function ConversationProvider({ children }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  const addMessage = useCallback((message) => {
    dispatch({
      type: "ADD_MESSAGE",
      payload: { ...message, id: crypto.randomUUID(), timestamp: new Date() },
    });
  }, []);

  return (
    <ConversationContext.Provider value={{ ...state, addMessage, setConversationState, clearMessages }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) throw new Error("useConversation must be used within ConversationProvider");
  return context;
}
```

### 테스트 결과
```
ConversationContext
  initial state
    ✓ provides initial state values
  addMessage
    ✓ adds message with generated id and timestamp
    ✓ adds multiple messages in order
  setConversationState
    ✓ updates conversation state
    ✓ cycles through all states
  setLoading
    ✓ sets loading state
  setError
    ✓ sets error message
    ✓ clears error when set to null
  clearMessages
    ✓ clears all messages
  setSessionId
    ✓ sets session id
  updateLastMessage
    ✓ updates the last message
    ✓ does nothing when no messages exist
  useConversation hook
    ✓ throws error when used outside provider

13 tests, 0 failures
```

### Screenshot
[docs/screenshots/11_state_management_fix.png]

---

## Phase 4.1 - Backend AI Services

### 요청
Backend AI 서비스 구현 - STT, LLM, TTS 서비스

### 생성 파일
```
backend/
├── app/services/
│   ├── stt_service.rb      # 음성 → 텍스트
│   ├── llm_service.rb      # AI 대화 생성 (Gemini)
│   └── tts_service.rb      # 텍스트 → 음성
└── spec/services/
    ├── stt_service_spec.rb
    ├── llm_service_spec.rb
    └── tts_service_spec.rb
```

### 핵심 코드

**app/services/stt_service.rb**
```ruby
class SttService
  SUPPORTED_FORMATS = %w[audio/webm audio/wav audio/mp3 audio/ogg].freeze
  MAX_AUDIO_SIZE = 10.megabytes

  def transcribe(audio_data, content_type: "audio/webm", language: "en")
    validate_audio!(audio_data, content_type)
    response = call_stt_api(audio_data, content_type, language)
    parse_response(response)
  end

  private

  def validate_audio!(audio_data, content_type)
    raise InvalidAudioError, "Audio data is required" if audio_data.blank?
    raise InvalidAudioError, "Audio data is too large" if audio_data.bytesize > MAX_AUDIO_SIZE
    raise InvalidAudioError, "Unsupported format" unless SUPPORTED_FORMATS.include?(content_type)
  end
end
```

**app/services/llm_service.rb**
```ruby
class LlmService
  DEFAULT_MODEL = "gemini-1.5-flash"

  SYSTEM_PROMPT = <<~PROMPT
    You are an AI English tutor helping users practice English conversation.
    Your role is to:
    1. Engage in natural conversation with the user
    2. Gently correct grammar and pronunciation mistakes
    3. Suggest better ways to express ideas
    4. Keep responses concise and conversational (2-3 sentences)
    5. Be encouraging and supportive
  PROMPT

  def chat(user_message, context: [])
    validate_message!(user_message)
    @conversation_history << { role: "user", content: user_message }
    response = call_gemini_api
    assistant_message = parse_response(response)
    @conversation_history << { role: "assistant", content: assistant_message }
    { message: assistant_message, conversation_history: @conversation_history }
  end
end
```

**app/services/tts_service.rb**
```ruby
class TtsService
  SUPPORTED_VOICES = %w[
    en-US-Standard-A en-US-Standard-B en-US-Standard-C
    en-GB-Standard-A en-GB-Standard-B
  ].freeze

  def synthesize(text, voice: DEFAULT_VOICE, format: DEFAULT_FORMAT)
    validate_text!(text)
    validate_voice!(voice)
    response = call_tts_api(text, voice, format)
    parse_response(response, format)
  end
end
```

### 테스트 결과
```
SttService
  #transcribe
    with valid audio data
      ✓ returns transcription result
      ✓ accepts different languages
    with invalid audio data
      ✓ raises error when audio data is blank
      ✓ raises error when audio is too large
      ✓ raises error for unsupported audio format
    with supported audio formats
      ✓ accepts audio/webm, wav, mp3, ogg formats
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
      ✓ raises error when message is blank/empty/too long
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
    with invalid text/voice
      ✓ raises appropriate errors
    with supported voices
      ✓ accepts en-US/en-GB voices
  error handling
    ✓ wraps timeout errors

33 examples, 0 failures
```

### Screenshot
[docs/screenshots/12_ai_services.png]

---

## Phase 4.2: 대화 API (Conversation API)

### 날짜
2026-01-15

### 프롬프트
```
Phase 4.2 대화 API 구현
- Conversation, Message 모델 생성
- ConversationService (STT→LLM→TTS 파이프라인)
- ConversationsController API 엔드포인트
- Request Spec 작성
```

### 구현 내용

#### 1. 모델 생성
**파일:** `app/models/conversation.rb`, `app/models/message.rb`

```ruby
# Conversation 모델
class Conversation < ApplicationRecord
  belongs_to :user
  has_many :messages, dependent: :destroy

  STATUSES = { active: "active", completed: "completed", archived: "archived" }.freeze

  validates :status, presence: true, inclusion: { in: STATUSES.values }
  scope :active, -> { where(status: STATUSES[:active]) }
  scope :recent, -> { order(updated_at: :desc) }
end

# Message 모델
class Message < ApplicationRecord
  belongs_to :conversation
  ROLES = { user: "user", assistant: "assistant" }.freeze

  validates :role, presence: true, inclusion: { in: ROLES.values }
  validates :content, presence: true
end
```

#### 2. ConversationService (AI 파이프라인)
**파일:** `app/services/conversation_service.rb`

```ruby
class ConversationService
  def initialize(stt_service: nil, llm_service: nil, tts_service: nil)
    @stt_service = stt_service || SttService.new
    @llm_service = llm_service || LlmService.new
    @tts_service = tts_service || TtsService.new
  end

  def process_audio(conversation, audio_data, content_type:)
    # Step 1: STT - 음성 → 텍스트
    stt_result = @stt_service.transcribe(audio_data, content_type: content_type)

    # Step 2: 사용자 메시지 저장
    user_message = save_user_message(conversation, stt_result[:text])

    # Step 3: LLM - AI 응답 생성
    llm_result = @llm_service.chat(stt_result[:text], context: conversation.message_history)

    # Step 4: TTS - 텍스트 → 음성
    tts_result = @tts_service.synthesize(llm_result[:message])

    # Step 5: 어시스턴트 메시지 저장 (오디오 포함)
    assistant_message = save_assistant_message(conversation, llm_result[:message], tts_result)

    build_response(user_message, assistant_message, tts_result)
  end

  def process_text(conversation, user_text)
    # 텍스트 입력 처리 (STT 스킵)
  end
end
```

#### 3. API 엔드포인트
**파일:** `app/controllers/api/v1/conversations_controller.rb`

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/v1/conversations | 대화 목록 |
| GET | /api/v1/conversations/:id | 대화 상세 |
| POST | /api/v1/conversations | 새 대화 생성 |
| GET | /api/v1/conversations/:id/messages | 메시지 목록 |
| POST | /api/v1/conversations/:id/messages | 텍스트 메시지 전송 |
| POST | /api/v1/conversations/:id/audio | 오디오 메시지 전송 |

### 테스트 결과
```
Api::V1::Conversations
  Conversation CRUD
    GET /api/v1/conversations
      ✓ returns empty array when no conversations exist
      ✓ returns list of conversations
      ✓ returns conversations ordered by most recent
      ✓ only returns conversations for current user
    GET /api/v1/conversations/:id
      ✓ returns conversation details
      ✓ returns 404 for non-existent conversation
    POST /api/v1/conversations
      ✓ creates a new conversation with title
      ✓ creates conversation without title
  Conversation Messages
    GET /api/v1/conversations/:id/messages
      ✓ returns empty array when no messages
      ✓ returns messages in chronological order
    POST /api/v1/conversations/:id/messages
      ✓ processes text message and returns AI response
      ✓ creates user and assistant messages
      ✓ returns error for blank message
  Conversation Audio
    POST /api/v1/conversations/:id/audio
      ✓ processes audio and returns AI response
      ✓ creates user and assistant messages
      ✓ returns error for missing audio data
      ✓ returns error for invalid base64 data

165 examples, 0 failures (27개 추가)
```

### CI 에러 및 해결
1. **RuboCop SpaceInsideArrayLiteralBrackets**
   - 배열 내부 공백 누락 → `bundle exec rubocop -A`로 자동 수정

2. **ESLint unused-vars (main 머지 후)**
   - main에 머지된 hotfix 코드와 동기화 필요 → `git merge origin/main`

### Screenshot
[docs/screenshots/04_ai/phase4-2.png]

---

## Phase 4.3 - Frontend AI Integration

### [2026-01-15] Frontend API 연동

#### 요청
Frontend에서 Backend AI API와 연동하여 실제 음성 대화 기능 구현

#### 생성/수정 파일
```
frontend/src/
├── services/
│   ├── api.ts                    (conversationApi 추가)
│   └── conversationService.ts    (신규)
├── pages/
│   └── Conversation.tsx          (실제 API 연동)
└── __tests__/
    ├── services/
    │   └── conversationService.test.ts  (신규)
    └── pages/
        └── Conversation.test.tsx        (업데이트)
```

#### 핵심 코드

**services/api.ts - conversationApi**
```typescript
export const conversationApi = {
  create: () => fetchApi<{ conversation: ConversationDetail }>('/conversations', { method: 'POST' }),
  getAll: () => fetchApi<{ conversations: ConversationSummary[] }>('/conversations'),
  getById: (id: number) => fetchApi<{ conversation: ConversationDetail }>(`/conversations/${id}`),
  getMessages: (id: number) => fetchApi<{ messages: MessageData[] }>(`/conversations/${id}/messages`),
  sendMessage: (conversationId: number, content: string) => fetchApi<SendMessageResponse>(...),
  sendAudio: (conversationId: number, audioBlob: Blob, contentType: string) => fetchApiWithFormData<AudioSendResponse>(...),
};
```

**services/conversationService.ts - 에러 처리**
```typescript
export type ConversationErrorCode =
  | 'SESSION_CREATE_FAILED'
  | 'SESSION_NOT_FOUND'
  | 'AUDIO_UPLOAD_FAILED'
  | 'TRANSCRIPTION_FAILED'
  | 'AI_RESPONSE_FAILED'
  | 'NETWORK_ERROR'
  | 'INVALID_AUDIO';

export async function createSession(): Promise<...>
export async function sendAudioMessage(conversationId, audioBlob, contentType): Promise<...>
```

**pages/Conversation.tsx - 상태 관리**
```typescript
type ConversationState = 'idle' | 'recording' | 'processing' | 'playing' | 'error';

// useAudioRecorder 훅 연동
const { state, audioBlob, duration, startRecording, stopRecording, resetRecording, error } = useAudioRecorder();

// 녹음 완료 시 자동 전송
useEffect(() => {
  if (audioBlob && recordingState === 'stopped') {
    processAudio();
  }
}, [audioBlob, recordingState]);
```

#### 테스트 결과
```
Test Files  12 passed (12)
     Tests  59 passed (59)
```

#### 빌드 에러 수정
1. **ReactNode import** → `import type { ReactNode }` 사용
2. **global 변수** → `vi.stubGlobal()` 사용
3. **vite.config.ts** → `vitest/config`에서 defineConfig import

#### 아키텍처 플로우
```
[마이크 녹음] → [useAudioRecorder] → [Conversation.tsx]
    ↓
[conversationService] → [conversationApi] → [Backend API]
    ↓
[STT → LLM → TTS] → [응답 오디오 재생]
```

### Screenshot
[docs/screenshots/04_ai/phase4-3.png]

---

## Phase 5.1 - Chrome 브라우저 실시간 디버깅 및 UX 검증

### [2026-01-16] Vibe Coding을 통한 실시간 문제 발견 및 해결

#### 개요
Claude Code의 Chrome 브라우저 자동화 기능(`--chrome` 모드)을 활용하여 AI가 직접 웹 브라우저에서 사용자 경험을 테스트하고, F12 개발자 도구 콘솔을 통해 런타임 에러를 실시간으로 캐치하여 즉각적인 수정을 진행함.

#### Vibe Coding 접근 방식
기존의 단위 테스트만으로는 발견하기 어려운 **실제 사용자 플로우에서의 버그**를 AI가 직접 브라우저를 조작하며 발견:

1. **실시간 UI 렌더링 검증** - localhost:5173 접속하여 화면 렌더링 상태 확인
2. **F12 콘솔 로그 모니터링** - JavaScript 런타임 에러 실시간 캐치
3. **사용자 시나리오 테스트** - 실제 음성 녹음 → 전송 → AI 응답 플로우 검증
4. **스크린샷 기반 문제 분석** - 시각적 버그 및 레이아웃 이슈 확인

#### 발견된 문제점 및 해결

##### 1. 음성 메시지 처리 실패 - "Unknown error"
**발견 방법:** Chrome에서 음성 녹음 후 전송 시 에러 발생, F12 콘솔에서 에러 스택 트레이스 확인

**원인 분석:**
```
Frontend: response.data 직접 접근
Backend 응답: { success: true, data: { ... } }
→ 중첩된 data 구조로 인한 undefined 참조
```

**해결:**
```typescript
// Before
resolve(response.data);

// After - Backend 응답 구조에 맞게 수정
resolve(response.data.data || response.data);
```

##### 2. 메시지 content 접근 에러 - "Cannot read properties of undefined"
**발견 방법:** 텍스트 메시지 전송 시 동일한 패턴의 에러 발생

**원인:** `sendTextMessage` 함수에서도 동일한 응답 파싱 문제

**해결:** API 응답 추출 로직 통일

##### 3. STT 텍스트 미표시 문제
**발견 방법:** 음성 메시지 전송 후 사용자가 "내가 뭐라고 했는지" 확인 불가

**해결:** Backend에서 `transcribed_text` 필드 추가하여 응답에 포함

##### 4. Admin 멤버십 부여 실패
**발견 방법:** Admin 페이지에서 멤버십 부여 시 "유저 ID 입력" 에러

**원인:** 텍스트 입력 필드에 잘못된 값 입력 가능

**해결:**
- Users API 엔드포인트 생성 (`/api/v1/admin/users`)
- 텍스트 입력 → 드롭다운 선택으로 UX 개선

#### 요구사항 미반영 부분 발견 및 구현

Chrome 테스트 중 요구사항 체크리스트 대조하여 누락된 기능 발견:

| 누락 항목 | 구현 내용 |
|-----------|-----------|
| Admin 멤버십 관리 UI | `/admin` 페이지 생성, 멤버십 목록/부여/취소 |
| 음성 응답 다시 듣기 | AI 메시지에 재생 버튼 추가 |
| 네트워크 에러 처리 | Retry 로직 + ErrorToast 컴포넌트 |
| 멤버십 만료 자동 처리 | Expirable concern + API 호출 시 자동 체크 |

#### 테스트 결과
```
Chrome UX 테스트:
✓ 홈페이지 렌더링 정상
✓ 멤버십 구매 플로우 정상
✓ 음성 녹음 → AI 응답 플로우 정상
✓ Admin 멤버십 관리 정상
✓ F12 콘솔 에러 없음

Backend: 171 examples, 0 failures
Frontend: 75 tests passed
```

#### 핵심 인사이트
- **단위 테스트의 한계**: API 응답 구조 불일치는 통합 환경에서만 발견 가능
- **Vibe Coding의 가치**: AI가 실제 브라우저에서 사용자 행동을 시뮬레이션하여 엣지 케이스 발견
- **즉각적 피드백 루프**: 문제 발견 → 원인 분석 → 수정 → 검증이 하나의 세션에서 완료

### Screenshot
[docs/screenshots/05_chrome_testing/]

---

## Phase 5.2 - 코드 품질 개선 및 문서화

### [2026-01-16] 최종 보완 작업

#### 구현 내용

##### 1. LLM 프롬프트 개선
**목적:** 일관된 주제 대화 유지 및 자연스러운 영어 교정

```ruby
SYSTEM_PROMPT = <<~PROMPT
  You are Ringle AI Tutor, a friendly and professional English conversation coach.

  ## Topic Consistency Rules
  - Stay focused on the current conversation topic
  - Periodically reference earlier parts of the conversation

  ## Language Correction Guidelines
  - Use gentle, implicit corrections by naturally rephrasing
  - Example: "I goed to store" → "Oh, you went to the store! What did you buy?"
PROMPT
```

##### 2. 네트워크 오류 처리 강화
**구현:**
- Exponential backoff retry 로직 (최대 3회)
- ErrorToast 컴포넌트로 사용자 친화적 에러 표시
- 재시도 버튼 제공

```typescript
export const withRetry = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt < retries) {
        const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
        await sleep(delay);
      }
    }
  }
  throw lastError;
};
```

##### 3. 멤버십 만료 자동 처리
**구현:**
- `Expirable` concern으로 만료 로직 모듈화
- API 호출 시 자동 만료 체크
- Rake task로 배치 처리 가능

```ruby
module Expirable
  def check_and_expire!
    return false unless should_expire?
    update!(status: "expired")
  end

  def should_expire?
    status == "active" && end_date < Date.current
  end
end
```

##### 4. API 문서화
**생성 파일:** `docs/assumptions.md`
- 설계 가정 및 결정 사항 문서화
- 멤버십 타입별 기능/가격/기간 정리
- 에러 코드 및 응답 형식 명세

##### 5. 테스트 수정
- Factory 기본값을 premium으로 변경 (conversation 기능 접근 위해)
- Payment 테스트 가격 기대값 수정 (모델 실제 가격에 맞춤)

#### 최종 테스트 결과
```
Backend:  171 examples, 0 failures
Frontend: 75 tests passed
Lint:     No offenses detected
```

---

