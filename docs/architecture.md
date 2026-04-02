# 아키텍처 설계

## 폴더 구조

- `app/`: Next.js App Router
  - `api/`: 인증/검색/차트/거래/랭킹 API
  - `stock/[symbol]/`: 종목 상세(차트 + 거래)
  - `mypage/`: 포트폴리오
- `components/`: UI 컴포넌트
- `lib/`: Supabase, Yahoo Finance, 거래 계산
- `supabase/schema.sql`: DB 스키마 및 RLS

## 데이터 흐름

1. 검색: `krx_symbols` + Yahoo 검색 결과 병합
2. 차트: Yahoo 차트 API 호출 후 프론트 10초 폴링
3. 거래: 현재가 조회 → 수수료 계산 → 트랜잭션 기록
4. 랭킹: 사용자별 현금 + 보유 주식 현재가 평가
