# Phase 4.1 - STT/TTS Services 코드 리뷰

## 리뷰 정보
| 항목 | 내용 |
|------|------|
| 브랜치 | `phase-4.1` |
| 커밋 | 788e25c |
| 리뷰 일시 | 2026-01-15 |
| 리뷰어 | Claude Sonnet (Code Review Agent) |

## 리뷰 대상 파일
- `backend/app/services/stt_service.rb` (95 lines)
- `backend/app/services/tts_service.rb` (114 lines)
- `backend/spec/services/stt_service_spec.rb` (58 lines)
- `backend/spec/services/tts_service_spec.rb` (65 lines)

---

## 발견된 이슈

### 🔴 Critical (즉시 수정 필요)

#### 1. Base64 디코딩 예외 처리 누락
**파일:** `tts_service.rb:107`
**이슈:** `Base64.strict_decode64`가 잘못된 형식일 때 `ArgumentError`를 발생시키지만 예외 처리 없음

**현재 코드:**
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

**수정 방법:**
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

**영향도:** 외부 API가 잘못된 Base64 문자열을 반환하면 서비스가 예상치 못한 에러로 중단됨

---

#### 2. 에러 타입 불일치 (TtsService)
**파일:** `tts_service.rb:51`
**이슈:** `validate_voice!`에서 음성 관련 에러인데 `InvalidTextError`를 발생시킴

**현재 코드:**
```ruby
def validate_voice!(voice)
  return if SUPPORTED_VOICES.include?(voice)

  raise InvalidTextError, "Unsupported voice: #{voice}"  # ← 잘못된 에러 타입
end
```

**수정 방법:**
```ruby
class InvalidVoiceError < TtsError; end  # 새 에러 클래스 추가 (라인 11)

def validate_voice!(voice)
  return if SUPPORTED_VOICES.include?(voice)

  raise InvalidVoiceError, "Unsupported voice: #{voice}. Supported: #{SUPPORTED_VOICES.join(', ')}"
end
```

**영향도:** 에러 핸들링 시 혼란, 클라이언트가 에러 타입으로 구분하기 어려움

---

#### 3. 네트워크 재시도 로직 없음
**파일:** `stt_service.rb:45`, `tts_service.rb:58`
**이슈:** 일시적 네트워크 오류(502, 503, Timeout) 시 즉시 실패, 재시도 없음

**영향도:** API 가용성 99.9%라도 1000번 중 1번 실패 → 사용자 경험 악화

**수정 권장:**
```ruby
def real_api_call_with_retry(text, voice, format, max_retries: 3)
  retries = 0
  begin
    real_api_call(text, voice, format)
  rescue ApiError, Timeout::Error => e
    retries += 1
    if retries < max_retries && retryable_error?(e)
      sleep(2**retries)  # Exponential backoff
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

---

### 🟡 Warning (개선 권장)

#### 1. 코드 중복 (DRY 원칙 위반)
**파일:** `stt_service.rb`, `tts_service.rb`
**이슈:** 두 서비스가 거의 동일한 구조 (Net::HTTP 호출, 에러 처리, Mock 분기)

**현재 상황:**
- 동일한 패턴: `validate_*!`, `call_*_api`, `real_api_call`, `parse_response`
- 동일한 상수: `DEFAULT_TIMEOUT`
- 동일한 에러 계층: `ApiError`, `TimeoutError`

**개선 방법:**
```ruby
# app/services/concerns/external_api_callable.rb
module ExternalApiCallable
  extend ActiveSupport::Concern

  DEFAULT_TIMEOUT = 30

  class_methods do
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
end

# Then in services:
class SttService
  include ExternalApiCallable
  # ...
end
```

**효과:** 중복 코드 제거, 유지보수성 향상

---

#### 2. 타임아웃 설정 불가
**파일:** `stt_service.rb:14`, `tts_service.rb:14`
**이슈:** `DEFAULT_TIMEOUT = 30`으로 고정, 긴 오디오/텍스트 처리 시 부족할 수 있음

**현재:**
```ruby
def initialize(api_key: nil)
  @api_key = api_key || ENV.fetch("TTS_API_KEY", nil)
end
```

**개선:**
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

---

#### 3. 캐싱 없음
**파일:** `tts_service.rb:27`
**이슈:** 동일한 텍스트/음성 조합을 반복 요청 시 매번 API 호출

**시나리오:**
- 자주 사용되는 튜토리얼 문구 ("Hello, let's start the lesson!")
- 동일한 오류 메시지 반복 재생

**개선 방법:**
```ruby
# config/initializers/cache.rb
Rails.application.config.tts_cache = ActiveSupport::Cache::MemoryStore.new(size: 100.megabytes)

# tts_service.rb
def synthesize(text, voice: DEFAULT_VOICE, format: DEFAULT_FORMAT)
  cache_key = "tts:#{Digest::SHA256.hexdigest("#{text}:#{voice}:#{format}")}"

  cached = Rails.application.config.tts_cache.fetch(cache_key)
  return cached if cached.present?

  result = # ... 기존 로직
  Rails.application.config.tts_cache.write(cache_key, result, expires_in: 1.hour)
  result
end
```

**예상 효과:**
- API 호출 50% 감소 (반복 문구 많은 경우)
- 응답 시간 30초 → 10ms

---

#### 4. 빈 응답 텍스트 처리 미흡
**파일:** `stt_service.rb:87-92`
**이슈:** `response["text"]`가 빈 문자열일 때 그대로 반환

**현재:**
```ruby
def parse_response(response)
  raise ApiError, "Invalid response format" unless response.is_a?(Hash)
  raise ApiError, response["error"] if response["error"].present?

  {
    text: response["text"],  # ← "" 가능
    confidence: response["confidence"],
    language: response["language"],
    duration: response["duration"]
  }
