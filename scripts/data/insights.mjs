// 키워드트립 인사이트: destination id -> insight cards.
// Surface = one chip; sheet = headline + one line; detail page = facts, sections, sources (tiny, bottom).
// Every fact must come from the listed sources. Update `checked` when re-verified.
export const INSIGHTS = {
  hongkong: [
    {
      k: "walk", n: "3.6km", l: "침사추이→몽콕 도보", cat: "걷기", checked: "2026년 11월",
      h: "침사추이에서 몽콕까지, 걸어서 50분",
      one: "네이선 로드 3.6km. 걸으면 50분 안팎, 지하철로는 세 정거장입니다.",
      facts: [["거리", "3.6km"], ["걸어서", "50분 안팎"], ["지하철", "세 정거장"]],
      sections: [["알아 두기", ["갈 때 걷고, 올 때 지하철.", "중간 야우마테이에 템플 스트리트 야시장."]]],
      src: [["Wikipedia · Nathan Road", "https://en.wikipedia.org/wiki/Nathan_Road"]],
    },
    {
      k: "escalator", n: "10시", l: "에스컬레이터 방향", cat: "시간", checked: "2026년 11월",
      h: "미드레벨 에스컬레이터는 10시부터 오르막",
      one: "오전 6~10시는 내리막, 10시~자정은 오르막. 요금은 없습니다.",
      facts: [["오르막", "10:00~24:00"], ["내리막", "06:00~10:00"], ["요금", "무료"]],
      sections: [["알아 두기", ["센트럴에서 소호·대관을 지나 미드레벨까지.", "오를 땐 타고, 내려올 땐 걷기."]]],
      src: [["Travel China Guide", "https://www.travelchinaguide.com/cityguides/mid-level-escalator-hongkong.htm"], ["China Xian Tour", "https://www.chinaxiantour.com/hong-kong-travel-guide/mid-level-escalator"]],
    },
    {
      k: "ferry", n: "1월 25일", l: "스타페리 요금 인상", cat: "곧 바뀜", checked: "2026년 11월",
      h: "스타페리, 2027년 1월 25일 요금 인상",
      one: "센트럴·완차이↔침사추이 두 노선. 지금 평일 2층은 HK$5입니다.",
      facts: [["인상일", "2027년 1월 25일"], ["지금 요금", "평일 2층 HK$5"], ["건너는 시간", "약 9분"]],
      sections: [["알아 두기", ["옥토퍼스로 탑승.", "해 질 녘에 타면 야경까지."]]],
      src: [["The Star", "https://www.thestar.com.my/aseanplus/aseanplus-news/2026/10/22/hogn-kong-approves-star-ferry-fare-increase-on-two-cross-harbour-routes"], ["TVB News", "https://news.tvb.com/en/1191781-StarFerryseeks30farehikes"], ["Star Ferry 공식 요금표", "https://www.starferry.com.hk/en/service"], ["Star Ferry 공식 시간표", "https://www.starferry.com.hk/sites/default/files/TST_C_Eng.pdf"]],
    },
    {
      k: "lights", n: "종료 발표", l: "심포니 오브 라이트", cat: "멈춘 것", checked: "2026년 11월",
      h: "심포니 오브 라이트, 종료 발표",
      one: "정부가 2026년 하반기 종료를 발표했습니다. 건물 야경은 그대로입니다.",
      facts: [["발표", "2026년 2월"], ["종료", "2026년 하반기"], ["야경", "건물 조명은 그대로"]],
      sections: [["알아 두기", ["야경 명당: 침사추이 해변 산책로, 완차이 골든 바우히니아 광장.", "쇼는 출발 전 운영 여부 확인."]]],
      src: [["Hong Kong Free Press", "https://hongkongfp.com/2026/02/27/budget-2026-symphony-of-lights-to-be-retired-in-2nd-half-of-year-replaced-by-light-shows-at-tourist-spots/"], ["The Standard", "https://www.thestandard.com.hk/news/article/325453/New-light-show-to-replace-Symphony-of-Lights-this-year-boost-tourism"], ["홍콩 관광위원회", "https://www.tourism.gov.hk/symphony/textonly/english/details/details.html"]],
    },
    {
      k: "trail", n: "100km", l: "맥리호스 트레일", cat: "산", checked: "2026년 11월",
      h: "맥리호스 트레일, 하이킹 가능한 100km",
      one: "신계를 가로지르는 등산로. 구간 하나만 골라 하루에 걷기 좋습니다.",
      facts: [["길이", "100km · 10개 구간"], ["구간 하나", "4.6~15.6km"], ["비상 연락", "999 · 112"]],
      sections: [["알아 두기", ["처음이면 2구간: 13.5km, 약 5시간, 해변을 지나는 코스.", "물·간식·우비·충전한 휴대폰 챙기기.", "혼자 걷지 말고, 출발 전 날씨 확인."]]],
      src: [["홍콩 정부 하이킹 포털", "https://www.hiking.gov.hk/trail/info/id/d0pFSWc1N1dWdkh3aStSajBvUHlmUT09"], ["홍콩 레저문화서비스부 하이킹 안전", "https://lcsd.gov.hk/en/healthy/hiking/safety.html"], ["Discover Hong Kong", "https://www.discoverhongkong.com/eng/see-do/great-outdoors/hikes/hiking-tips.jsp"], ["Wikipedia · MacLehose Trail", "https://en.wikipedia.org/wiki/MacLehose_Trail"]],
    },
  ],
};
