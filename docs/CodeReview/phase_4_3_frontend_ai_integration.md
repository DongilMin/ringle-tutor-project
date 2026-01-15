# Phase 4.3: Frontend AI Integration

## 개요
- **작업 일자**: 2026-01-15
- **목표**: Frontend에서 Backend AI API와 연동하여 실제 음성 대화 기능 구현
- **결과**: 성공 (테스트 59개 통과, 빌드 성공)

## 구현 내용

### 1. conversationApi 추가 (api.ts)

Backend Conversation API와 통신하는 클라이언트 구현:

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

**주요 타입 정의**:
- `ConversationSummary`: 대화 목록용 요약 정보
- `ConversationDetail`: 대화 상세 정보 (메시지 포함)
- `MessageData`: 개별 메시지 데이터
- `AudioSendResponse`: 오디오 전송 응답 (STT 결과 + AI 응답)

### 2. conversationService.ts 생성

API 호출을 래핑하고 에러 처리를 제공하는 서비스 레이어:

```typescript
// 에러 타입 정의
export type ConversationErrorCode =
  | 'SESSION_CREATE_FAILED'
  | 'SESSION_NOT_FOUND'
  | 'AUDIO_UPLOAD_FAILED'
  | 'TRANSCRIPTION_FAILED'
  | 'AI_RESPONSE_FAILED'
  | 'NETWORK_ERROR'
  | 'INVALID_AUDIO';

// 주요 함수들
export async function createSession(): Promise<...>
export async function sendAudioMessage(conversationId, audioBlob, contentType): Promise<...>
export async function sendTextMessage(conversationId, content): Promise<...>
export async function getConversationHistory(conversationId): Promise<...>
```

**특징**:
- 사용자 친화적인 에러 메시지 제공
- API 응답을 UI에 적합한 형식으로 변환 (MessageData → UIMessage)
- TypeScript discriminated union으로 타입 안전한 결과 처리

### 3. Conversation.tsx 업데이트

Mock 구현에서 실제 API 연동으로 전환:

**주요 변경사항**:
- `useAudioRecorder` 훅 연동
- `createSession()` 호출로 세션 초기화
- `sendAudioMessage()` 호출로 오디오 전송
- 상태 관리: `idle` → `recording` → `processing` → `playing`
- 에러 표시 및 재시도 기능
- AI 응답 오디오 자동 재생

**UI 상태**:
```typescript
type ConversationState = 'idle' | 'recording' | 'processing' | 'playing' | 'error';
```

### 4. TypeScript 빌드 에러 수정

기존 테스트 파일들의 TypeScript 호환성 문제 수정:

| 파일 | 문제 | 해결 |
|------|------|------|
| ConversationContext.test.tsx | `import { ReactNode }` | `import type { ReactNode }` |
| useAudioRecorder.test.ts | `global.X` 사용 | `vi.stubGlobal('X', ...)` |
| Waveform.test.tsx | `global.AudioContext` | `vi.stubGlobal('AudioContext', ...)` |
| vite.config.ts | `test` 프로퍼티 타입 에러 | `vitest/config`에서 import |

## 테스트

### 새로 추가된 테스트

**conversationService.test.ts** (7개 테스트):
- `createSession`: 세션 생성 성공/실패
- `sendAudioMessage`: 오디오 전송, 빈 오디오 검증, STT 에러 처리
- `sendTextMessage`: 텍스트 메시지 전송
- `getConversationHistory`: 대화 기록 조회

**Conversation.test.tsx** (7개 테스트 - 업데이트):
- 제목 렌더링
- 로딩 상태 표시
- 환영 메시지 표시
- 녹음 버튼 표시
- 에러 표시
- 기존 메시지 표시
- 재시도 버튼 표시

### 테스트 결과
```
Test Files  12 passed (12)
     Tests  59 passed (59)
```

## 파일 변경 목록

### 신규 파일
- `frontend/src/services/conversationService.ts`
- `frontend/src/__tests__/services/conversationService.test.ts`

### 수정된 파일
- `frontend/src/services/api.ts` - conversationApi 추가
- `frontend/src/pages/Conversation.tsx` - 실제 API 연동
- `frontend/src/__tests__/pages/Conversation.test.tsx` - 테스트 업데이트
- `frontend/src/__tests__/context/ConversationContext.test.tsx` - type import 수정
- `frontend/src/__tests__/hooks/useAudioRecorder.test.ts` - vi.stubGlobal 사용
- `frontend/src/__tests__/components/Waveform.test.tsx` - vi.stubGlobal 사용
- `frontend/vite.config.ts` - vitest/config에서 defineConfig import

## 아키텍처

```
[사용자 마이크]
    ↓
[useAudioRecorder] - MediaRecorder API로 녹음
    ↓
[Conversation.tsx] - UI 상태 관리
    ↓
[conversationService.ts] - 에러 처리, 타입 변환
    ↓
[api.ts/conversationApi] - HTTP 요청
    ↓
[Backend API] - STT → LLM → TTS
    ↓
[응답 오디오 재생] - new Audio(url).play()
```

## 다음 단계 (Phase 5)

- End-to-End 통합 테스트
- Chrome 테스트로 UI 검증
- 성능 최적화 (오디오 스트리밍)
- 에러 복구 전략 개선
