# API 명세

## Base URL
```
http://localhost:3000/api/v1
```

## 인증
- 현재: 간단한 세션 기반 (추후 JWT 전환 가능)
- 헤더: `Authorization: Bearer {token}` (예정)

---

## 엔드포인트 목록

### 멤버십
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/memberships` | 현재 유저 멤버십 조회 |
| POST | `/admin/memberships` | [어드민] 멤버십 생성 |
| DELETE | `/admin/memberships/:id` | [어드민] 멤버십 삭제 |

### 결제
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/payments` | 결제 처리 |
| GET | `/payments` | 결제 내역 조회 |

### 대화 (AI)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/conversations` | 음성 전송 → AI 응답 |

---

## 상세 명세

- [memberships.md](./memberships.md)
- [payments.md](./payments.md)
- [conversations.md](./conversations.md)
