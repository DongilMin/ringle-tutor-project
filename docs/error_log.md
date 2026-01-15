# Error Log

> Phase별 코드 리뷰에서 발견된 이슈 및 해결 방안

---

## 📋 목차

1. [Phase 2.6 - Payment Service](#phase-26---payment-service)
2. [Phase 3.1 - Basic UI](#phase-31---basic-ui)
3. [Phase 3.2 - Audio Features](#phase-32---audio-features)
4. [Phase 4.1 - STT/TTS Services](#phase-41---stttts-services)
5. [전체 요약](#전체-요약)

---

## Phase 2.6 - Payment Service

### 🔴 Critical Issues

#### 1. Payment-Membership 연결 취약

**파일**: `backend/app/serializers/payment_serializer.rb:24-27`

**문제**:
```ruby
def serialize_membership
  membership = object.user.memberships
    .where("created_at >= ?", object.created_at - 1.second)
    .where("created_at <= ?", object.created_at + 1.second)
    .first
end
```
- 시간 기반(±1초)으로 Payment와 Membership 연결 추정
- 동시 결제 시 잘못된 Membership 매칭 가능
- N+1 쿼리 발생

**해결책**:
```ruby
# 1. Migration 추가
class AddMembershipIdToPayments < ActiveRecord::Migration[8.1]
  def change
    add_reference :payments, :membership, foreign_key: true
  end
end

# 2. PaymentService 수정
def process
  ActiveRecord::Base.transaction do
    payment = create_payment
    result = call_pg(payment)

    if result[:success]
      complete_payment(payment, result[:transaction_id])
      membership = create_membership
      payment.update!(membership: membership)  # FK 설정
      { success: true, payment: payment, membership: membership }
    end
  end
end

# 3. Serializer 수정
def as_json_with_membership
  as_json.merge(
    membership: object.membership ? MembershipSerializer.new(object.membership).as_json : nil
  )
end
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 2. PG 취소 로직 부재

**파일**: `backend/app/services/payment_service.rb:27-39`

**문제**:
- PG 결제 성공 후 Membership 생성 실패 시 환불 로직 없음
- 고객은 돈을 냈지만 멤버십이 없는 상황 발생 가능

**시나리오**:
```ruby
# 1. PG 결제 성공 (결제 완료)
result = call_pg(payment)  # success: true

# 2. Membership 생성 실패 (DB 에러, Validation 에러 등)
membership = create_membership  # 실패!

# 3. 트랜잭션 롤백으로 Payment는 DB에서 사라짐
# 4. 하지만 PG사에는 결제 내역이 남아있음 ← 환불 필요!
```

**해결책**:
```ruby
def process
  payment = nil
  membership = nil
  pg_transaction_id = nil

  begin
    ActiveRecord::Base.transaction do
      payment = create_payment
      result = call_pg(payment)

      raise PgError, result[:error] unless result[:success]
      pg_transaction_id = result[:transaction_id]

      complete_payment(payment, pg_transaction_id)
      membership = create_membership
      payment.update!(membership: membership)

      { success: true, payment: payment, membership: membership }
    end
  rescue ActiveRecord::RecordInvalid => e
    # Membership 생성 실패 시 PG 환불
    if pg_transaction_id
      refund_pg(pg_transaction_id)
    end
    { success: false, error: "Membership creation failed: #{e.message}" }
  end
end

private

def refund_pg(transaction_id)
  pg_client.refund(transaction_id: transaction_id)
rescue => e
  Rails.logger.error("PG refund failed: #{e.message}")
  PaymentAlertService.notify_manual_refund_needed(transaction_id)
end
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

### 🟡 Warnings

#### 3. 가격 정보 하드코딩

**파일**: `backend/app/services/payment_service.rb:6-16`

**문제**:
```ruby
MEMBERSHIP_PRICES = {
  "basic" => 29_900,
  "premium" => 59_900,
  "enterprise" => 99_900
}.freeze
```
- 가격 변경 시 코드 수정 + 배포 필요
- A/B 테스트, 프로모션 불가능
- 국가별 가격 차등 불가

**해결책**:
```ruby
# Option 1: DB 테이블
class MembershipPlan < ApplicationRecord
  # columns: plan_type, price, duration_days, active
end

# Option 2: 환경변수
MEMBERSHIP_PRICES = {
  "basic" => ENV.fetch("BASIC_PRICE", 29_900).to_i,
  "premium" => ENV.fetch("PREMIUM_PRICE", 59_900).to_i,
  "enterprise" => ENV.fetch("ENTERPRISE_PRICE", 99_900).to_i
}
```

**상태**: ⚠️ 개선 권장
**우선순위**: P2

---

#### 4. ResponseRenderer 미사용

**파일**: `backend/app/controllers/api/v1/payments_controller.rb:12-29`

**문제**:
- 다른 컨트롤러는 `render_success`/`render_error` 사용
- PaymentsController만 직접 JSON 렌더링
- API 응답 형식 불일치

**해결책**:
```ruby
def create
  result = PaymentService.new(...).process

  if result[:success]
    render_success(
      message: "Payment processed successfully",
      data: {
        payment: PaymentSerializer.new(result[:payment]).as_json,
        membership: MembershipSerializer.new(result[:membership]).as_json
      },
      status: :created
    )
  else
    render_error(
      message: result[:error],
      status: :unprocessable_entity,
      code: "PAYMENT_FAILED"
    )
  end
end
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

## Phase 3.1 - Basic UI

### 🔴 Critical Issues

#### 5. 가격 정보 Backend-Frontend 불일치

**파일**:
- Backend: `payment_service.rb` - ₩29,900
- Frontend: `PlanSelector.tsx:9-12` - $9.99

**문제**:
```tsx
// Backend
MEMBERSHIP_PRICES = {
  "basic" => 29_900,      # ₩29,900
  "premium" => 59_900,    # ₩59,900
  "enterprise" => 99_900  # ₩99,900
}

// Frontend
const plans = [
  { id: 'basic', name: 'Basic Plan', price: '$9.99/month' },   // ❌
  { id: 'premium', name: 'Premium Plan', price: '$19.99/month' }, // ❌
];
```
- 사용자가 $9.99를 보고 구매 → 실제로는 ₩29,900 청구
- 법적 문제 발생 가능 (허위 광고)

**해결책**:
```tsx
// Step 1: Backend API 추가
// GET /api/v1/membership_plans
def index
  plans = [
    { id: 'basic', name: 'Basic', price: 29_900, duration_days: 30 },
    { id: 'premium', name: 'Premium', price: 59_900, duration_days: 30 },
    { id: 'enterprise', name: 'Enterprise', price: 99_900, duration_days: 30 }
  ]
  render_success(data: plans)
end

// Step 2: Frontend에서 API 호출
const [plans, setPlans] = useState([]);

useEffect(() => {
  fetch('/api/v1/membership_plans')
    .then(res => res.json())
    .then(data => setPlans(data.data));
}, []);

return (
  <div>
    {plans.map((plan) => (
      <div key={plan.id}>
        <h3>{plan.name}</h3>
        <p>₩{plan.price.toLocaleString()}/월</p>
      </div>
    ))}
  </div>
);
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 6. Enterprise 플랜 누락

**파일**: `frontend/src/components/PlanSelector.tsx:9-12`

**문제**:
- Backend에는 enterprise 플랜 존재
- Frontend에는 basic, premium만 표시
- Enterprise 플랜 구매 불가

**해결책**:
위의 Issue #5 해결책과 동일 (API에서 동적으로 가져오기)

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 7. API 에러 처리 없음

**파일**: `frontend/src/services/api.ts:31-44`

**문제**:
```tsx
async function fetchApi<T>(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  return response.json();  // ❌ HTTP 에러 체크 없음
}
```

**시나리오**:
- 404 Not Found → JSON 파싱 성공하지만 success: false
- 500 Internal Server Error → JSON 파싱 실패 → Uncaught Exception
- 네트워크 오프라인 → fetch 실패 → Uncaught Exception

**해결책**:
```tsx
class ApiError extends Error {
  constructor(public message: string, public code: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(
        errorData.error?.message || 'Request failed',
        errorData.error?.code || 'UNKNOWN_ERROR'
      );
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new ApiError(
        data.error?.message || 'API error',
        data.error?.code || 'API_ERROR'
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error', 'NETWORK_ERROR');
  }
}
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 8. 인증 헤더 없음

**파일**: `frontend/src/services/api.ts:31-44`

**문제**:
- Authorization 헤더 없음
- 향후 사용자 인증 필수

**해결책**:
```tsx
async function fetchApi<T>(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // ...
}
```

**상태**: ⚠️ 수정 필요
**우선순위**: P1

---

### 🟡 Warnings

#### 9. 인라인 스타일 남용

**파일**: 모든 컴포넌트 (ChatBubble, MembershipCard, PlanSelector, Conversation)

**문제**:
```tsx
const bubbleStyle: React.CSSProperties = {
  maxWidth: "70%",
  padding: "12px 16px",
  borderRadius: "16px",
  // ...
};
```
- 유지보수성 낮음
- 재사용성 낮음
- 스타일 변경 시 컴포넌트 수정 필요

**해결책**:
```tsx
// ChatBubble.module.css
.bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
}

.bubbleUser {
  background-color: #007bff;
  color: white;
}

// ChatBubble.tsx
import styles from './ChatBubble.module.css';

export const ChatBubble = ({ sender, text }) => (
  <div className={`${styles.bubble} ${sender === 'user' ? styles.bubbleUser : styles.bubbleAi}`}>
    {text}
  </div>
);
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

#### 10. 라우팅 미연결

**파일**: `frontend/src/components/MembershipCard.tsx:28`

**문제**:
```tsx
<button onClick={() => console.log('Go to purchase page')}>
  Purchase Membership
</button>
```
- console.log만 출력
- 실제 페이지 이동 없음

**해결책**:
```tsx
import { useNavigate } from 'react-router-dom';

export const MembershipCard = ({ status }) => {
  const navigate = useNavigate();

  return (
    <div>
      {status === 'none' && (
        <button onClick={() => navigate('/purchase')}>
          Purchase Membership
        </button>
      )}
    </div>
  );
};
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

#### 11. 스크롤 자동화 없음

**파일**: `frontend/src/pages/Conversation.tsx:22-47`

**문제**:
- 새 메시지 추가 시 스크롤이 자동으로 내려가지 않음
- 사용자가 수동으로 스크롤해야 함

**해결책**:
```tsx
const chatAreaRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (chatAreaRef.current) {
    chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
  }
}, [messages]);

return (
  <div ref={chatAreaRef} className="chat-area">
    {messages.map((message) => <ChatBubble {...message} />)}
  </div>
);
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

### 💥 구현 중 발생한 에러

#### ArgumentError: Before process_action callback :require_authentication has not been defined

**발생 일시**: 2026-01-15
**파일**: `backend/app/controllers/api/v1/membership_plans_controller.rb:4`

**에러 메시지**:
```
ArgumentError:
  Before process_action callback :require_authentication has not been defined
# ./app/controllers/api/v1/membership_plans_controller.rb:4:in `<class:MembershipPlansController>'
```

**원인**:
- `MembershipPlansController`에서 `skip_before_action :require_authentication`을 사용
- `BaseController`에 `:require_authentication` before_action이 정의되어 있지 않음
- 아직 인증 시스템이 구현되지 않은 상태에서 불필요한 skip 시도

**해결책**:
```ruby
# Before (에러 발생)
module Api
  module V1
    class MembershipPlansController < BaseController
      skip_before_action :require_authentication  # ❌ require_authentication이 없음

      def index
        # ...
      end
    end
  end
end

# After (수정)
module Api
  module V1
    class MembershipPlansController < BaseController
      def index  # ✅ skip_before_action 제거
        # ...
      end
    end
  end
end
```

**검증**:
```bash
$ bundle exec rspec --format documentation
113 examples, 0 failures
```

**상태**: ✅ 해결 완료
**커밋**: `fix(phase-3.1): Remove skip_before_action for undefined callback`

---

## Phase 3.2 - Audio Features

### 🔴 Critical Issues

#### 12. 브라우저 호환성 - audio/webm 미지원

**파일**: `frontend/src/hooks/useAudioRecorder.ts:40`

**문제**:
```tsx
const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
```
- Chrome, Firefox: ✅ audio/webm 지원
- Safari: ❌ audio/webm 미지원 (audio/mp4만 지원)
- iOS Safari: MediaRecorder가 iOS 14.3부터 지원

**해결책**:
```tsx
const getMimeType = (): string => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg'
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return ''; // 브라우저 기본값
};

const startRecording = useCallback(async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = getMimeType();
  const mediaRecorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : {}
  );
  // ...
}, []);
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 13. 메모리 누수 - 이벤트 리스너 cleanup 없음

