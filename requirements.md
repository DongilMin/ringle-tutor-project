# [Ringle] AI 튜터 풀스택 구현 프로젝트 명세서

## 1. 프로젝트 개요
- **목표:** 영어 학습용 AI 튜터 앱 개발 (멤버십 구매 -> 음성 대화)
- **핵심 기술:** Backend(Rails API), Frontend(React + TypeScript), AI(STT/LLM/TTS)
- **평가 기준:** AI 도구 활용 능력, **코드 퀄리티(테스트 코드 필수)**, 오디오 UX 완성도

## 2. 필수 구현: Backend (멤버십 & 결제)
### A. 멤버십 로직 (엄격한 테스트 필요)
- **구조:** `User` has many `Memberships`.
- **기능 조합:**
  1. 학습 (Learning)
  2. 대화 (Talk)
  3. 분석 (Analysis)
- **만료 로직 (핵심):**
  - 멤버십은 `start_date`와 `end_date`를 가진다.
  - **Test Case 1:** 오늘 날짜가 `end_date`를 1초라도 지나면 접근 불가.
  - **Test Case 2:** `end_date`가 오늘이면 접근 가능.
- **관리:** Admin API로 생성/삭제, User API로 조회.

### B. 결제 (Mocking)
- **제약:** 실제 PG사 연동 금지.
- **구현:** `PaymentService` 등을 만들되, 내부에서 `MockObject`를 호출하여 성공/실패를 시뮬레이션한다.
- **Test Case:** 결제 성공 시 멤버십이 즉시 생성되고 `end_date`가 올바르게 설정되는지 검증.

## 3. 필수 구현: Frontend (대화 UX)
- **오디오 UX:**
  - 마이크 버튼 클릭 -> 권한 요청 -> 녹음 중 **Waveform 시각화 (필수)**.
  - VAD(음성 감지) 적용 권장.
- **AI 연동:**
  - STT/LLM/TTS는 실제 API 연동 (Cluade).
  - **Latency 최적화:** Streaming 응답 처리 권장.

## 4. 개발 및 제출 가이드
- **자동화:** 포맷팅(Linting)과 테스트(Testing)는 커밋 전 자동 수행.
- **문서화:** `docs/coding_agent_interaction_history.md`에 프롬프트/코드/수정내역/스크린샷 기록 필수.