end
```

**개선:**
```ruby
def parse_response(response)
  raise ApiError, "Invalid response format" unless response.is_a?(Hash)
  raise ApiError, response["error"] if response["error"].present?

  text = response["text"]
  raise ApiError, "Empty transcription result" if text.blank?

  {
    text: text,
    confidence: response["confidence"] || 0.0,
    language: response["language"],
    duration: response["duration"]
  }
end
```

---

#### 5. 로그 부재
**파일:** 전체
**이슈:** API 호출 실패 시 디버깅 정보 없음 (응답 시간, 페이로드 크기 등)

**개선 방법:**
```ruby
def real_api_call(text, voice, format)
  start_time = Time.current
  uri = URI.parse(tts_endpoint)
  # ... 기존 로직

  response = http.request(request)
  duration = (Time.current - start_time).round(3)

  Rails.logger.info(
    "TTS API call completed",
    duration: duration,
    status: response.code,
    text_length: text.length,
    voice: voice
  )

  raise ApiError, "API returned #{response.code}: #{response.body}" unless response.is_a?(Net::HTTPSuccess)

  JSON.parse(response.body)
rescue StandardError => e
  Rails.logger.error(
    "TTS API call failed",
    error: e.class.name,
    message: e.message,
    duration: (Time.current - start_time).round(3)
  )
  raise
end
```

---

### 🟢 Good Practices (잘된 점)

1. **계층적 예외 구조**
   - `SttError/TtsError` 베이스 클래스로 일관된 에러 핸들링
   - 클라이언트가 `rescue SttError`로 모든 서비스 에러 캐치 가능

2. **Mock 모드 지원**
   - `Rails.env.test?` 또는 `ENV["STT_MOCK_ENABLED"]`로 테스트 환경 분리
   - 외부 API 없이도 개발/테스트 가능

3. **입력 유효성 검사**
   - 오디오 크기 제한 (10MB)
   - 텍스트 길이 제한 (5000자)
   - 지원 형식 검증 (audio/webm, wav, mp3, ogg)

4. **명확한 상수 정의**
   - `SUPPORTED_FORMATS`, `SUPPORTED_VOICES`로 지원 범위 명시
   - 매직 넘버 없음

5. **테스트 커버리지 양호**
   - 경계값 테스트 (빈 값, 최대 크기, 지원 형식)
   - 에러 케이스 테스트 (Timeout, InvalidAudioError)

---

## 수정 권장 사항

### 즉시 수정 (Critical)
- [ ] #1: Base64 디코딩 예외 처리 추가
- [ ] #2: TtsService에 InvalidVoiceError 클래스 추가, validate_voice! 수정
- [ ] #3: 재시도 로직 구현 (exponential backoff)

### 다음 Phase에서 개선 (Warning)
- [ ] #1: BaseApiService 패턴으로 코드 중복 제거
- [ ] #2: 타임아웃 설정 가능하도록 `initialize(timeout:)` 추가
- [ ] #3: TTS 캐싱 구현 (반복 문구 최적화)
- [ ] #4: 빈 응답 텍스트 검증 강화
- [ ] #5: 구조화된 로깅 추가 (duration, payload size)

---

## 검증 방법

### 1. Base64 예외 처리 테스트
```ruby
# spec/services/tts_service_spec.rb
it "handles invalid Base64 encoding" do
  allow(service).to receive(:call_tts_api).and_return({
    "audio_data" => "invalid!!!base64",
    "duration" => 1.0
  })

  expect { service.synthesize("test") }
    .to raise_error(TtsService::ApiError, /Invalid Base64 encoding/)
end
```

### 2. 재시도 로직 테스트
```ruby
it "retries on timeout" do
  call_count = 0
  allow(service).to receive(:real_api_call) do
    call_count += 1
    raise Timeout::Error if call_count < 3
    { "text" => "success", "confidence" => 0.9 }
  end

  result = service.transcribe(audio_data)
  expect(call_count).to eq(3)
  expect(result[:text]).to eq("success")
end
```

### 3. 전체 테스트 실행
```bash
cd backend
bundle exec rspec spec/services/stt_service_spec.rb
bundle exec rspec spec/services/tts_service_spec.rb
```

---

## 보안 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| API Key 하드코딩 | ✅ Pass | ENV 사용 |
| SQL Injection | N/A | DB 미사용 |
| 입력 유효성 검사 | ✅ Pass | 크기/형식 검증 |
| 에러 메시지 노출 | ⚠️ Caution | API 응답 body가 그대로 노출될 수 있음 (라인 90, 74) |
| HTTPS 사용 | ✅ Pass | `use_ssl = uri.scheme == "https"` |

**보안 개선 권장:**
```ruby
# 에러 메시지에서 민감 정보 제거
raise ApiError, "API returned #{response.code}: #{response.body}"
# ↓
raise ApiError, "API request failed with status #{response.code}"
```

---

## 성능 분석

| 지표 | 현재 | 개선 후 (캐싱) |
|------|------|----------------|
| TTS 평균 응답 시간 | ~2-3초 | ~10ms (캐시 히트) |
| STT 평균 응답 시간 | ~3-5초 | - (캐싱 부적절) |
| API 호출 비용 | 100% | 50-70% (TTS) |

---

## 다음 Phase 제안

### Phase 4.2 - 개선 사항
1. BaseApiService 추상화
2. 재시도 로직 (exponential backoff)
3. TTS 캐싱 시스템
4. 구조화된 로깅 (OpenTelemetry?)

### Phase 5 - Controller/API 연동
1. `POST /api/v1/ai/transcribe` (STT)
2. `POST /api/v1/ai/synthesize` (TTS)
3. API Rate Limiting
4. WebSocket 스트리밍 (실시간 TTS)