**파일**: `frontend/src/hooks/useAudioPermission.ts:25`

**문제**:
```tsx
useEffect(() => {
  const checkPermission = async () => {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });

      result.addEventListener("change", () => {
        setPermissionState(result.state as PermissionState);
      });  // ❌ cleanup 없음
    }
  };

  checkPermission();
}, []);
```
- 컴포넌트 unmount 시 이벤트 리스너가 제거되지 않음
- 메모리 누수 발생

**해결책**:
```tsx
useEffect(() => {
  let permissionStatus: PermissionStatus | null = null;

  const handleChange = () => {
    if (permissionStatus) {
      setPermissionState(permissionStatus.state as PermissionState);
    }
  };

  const checkPermission = async () => {
    if (!navigator.permissions) {
      setPermissionState("prompt");
      return;
    }

    try {
      permissionStatus = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      setPermissionState(permissionStatus.state as PermissionState);
      permissionStatus.addEventListener("change", handleChange);
    } catch {
      setPermissionState("prompt");
    }
  };

  checkPermission();

  return () => {
    if (permissionStatus) {
      permissionStatus.removeEventListener("change", handleChange);
    }
  };
}, []);
```

**状态**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 14. AudioContext 불필요한 재생성

**파일**: `frontend/src/components/Waveform.tsx:99`

