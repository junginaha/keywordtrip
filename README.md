# 키워드트립 (Vercel 배포용)

1. 이 폴더를 GitHub 저장소로 올리고 Vercel에서 Import (Framework: Other, 빌드 설정 없음)
2. Vercel → Project → Settings → Domains → `keywordtrip.com` 추가
3. 도메인 구입처 DNS에 Vercel 화면이 안내하는 값 입력 (보통 A `@` 76.76.21.21, CNAME `www` cname.vercel-dns.com)
4. 다른 도메인을 쓰면 index.html·robots.txt·sitemap.xml 안의 `https://keywordtrip.com`를 바꿀 것
5. 배포 후 Google Search Console·네이버 서치어드바이저에 sitemap.xml 제출

- `/api/fx`: 환율 프록시(1시간 캐시). 페이지가 자동으로 불러와 최신 환율로 교체
- 이번 달 브리핑은 사이트 데이터(입국·환율·적기·시각)로 자동 생성되어 어디서나 동작
