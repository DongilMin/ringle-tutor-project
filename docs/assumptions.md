# API 설계 가정 및 결정 사항

## 개요
이 문서는 Ringle AI Tutor 프로젝트의 API 설계 시 내린 가정과 결정 사항을 기록합니다.

---

## 1. 인증 및 권한

### 가정
- **단일 유저 환경**: MVP 단계에서는 인증 없이 ID=1인 기본 유저를 사용
- **추후 확장**: JWT 기반 인증으로 전환 가능하도록 설계

### 결정 사항
- `current_user` 헬퍼가 항상 `User.first`를 반환
- 멤버십 기반 접근 제어는 구현 완료 (conversation feature 권한 체크)

---

## 2. 멤버십 시스템

### 멤버십 타입
| 타입 | 기간 | 가격 | 기능 |
|------|------|------|------|
| basic | 30일 | 9,900원 | learning |
| premium | 60일 | 19,900원 | learning, conversation, analysis |
| enterprise | 90일 | 49,900원 | learning, conversation, analysis |

### 기능(Feature) 설명
- **learning**: 학습 콘텐츠 접근
- **conversation**: AI 튜터와 대화 (음성/텍스트)
- **analysis**: 학습 분석 리포트

### 만료 처리
- `status`가 `active`이고 `end_date`가 지난 멤버십은 자동으로 `expired`로 변경
- API 호출 시 자동 체크 (`/memberships/current`)
- 배치 작업: `rake memberships:expire`

---

## 3. 결제 시스템

### Mock PG 연동
- 실제 PG사 연동 없이 Mock 처리
- 결제 성공률: 90% (10%는 랜덤 실패)
- 결제 성공 시 자동으로 멤버십 생성

### 결제 플로우
1. 클라이언트에서 `/payments` POST 요청
2. PaymentService가 Mock PG 처리
3. 성공 시 Membership 레코드 생성
4. 응답에 생성된 멤버십 정보 포함

---

## 4. 대화 시스템

### AI 서비스 구성
| 서비스 | API | 용도 |
|--------|-----|------|
| STT | OpenAI Whisper | 음성 → 텍스트 |
| LLM | OpenAI GPT-4o-mini | 대화 응답 생성 |
| TTS | OpenAI TTS | 텍스트 → 음성 |

### 대화 플로우
1. 클라이언트에서 음성/텍스트 전송
2. STT로 텍스트 변환 (음성인 경우)
3. LLM으로 응답 생성
4. TTS로 응답 음성 생성
5. 텍스트 + 음성(Base64) 응답

### 응답 형식
```json
{
  "success": true,
  "data": {
    "user_message": { "id": 1, "content": "...", "role": "user" },
    "assistant_message": { "id": 2, "content": "...", "role": "assistant" },
    "transcribed_text": "사용자 음성 텍스트",
    "audio": {
      "data": "base64...",
      "content_type": "audio/mpeg"
    }
  }
}
```

---

## 5. 에러 처리

### 표준 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": ["Optional details"]
  }
}
```

### 주요 에러 코드
| 코드 | HTTP 상태 | 설명 |
|------|-----------|------|
| MEMBERSHIP_REQUIRED | 403 | 멤버십이 필요한 기능 |
| NO_CONVERSATION_CREDITS | 403 | 대화 횟수 소진 |
| NO_ACTIVE_MEMBERSHIP | 404 | 활성 멤버십 없음 |
| PAYMENT_FAILED | 422 | 결제 실패 |

---

## 6. 프론트엔드 연동

### API 요청 규칙
- 모든 요청에 30초 타임아웃
- 5xx 에러 시 최대 3회 재시도 (exponential backoff)
- 4xx 에러는 재시도 없이 즉시 에러 표시

### 응답 데이터 추출
- 백엔드 응답: `{ success: true, data: {...} }`
- 프론트엔드에서 `response.data.data`로 실제 데이터 추출

---

## 7. 어드민 기능

### 엔드포인트
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/admin/users` | 전체 유저 목록 |
| GET | `/admin/memberships` | 전체 멤버십 목록 |
| POST | `/admin/memberships` | 멤버십 수동 부여 |
| DELETE | `/admin/memberships/:id` | 멤버십 취소 (soft delete) |

### 권한
- 현재 인증 없이 접근 가능 (MVP)
- 추후 admin role 체크 추가 예정

---

## 8. 테스트 전략

### Backend (RSpec)
- Model Spec: 비즈니스 로직 검증
- Request Spec: API 엔드포인트 통합 테스트
- Service Spec: 외부 API는 Mock 처리

### Frontend (Vitest)
- Component: React Testing Library
- Hooks: renderHook 사용
- 브라우저 API: Mock 필수 (MediaRecorder, AudioContext 등)

---

## 9. 환경 변수

### Backend
```
OPENAI_API_KEY=sk-...
RAILS_ENV=development
```

### Frontend
```
VITE_API_URL=http://localhost:3000/api/v1
```

---

## 10. Rate Limiting (오남용 방지)

### 요청 제한 설정
| 타입 | 분당 | 시간당 | 일일 | 최소 간격 |
|------|------|--------|------|-----------|
| audio | 10회 | 60회 | 200회 | 2초 |
| text | 20회 | 120회 | 500회 | 1초 |
| default | 30회 | 200회 | 1000회 | 0.5초 |

### 응답 헤더
```
X-RateLimit-Remaining-Minute: 9
X-RateLimit-Remaining-Hour: 59
X-RateLimit-Remaining-Day: 199
Retry-After: 2 (rate limit 초과 시)
```

### Rate Limit 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "요청이 너무 많습니다. 2초 후 다시 시도해주세요.",
    "limit_type": "too_fast",
    "retry_after": 2
  }
}
```

### 구현 방식
- 인메모리 저장소 사용 (개발/데모용)
- 프로덕션에서는 Redis로 전환 권장

---

## 11. 향후 개선 사항

1. **인증**: JWT 기반 인증 구현
2. **결제**: 실제 PG사 연동 (포트원, 토스페이먼츠 등)
3. **대화 분석**: 학습 진도 및 실력 분석 기능
4. **관리자**: 어드민 권한 체계 구현
5. **알림**: 멤버십 만료 알림 (이메일, 푸시)
6. **Rate Limiting**: Redis 기반 분산 환경 지원