**문제**:
```tsx
useEffect(() => {
  const audioContext = new AudioContext();
  // ...
}, [mediaStream, isRecording, width, height, color, backgroundColor]);
// ↑ color 변경만 해도 AudioContext 재생성
```
- Props 변경 시마다 AudioContext 재생성
- 성능 저하 및 불필요한 리소스 소비

**해결책**:
```tsx
// Effect 분리: AudioContext 생성 (핵심 의존성만)
useEffect(() => {
  if (!mediaStream || !isRecording) return;

  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(mediaStream);
  source.connect(analyser);

  audioContextRef.current = audioContext;
  analyserRef.current = analyser;

  return () => {
    audioContext.close();
  };
}, [mediaStream, isRecording]);

// Effect 분리: 그리기 로직 (스타일 의존성)
useEffect(() => {
  if (!analyserRef.current || !isRecording) return;

  const draw = () => {
    // 그리기 로직 (width, height, color 사용)
  };

  const animationId = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(animationId);
}, [isRecording, width, height, color, backgroundColor]);
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

### 🟡 Warnings

#### 15. 타임슬라이스 너무 짧음

**파일**: `frontend/src/hooks/useAudioRecorder.ts:57`

**문제**:
```tsx
mediaRecorder.start(100);  // 100ms마다 ondataavailable 호출
```
- 1초에 10번 이벤트 발생
- chunk가 많아짐 → 메모리 사용량 증가
- 긴 녹음 시 성능 저하

**해결책**:
```tsx
mediaRecorder.start(1000);  // 1초마다 수집 (충분함)
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

