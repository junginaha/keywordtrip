# 키워드트립 (Vercel 배포용)

1. 이 폴더를 GitHub 저장소로 올리고 Vercel에서 Import (Framework: Other, 빌드 설정 없음)
2. Vercel → Project → Settings → Domains → `keywordtrip.com` 추가
3. 도메인 구입처 DNS에 Vercel 화면이 안내하는 값 입력 (보통 A `@` 76.76.21.21, CNAME `www` cname.vercel-dns.com)
4. 다른 도메인을 쓰면 index.html·robots.txt·sitemap.xml 안의 `https://keywordtrip.com`를 바꿀 것
5. 배포 후 Google Search Console·네이버 서치어드바이저에 sitemap.xml 제출

- `/api/fx`: 환율 프록시(1시간 캐시). 페이지가 자동으로 불러와 최신 환율로 교체
- 이번 달 브리핑은 사이트 데이터(입국·환율·적기·시각)로 자동 생성되어 어디서나 동작

## 목적지 페이지 빌드
- 목적지 데이터의 원본은 `assets/data.js`(DEST·INFO)입니다.
- 데이터를 바꾼 뒤 `node scripts/build-pages.mjs`를 실행하면 `trips/*.html`(전 목적지 정적 페이지), `trips/index.html`(전체 목록), `sitemap.xml`, `llms.txt`, `llms-full.txt`, 홈의 추천 여행지 링크가 함께 갱신됩니다.
- 이어서 `node scripts/seo-check.mjs`로 점검 후 커밋하세요. 맞춤 FAQ는 `scripts/data/trip-faq.json`에 추가합니다.

## 검색어 집계
- 검색창에서 입력이 멈춘 뒤(1.5초) 또는 Enter를 누른 검색어만 `/api/q`로 익명 집계합니다(검색어·결과 수만 저장, IP·쿠키 없음).
- 저장소: Vercel → Storage(Marketplace) → **Upstash for Redis**를 이 프로젝트에 연결하면 환경변수가 자동으로 들어갑니다. 연결 전에는 Vercel 로그에만 남습니다.
- 보고서: Vercel 환경변수에 `SEARCH_REPORT_KEY`(임의의 긴 문자열)를 넣고 `https://keywordtrip.com/api/search-report?key=그값` 접속. `&month=2026-10`, `&format=json` 지원.
- '결과 0건 검색어'를 `assets/search.js`의 `ALIAS_ID`·`ALIAS_CC`에 추가하거나 추천 도시로 반영합니다.

## 핵심 여행지 질문 구조 (Simple first, deep when needed)
- 데이터: `scripts/data/core.mjs` — 핵심 10개국(일본·베트남·태국·대만·필리핀·싱가포르·홍콩·미국·프랑스·이탈리아) × 9개 키워드(환율·날씨·입국·교통·숙소·eSIM·물가·안전·여행 준비)의 짧은 답과 질문.
- 빌드 결과: `/trips/{국가}/{키워드}` 90개 페이지(FAQPage 구조화 데이터), 국가·도시 페이지 상단 키워드 바, 검색용 `assets/qa.json`(약 270개 질문).
- 홈: '어디로 가세요?' 국가 선택 → 키워드만 노출. 검색창 질문(예: "다낭 10월 날씨")은 `assets/answers.js`가 짧은 답 카드로 보여 주고, 숙소·항공 질문일 때만 트립닷컴 CTA를 붙입니다.
- 질문 추가: core.mjs의 해당 국가 `t[키워드].qa`에 [질문, 답]을 넣고 `node scripts/build-pages.mjs`.
