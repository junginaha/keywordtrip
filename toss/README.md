# 키워드트립 · 앱인토스 미니앱 (keywordtrip)

사이트 원본은 그대로 두고, 토스 앱 안에서 필요한 동작만 바꿔 번들을 만듭니다.

```bash
cd toss
npm install
npm run build        # dist 생성 → keywordtrip.ait
npx ait deploy --api-key <콘솔 API 키>   # 업로드 (검수 신청은 콘솔에서)
```

토스 번들에서 달라지는 점
- `/api/*` 호출은 keywordtrip.com으로 보냄 (서버 `api/_cors.js`가 토스 도메인만 허용)
- `/trips/bali` 같은 주소는 번들 안 `.html` 파일로 연결
- keywordtrip.com 링크는 미니앱 안에서 열림, 제휴·공식 사이트는 외부 브라우저로 열림
- 공유는 `intoss://keywordtrip?d=<여행지>` 토스 링크 사용
- 상세 시트가 열려 있으면 토스 뒤로가기가 시트를 먼저 닫음
- 연락처를 받는 ‘가고 싶어요 알림’과 음성 검색 버튼은 토스 번들에서만 숨김
- 화면 확대·축소 끔

실시간 반영 (검토 없이 토스 앱에 바로 나오는 것)
- 여행지 데이터(입국·적기·팁·환율·추천 도시)와 Q&A: `/api/kt-data`에서 JSON으로 받아 씀
- 여행지·가이드·소개 페이지: `/api/kt-page`에서 현재 내용을 받아 화면을 바꿈 (받은 내용 속 스크립트는 실행하지 않음)
- 번들 이후 새로 생긴 여행지: `trips/remote.html`에서 열림
- keywordtrip.com에 연결이 안 되면 번들에 든 내용을 그대로 보여 줌

번들을 새로 올려야 하는 것: 디자인, 첫 화면 구성, 새 기능(app.js·finder.js 등 스크립트 변경)