#### 16. 중복 호출 방지 없음

**파일**: `frontend/src/hooks/useAudioRecorder.ts:32`

**문제**:
```tsx
const startRecording = useCallback(async () => {
  // ❌ 이미 recording인지 체크 없음
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // ...
}, []);
```
- 이미 녹음 중일 때 startRecording 호출 시 처리 없음

**해결책**:
```tsx
const startRecording = useCallback(async () => {
  if (state !== "idle") {
    console.warn("Already recording or stopped");
    return;
  }

  setError(null);
  // ...
}, [state]);
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

#### 17. Waveform 성능 최적화 필요

**파일**: `frontend/src/components/Waveform.tsx:72-86`

**문제**:
```tsx
for (let i = 0; i < bufferLength; i++) {  // bufferLength = 1024
  const v = dataArray[i] / 128.0;
  const y = (v * height) / 2;
  // ...
}
```
- 1024개 루프를 매 프레임마다 실행
- 성능 이슈 가능

**해결책**:
```tsx
// 샘플링으로 루프 횟수 감소
const sampleRate = 4; // 4개당 1개만 그리기
for (let i = 0; i < bufferLength; i += sampleRate) {
  const v = dataArray[i] / 128.0;
  const y = (v * height) / 2;

  if (i === 0) {
    ctx.moveTo(x, y);
  } else {
    ctx.lineTo(x, y);
  }

  x += sliceWidth * sampleRate;
}
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

