// 키워드트립 인사이트: destination id -> insight cards.
// Surface = one chip; sheet = headline + one line; detail page = facts, sections, sources (tiny, bottom).
// Every fact must come from the listed sources. Update `checked` when re-verified.
export const INSIGHTS = {
  hongkong: [
    {
      k: "walk", n: "3.6km", l: "침사추이→몽콕 도보", cat: "걷기", checked: "2026년 11월",
      h: "침사추이에서 몽콕까지, 걸어서 50분",
      one: "네이선 로드 3.6km. 걸으면 50분 안팎, 지하철로는 세 정거장입니다.",
      facts: [["거리", "3.6km · 네이선 로드 전체"], ["걸어서", "50분 안팎"], ["지하철", "췬완선 세 정거장"]],
      sections: [["걷는 법", [
        "침사추이에서 북쪽으로 큰길 하나만 따라가면 됩니다.",
        "중간쯤 야우마테이에서 한 블록 들어가면 템플 스트리트 야시장입니다.",
        "갈 때 걷고 돌아올 때 지하철을 타면 체력이 남습니다.",
      ]]],
      src: [["Wikipedia · Nathan Road", "https://en.wikipedia.org/wiki/Nathan_Road"]],
    },
    {
      k: "escalator", n: "10시", l: "에스컬레이터 방향", cat: "시간", checked: "2026년 11월",
      h: "미드레벨 에스컬레이터는 10시부터 오르막",
      one: "오전 6~10시는 내리막, 10시~자정은 오르막. 요금은 없습니다.",
      facts: [["오르막", "10:00~24:00"], ["내리막", "06:00~10:00"], ["요금", "무료"], ["출발", "센트럴 퀸즈로드 센트럴"]],
      sections: [["가는 곳", [
        "센트럴 마켓, 소호, 대관을 거쳐 미드레벨 콘딧 로드까지 올라갑니다.",
        "대관은 에스컬레이터에서 바로 이어집니다.",
        "오후에 타고 올라가서 걸어 내려오면 다리가 편합니다.",
      ]]],
      src: [["Travel China Guide", "https://www.travelchinaguide.com/cityguides/mid-level-escalator-hongkong.htm"], ["China Xian Tour", "https://www.chinaxiantour.com/hong-kong-travel-guide/mid-level-escalator"]],
    },
    {
      k: "ferry", n: "1월 25일", l: "스타페리 요금 인상", cat: "곧 바뀜", checked: "2026년 11월",
      h: "스타페리, 2027년 1월 25일 요금 인상",
      one: "센트럴·완차이↔침사추이 두 노선. 지금 평일 2층은 HK$5입니다.",
      facts: [["인상일", "2027년 1월 25일"], ["노선", "센트럴↔침사추이 · 완차이↔침사추이"], ["지금 요금", "평일 2층 HK$5"], ["건너는 시간", "약 7분"]],
      sections: [["타는 법", [
        "옥토퍼스로 찍고 탑니다.",
        "배는 6~12분 간격으로 자주 다닙니다.",
        "해 질 녘에 타면 노을과 스카이라인 조명을 함께 봅니다.",
      ]]],
      src: [["The Star", "https://www.thestar.com.my/aseanplus/aseanplus-news/2026/10/22/hogn-kong-approves-star-ferry-fare-increase-on-two-cross-harbour-routes"], ["TVB News", "https://news.tvb.com/en/1191781-StarFerryseeks30farehikes"], ["Star Ferry Guide 2026", "https://cloudpipe-macao-app.vercel.app/hongkong/en/insights/hongkong-transport-ferry-harbour-hongkong-%E9%A6%99%E6%B8%AF%E5%A4%A9%E6%98%9F%E5%B0%8F%E8%BC%AA%E5%AE%8C%E6%95%B4%E6%8C%87%E5%8D%972026-%E4%B8%AD%E7%92%B0%E7%81%A3%E4%BB%94%E5%B0%96%E6%B2%99%E5%92%80%E5%A4%A9%E6%98%9F%E5%B0%8F%E8%BC%AA%E7%A5%A8%E5%83%B9-hkd-%E5%85%A8%E6%94%BB%E7%95%A5"]],
    },
    {
      k: "lights", n: "종료 발표", l: "심포니 오브 라이트", cat: "멈춘 것", checked: "2026년 11월",
      h: "심포니 오브 라이트, 종료 발표",
      one: "정부가 2026년 하반기 종료를 발표했습니다. 건물 야경은 그대로입니다.",
      facts: [["시작", "2004년"], ["발표", "2026년 2월 홍콩 예산안"], ["대신", "명절 시즌 관광지 조명 행사"], ["지금", "출발 전 운영 여부 확인"]],
      sections: [["야경은 여기서", [
        "침사추이 해변 산책로와 스타의 거리",
        "완차이 골든 바우히니아 광장 산책로",
        "스타페리 위",
      ]]],
      src: [["Hong Kong Free Press", "https://hongkongfp.com/2026/02/27/budget-2026-symphony-of-lights-to-be-retired-in-2nd-half-of-year-replaced-by-light-shows-at-tourist-spots/"], ["The Standard", "https://www.thestandard.com.hk/news/article/325453/New-light-show-to-replace-Symphony-of-Lights-this-year-boost-tourism"], ["홍콩 관광위원회", "https://www.tourism.gov.hk/symphony/textonly/english/details/details.html"]],
    },
    {
      k: "trail", n: "100km", l: "맥리호스 트레일", cat: "산", checked: "2026년 11월",
      h: "맥리호스 트레일, 하이킹 가능한 100km",
      one: "신계를 가로지르는 등산로. 구간 하나만 골라 하루에 걷기 좋습니다.",
      facts: [["길이", "100km · 10개 구간"], ["구간 하나", "4.6~15.6km"], ["걷기 좋은 때", "10월~2월"], ["비상 연락", "999 또는 112"]],
      sections: [
        ["처음이라면 2구간", [
          "롱케 Long Ke에서 팍탐아우 Pak Tam Au까지 13.5km, 약 5시간 15분.",
          "사이완·함틴완 해변을 지납니다. 출발하자마자 314m를 가파르게 오릅니다.",
          "출발점 가는 미니버스 9A는 주말·공휴일에만 다닙니다.",
        ]],
        ["준비물", [
          "물은 코스 전체 분량. 중간에 살 곳이 없을 수 있습니다.",
          "충전한 휴대폰, 우산이나 우비, 모자",
          "간식, 구급약, 손전등, 호루라기",
          "발목을 덮는 등산화와 여벌 옷",
        ]],
        ["안전", [
          "혼자 걷지 말고, 일행이 아닌 사람에게 경로를 알려 두세요.",
          "출발 전 홍콩 천문대 날씨를 확인하세요.",
          "길가 거리 표지에 적힌 M001 같은 번호를 알려 주면 구조대가 찾기 쉽습니다.",
          "쓰레기는 되가져옵니다.",
        ]],
      ],
      src: [["홍콩 정부 하이킹 포털", "https://www.hiking.gov.hk/trail/info/id/d0pFSWc1N1dWdkh3aStSajBvUHlmUT09"], ["홍콩 레저문화서비스부 하이킹 안전", "https://lcsd.gov.hk/en/healthy/hiking/safety.html"], ["Discover Hong Kong", "https://www.discoverhongkong.com/eng/see-do/great-outdoors/hikes/hiking-tips.jsp"], ["Wikipedia · MacLehose Trail", "https://en.wikipedia.org/wiki/MacLehose_Trail"]],
    },
  ],
};
