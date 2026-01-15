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