## Phase 4.1 - STT/TTS Services

### 🔴 Critical Issues

#### 18. Base64 디코딩 예외 처리 누락

**파일**: `backend/app/services/tts_service.rb:107`

**문제**:
```ruby
def parse_response(response, format)
  raise ApiError, "Invalid response format" unless response.is_a?(Hash)
  raise ApiError, response["error"] if response["error"].present?

  audio_data = response["audio_data"]
  raise ApiError, "No audio data in response" if audio_data.blank?

  {
    audio_data: Base64.strict_decode64(audio_data),  # ← ArgumentError 가능
    format: format,
    duration: response["duration"],
    content_type: format
  }
end
```
- `Base64.strict_decode64`가 잘못된 형식일 때 `ArgumentError` 발생
- 예외 처리 없음 → 서비스 중단

**해결책**:
```ruby
def parse_response(response, format)
  raise ApiError, "Invalid response format" unless response.is_a?(Hash)
  raise ApiError, response["error"] if response["error"].present?

  audio_data = response["audio_data"]
  raise ApiError, "No audio data in response" if audio_data.blank?

  begin
    decoded_audio = Base64.strict_decode64(audio_data)
  rescue ArgumentError => e
    raise ApiError, "Invalid Base64 encoding: #{e.message}"
  end

  {
    audio_data: decoded_audio,
    format: format,
    duration: response["duration"],
    content_type: format
  }
end
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 19. 에러 타입 불일치 (TtsService)

**파일**: `backend/app/services/tts_service.rb:51`

**문제**:
```ruby
def validate_voice!(voice)
  return if SUPPORTED_VOICES.include?(voice)

  raise InvalidTextError, "Unsupported voice: #{voice}"  # ← 잘못된 에러 타입
end
```
- 음성 관련 에러인데 `InvalidTextError`를 발생시킴
- 에러 핸들링 시 혼란, 클라이언트가 구분 불가

**해결책**:
```ruby
class InvalidVoiceError < TtsError; end  # 새 에러 클래스 추가 (라인 11)

def validate_voice!(voice)
  return if SUPPORTED_VOICES.include?(voice)

  raise InvalidVoiceError, "Unsupported voice: #{voice}. Supported: #{SUPPORTED_VOICES.join(', ')}"
end
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

#### 20. 네트워크 재시도 로직 없음

**파일**: `backend/app/services/stt_service.rb:45`, `backend/app/services/tts_service.rb:58`

**문제**:
- 일시적 네트워크 오류(502, 503, Timeout) 시 즉시 실패
- 재시도 로직 없음

**시나리오**:
- API 가용성 99.9%라도 1000번 중 1번 실패
- 사용자 경험 악화
- 대화 중단 → 멤버십 시간 낭비

**해결책**:
```ruby
def call_stt_api_with_retry(audio_data, content_type, language, max_retries: 3)
  retries = 0
  begin
    call_stt_api(audio_data, content_type, language)
  rescue ApiError, Timeout::Error => e
    retries += 1
    if retries < max_retries && retryable_error?(e)
      sleep(2**retries)  # Exponential backoff: 2초, 4초, 8초
      retry
    else
      raise
    end
  end
end

def retryable_error?(error)
  return true if error.is_a?(Timeout::Error)
  return true if error.message =~ /502|503|504/  # Gateway errors
  false
end
```

**상태**: ⚠️ 수정 필요
**우선순위**: P0

---

### 🟡 Warnings

#### 21. 코드 중복 (DRY 원칙 위반)

**파일**: `backend/app/services/stt_service.rb`, `backend/app/services/tts_service.rb`

**문제**:
- 두 서비스가 거의 동일한 구조
- Net::HTTP 호출, 에러 처리, Mock 분기 중복
- 유지보수성 저하

**현재 상황**:
- 동일한 패턴: `validate_*!`, `call_*_api`, `real_api_call`, `parse_response`
- 동일한 상수: `DEFAULT_TIMEOUT`
- 동일한 에러 계층: `ApiError`, `TimeoutError`

**해결책**:
```ruby
# app/services/concerns/external_api_callable.rb
module ExternalApiCallable
  extend ActiveSupport::Concern

  DEFAULT_TIMEOUT = 30

  def call_external_api(endpoint, headers, body, timeout: DEFAULT_TIMEOUT)
    uri = URI.parse(endpoint)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = timeout
    http.read_timeout = timeout

    request = Net::HTTP::Post.new(uri.path)
    headers.each { |key, value| request[key] = value }
    request.body = body

    response = http.request(request)
    raise ApiError, "API returned #{response.code}: #{response.body}" unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  end
end
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

#### 22. 타임아웃 설정 불가

**파일**: `backend/app/services/stt_service.rb:14`, `backend/app/services/tts_service.rb:14`

**문제**:
```ruby
def initialize(api_key: nil)
  @api_key = api_key || ENV.fetch("TTS_API_KEY", nil)
end
```
- `DEFAULT_TIMEOUT = 30`으로 고정
- 긴 오디오/텍스트 처리 시 부족할 수 있음

**해결책**:
```ruby
def initialize(api_key: nil, timeout: DEFAULT_TIMEOUT)
  @api_key = api_key || ENV.fetch("TTS_API_KEY", nil)
  @timeout = timeout
end

def real_api_call(text, voice, format)
  # ...
  http.open_timeout = @timeout
  http.read_timeout = @timeout
  # ...
end
```

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

#### 23. TTS 캐싱 없음

**파일**: `backend/app/services/tts_service.rb:27`

**문제**:
- 동일한 텍스트/음성 조합을 반복 요청 시 매번 API 호출
- 자주 사용되는 튜토리얼 문구 반복 생성 → 비용/시간 낭비

**시나리오**:
- "Hello, let's start the lesson!" (튜토리얼 시작 멘트)
- "Great job! Let's continue." (칭찬 멘트)

**해결책**:
```ruby
# config/initializers/cache.rb
Rails.application.config.tts_cache = ActiveSupport::Cache::MemoryStore.new(size: 100.megabytes)

# tts_service.rb
def synthesize(text, voice: DEFAULT_VOICE, format: DEFAULT_FORMAT)
  cache_key = "tts:#{Digest::SHA256.hexdigest("#{text}:#{voice}:#{format}")}"

  cached = Rails.application.config.tts_cache.fetch(cache_key)
  return cached if cached.present?

  result = synthesize_uncached(text, voice, format)
  Rails.application.config.tts_cache.write(cache_key, result, expires_in: 1.hour)
  result
end
```

**예상 효과**:
- API 호출 50% 감소 (반복 문구 많은 경우)
- 응답 시간 2-3초 → 10ms

**상태**: ⚠️ 개선 권장
**우선순위**: P1

---

## 전체 요약

### 통계

| 카테고리 | 개수 |
|---------|------|
| 🔴 Critical Issues | 13개 |
| 🟡 Warnings | 10개 |
| **총계** | **23개** |

### Phase별 분포

| Phase | Critical | Warning | Total |
|-------|----------|---------|-------|
| 2.6 - Payment Service | 2개 | 2개 | 4개 |
| 3.1 - Basic UI | 4개 | 3개 | 7개 |
| 3.2 - Audio Features | 3개 | 3개 | 6개 |
| 4.1 - STT/TTS Services | 3개 | 3개 | 6개 |

### 우선순위별 분포

| 우선순위 | 개수 | 이슈 번호 |
|---------|------|----------|
| P0 (즉시 수정) | 13개 | #1, #2, #5, #6, #7, #8, #12, #13, #14, #18, #19, #20 |
| P1 (1주일 내) | 9개 | #4, #9, #10, #11, #15, #16, #17, #21, #22, #23 |
| P2 (다음 스프린트) | 1개 | #3 |

### 카테고리별 분류

#### 데이터 무결성 (3개)
- #1: Payment-Membership FK 부재
- #2: PG 취소 로직 부재
- #5: 가격 정보 불일치

#### 에러 처리 (5개)
- #7: API 에러 처리 없음
- #13: 메모리 누수
- #18: Base64 디코딩 예외 처리 누락
- #19: 에러 타입 불일치 (TtsService)
- #20: 네트워크 재시도 로직 없음

#### 브라우저 호환성 (1개)
- #12: audio/webm 미지원

#### 성능 (4개)
- #14: AudioContext 재생성
- #15: 타임슬라이스 100ms
- #17: Waveform 루프 최적화
- #23: TTS 캐싱 없음

#### 코드 품질 (6개)
- #3: 가격 하드코딩
- #4: ResponseRenderer 미사용
- #9: 인라인 스타일
- #16: 중복 호출 방지
- #21: 코드 중복 (STT/TTS)
- #22: 타임아웃 설정 불가

#### UX (4개)
- #6: Enterprise 플랜 누락
- #8: 인증 헤더 없음
- #10: 라우팅 미연결
- #11: 스크롤 자동화

---

## 다음 단계

### Phase 2.6 후속 작업
1. Payment-Membership FK 추가 마이그레이션
2. PG 환불 로직 구현 (MockPgClient에 refund 메서드 추가)
3. ResponseRenderer 적용

### Phase 3.1 후속 작업
1. 가격 정보 API 엔드포인트 추가 (`GET /api/v1/membership_plans`)
2. API 에러 처리 구현 (ApiError 클래스)
3. React Router 통합
4. CSS 모듈화

### Phase 3.2 후속 작업
1. 브라우저 호환성 (동적 mimeType 선택)
2. 메모리 누수 수정 (이벤트 리스너 cleanup)
3. Effect 분리 (AudioContext vs 그리기)
4. 추가 테스트 (Pause/Resume, Duration)

### Phase 4.1 후속 작업
1. Base64 디코딩 예외 처리 추가 (ArgumentError → ApiError)
2. InvalidVoiceError 클래스 추가, validate_voice! 수정
3. 재시도 로직 구현 (exponential backoff, 최대 3회)
4. BaseApiService 추상화 (코드 중복 제거)
5. 타임아웃 설정 가능하도록 initialize(timeout:) 추가
6. TTS 캐싱 시스템 구현 (Rails.cache 활용)
7. 구조화된 로깅 추가 (duration, payload size)

---

## 테스트 결과

### Backend (RSpec)
- Phase 2.6: 105개 테스트 전체 통과
- Phase 4.1: STT/TTS 서비스 테스트 전체 통과

### Frontend (Vitest)
- Phase 3.1: 19개 테스트 전체 통과
- Phase 3.2: 13개 테스트 전체 통과 (Canvas 경고 무시)

---

## Git Workflow 에러

### 💥 Phase 3.2, 3.3 커밋 누락

**발생 일시**: 2026-01-15

**에러 증상**:
```bash
# origin/phase-3.2, origin/phase-3.3에 frontend 파일이 없음
$ git ls-tree -r --name-only origin/phase-3.2 | grep frontend/src
# (출력 없음)

$ git ls-tree -r --name-only origin/phase-3.3 | grep frontend/src
# (출력 없음)
```

**원인**:
1. Phase 3.2, 3.3 브랜치에서 프론트엔드 파일 생성 후 커밋하지 않음
2. 브랜치 이동 시 untracked 파일로 main에 남아있었음
3. main 브랜치 정리 중 "중복 파일"로 오인하여 삭제
4. 실제로는 커밋되지 않은 작업물이었음

**잘못된 판단**:
```bash
# main에 있는 untracked 파일들을 "이미 커밋된 파일의 복사본"으로 오인
$ rm -rf frontend/src/components/Waveform.tsx  # ← 실제 작업물 삭제!
```

**해결책**:
```bash
# 1. Phase 3.2-fix 브랜치에서 재구현
git checkout -b phase-3.2-fix
# useAudioPermission.ts, useAudioRecorder.ts, Waveform.tsx 재작성
git add -A && git commit -m "feat(frontend): Phase 3.2 - Audio Hooks 재구현"
git push -u origin phase-3.2-fix

# 2. Phase 3.3-fix 브랜치에서 재구현
git checkout main
git checkout -b phase-3.3-fix
# ConversationContext.tsx 재작성
git add -A && git commit -m "feat(frontend): Phase 3.3 - State Management 재구현"
git push -u origin phase-3.3-fix
```

**예방책 (CLAUDE.md에 추가됨)**:
```
## 6.1 Git 브랜치 규칙 (필수!)

1. 브랜치 작업이 끝나면 즉시 main 브랜치로 이동
2. 커밋 전에 반드시 git status로 staged 파일 확인
3. untracked 파일 삭제 전 해당 브랜치에 커밋 여부 확인
```

**상태**: ✅ 해결 완료 (재구현)
**커밋**:
- `phase-3.2-fix`: 4237fe3
- `phase-3.3-fix`: ac9d220

---

### 💥 CI 에러: ESLint no-unused-expressions

**발생 일시**: 2026-01-15
**파일**: `frontend/src/__tests__/components/Waveform.test.tsx:81`

**에러 메시지**:
```
Error: 81:5  error  Expected an assignment or function call and instead saw an expression
@typescript-eslint/no-unused-expressions
```

**원인**:
```tsx
// Before (에러 발생)
expect(MockAudioContext).toHaveBeenCalled;  // ❌ 괄호 누락
```
- `toHaveBeenCalled`는 함수인데 괄호 없이 사용
- 추가로 `MockAudioContext`는 클래스라서 spy가 아니므로 `toHaveBeenCalled()` 사용 불가

**해결책**:
```tsx
// After (수정)
it('renders correctly when recording with stream', () => {
  const mockStream = {
    getTracks: () => [{ stop: vi.fn() }],
  } as unknown as MediaStream;

  render(<Waveform mediaStream={mockStream} isRecording={true} />);

  const canvas = screen.getByTestId('waveform-canvas');
  expect(canvas).toBeInTheDocument();  // ✅ 캔버스 렌더링 확인으로 변경
});
```

**검증**:
```bash
$ npm run lint && npm test -- --run
✓ 37 tests passed
```

**상태**: ✅ 해결 완료

---

### 💥 CI 에러: ESLint no-case-declarations & react-refresh

**발생 일시**: 2026-01-15
**파일**: `frontend/src/context/ConversationContext.tsx`

**에러 메시지**:
```
79:7   error  Unexpected lexical declaration in case block  no-case-declarations
172:17 error  Fast refresh only works when a file only exports components  react-refresh/only-export-components
```

**원인 1 - no-case-declarations**:
```tsx
case "UPDATE_LAST_MESSAGE":
  if (state.messages.length === 0) return state;
  const updatedMessages = [...state.messages];  // ❌ case 블록에서 const 선언
```

**해결책 1**:
```tsx
case "UPDATE_LAST_MESSAGE": {  // ✅ 중괄호로 감싸기
  if (state.messages.length === 0) return state;
  const updatedMessages = [...state.messages];
  // ...
}
```

**원인 2 - react-refresh/only-export-components**:
- 같은 파일에서 `ConversationProvider` (컴포넌트)와 `useConversation` (훅) 함께 export
- React Fast Refresh는 컴포넌트만 export하는 파일에서만 작동

**해결책 2**:
```tsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useCallback } from 'react';
// Context + Hook 함께 export하는 것은 일반적인 React 패턴
```

**검증**:
```bash
$ npm run lint && npm test -- --run
✓ 36 tests passed
```

**상태**: ✅ 해결 완료

---

## Phase 4.2 - Conversation API

### CI 에러 #1: RuboCop SpaceInsideArrayLiteralBrackets

**발생 일시**: 2026-01-15
**브랜치**: `phase-4.2`

**에러 메시지**:
```
config/routes.rb:22:39: C: Layout/SpaceInsideArrayLiteralBrackets: Use space inside array brackets.
db/migrate/20260115103944_create_conversations.rb:11:31: C: Layout/SpaceInsideArrayLiteralBrackets
db/migrate/20260115103950_create_messages.rb:14:26: C: Layout/SpaceInsideArrayLiteralBrackets
```

**원인**:
- 배열 리터럴 내부에 공백 누락
- RuboCop의 `Layout/SpaceInsideArrayLiteralBrackets` 규칙 위반

**문제 코드**:
```ruby
# routes.rb
resources :conversations, only: [:index, :show, :create]  # ❌

# migration
add_index :conversations, [:user_id, :status]  # ❌
```

**해결책**:
```ruby
# routes.rb
resources :conversations, only: [ :index, :show, :create ]  # ✅

# migration
add_index :conversations, [ :user_id, :status ]  # ✅
```

**해결 명령어**:
```bash
bundle exec rubocop -A config/routes.rb db/migrate/20260115103944_create_conversations.rb db/migrate/20260115103950_create_messages.rb
```

**상태**: ✅ 해결 완료

---

**마지막 업데이트**: 2026-01-15
**리뷰어**: Code Review Agent (Claude Sonnet 4.5)
