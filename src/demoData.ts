import { Person, CustomGroup } from "./types";

export const initialGroups: CustomGroup[] = [
  { id: "g1", name: "고등학교 동창" },
  { id: "g2", name: "테니스 동호회" },
  { id: "g3", name: "육아 동지회" },
  { id: "g4", name: "대학 마케팅 학회" },
  { id: "g5", name: "VIP 클라이언트" },
];

export const initialPeople: Person[] = [
  {
    id: "p1",
    name: "김용우",
    phone: "010-4321-9876",
    company: "스마트에듀텍 대표",
    category: "지인",
    groups: ["테니스 동호회", "대학 마케팅 학회"],
    familyInfo: {
      spouseName: "이지아",
      children: [
        { name: "김하진", ageOrBirth: "8살", memo: "올해 초등학교 입학, 테니스 라켓에 관심 보임" },
        { name: "김하린", ageOrBirth: "5살", memo: "유치원 적응 완료, 뽀로로보다 블록놀이를 선호함" }
      ]
    },
    memo: "테니스 구력 5년. 백핸드가 강력함. 드립커피 애호가이며 단 음식을 싫어하고 삼겹살을 매우 좋아함. 최근 사업 확장으로 바쁜 상태.",
    avatarEmoji: "🎾",
    avatarBg: "bg-emerald-100 text-emerald-800",
    lastContactDate: "2026-07-15",
    lastContactMedium: "식사",
    history: [
      {
        id: "h1_1",
        date: "2026-07-15",
        medium: "식사",
        summary: "1. 서브 전술에 대해 의견을 나눴으며 복식 파트너로 가을 대회 참가를 긍정 검토 중임.\n2. 자녀 하진이가 초등학교에 입학했는데 학교 방과후 체육수업을 매우 좋아한다고 전함.\n3. 스마트에듀텍 최근 교육용 모바일 플랫폼 투자 라운드가 순조롭게 진행 중이라고 함."
      },
      {
        id: "h1_2",
        date: "2026-06-10",
        medium: "통화",
        summary: "1. 안부 전화 중 최근 손목 통증으로 테니스 레슨을 2주간 쉬었다고 토로함.\n2. 커피 기프티콘을 보내줘서 잘 먹었다고 감사 인사를 받음.\n3. 아내 지아님의 생일 선물을 고르는 팁을 물어보아 꽃과 편지를 추천해 줌."
      }
    ]
  },
  {
    id: "p2",
    name: "이지연",
    phone: "010-8888-2222",
    company: "프리랜서 디자이너",
    category: "친구",
    groups: ["고등학교 동창", "육아 동지회"],
    familyInfo: {
      spouseName: "민지훈",
      children: [
        { name: "민우진", ageOrBirth: "6살", memo: "영어유치원 블루반 재원 중, 자동차 장난감을 극도로 좋아함" }
      ]
    },
    memo: "고등학교 시절 미술반 동창. 디자인 안목이 세련되고 빈티지 소품 수집이 취미. 우유 알레르기가 있어서 카페 가거나 식사할 때 락토프리 음료나 오트 밀크 위주로 주문 필수.",
    avatarEmoji: "🎨",
    avatarBg: "bg-peach-100 text-peach-800 bg-orange-100 text-orange-800",
    lastContactDate: "2026-07-19",
    lastContactMedium: "통화",
    history: [
      {
        id: "h2_1",
        date: "2026-07-19",
        medium: "통화",
        summary: "1. 프리랜서 계약 건 관련 상표권 디자인 검토를 조율하고 가벼운 수다를 떨었음.\n2. 아들 우진이가 영유 레벨테스트를 무난히 통과해서 안심했다고 함.\n3. 최근 성수에 새로 오픈한 에스프레소 바에 꼭 같이 가자고 버킷리스트를 작성함."
      }
    ]
  },
  {
    id: "p3",
    name: "박철진 부장",
    phone: "010-5555-7777",
    company: "한국테크솔루션 구매팀",
    category: "회사-업무",
    groups: ["VIP 클라이언트"],
    familyInfo: {
      spouseName: "임수경",
      children: []
    },
    memo: "전형적인 미식가. 서울 중구 일대 노포 맛집 지도가 머릿속에 있는 분. 골프 애호가이며 주말마다 필드에 나감. 와인은 드라이한 레드 와인을 선호하며 막걸리도 좋아함. 비즈니스 미팅 시 날씨나 건강 안부로 분위기를 띄우면 미팅 분위기가 매우 부드러워짐.",
    avatarEmoji: "👔",
    avatarBg: "bg-blue-100 text-blue-800",
    lastContactDate: "2026-07-10",
    lastContactMedium: "대면",
    history: [
      {
        id: "h3_1",
        date: "2026-07-10",
        medium: "대면",
        summary: "1. 하반기 부품 조달 계획 및 견적 조율을 위한 정식 미팅을 마침.\n2. 최근 장마철 골프 필드 라운딩을 가셨다가 폭우를 맞았던 유쾌한 이야기를 나눔.\n3. 아내 수경님과 함께 드실 강릉 산지 한과 세트를 명절 선물용으로 예약 발송하기로 결정함."
      }
    ]
  },
  {
    id: "p4",
    name: "한예슬",
    phone: "010-1234-5678",
    company: "우리병원 소아과 간호사",
    category: "가족",
    groups: ["육아 동지회"],
    familyInfo: {
      spouseName: "나영진",
      children: [
        { name: "나소희", ageOrBirth: "4살", memo: "동네 어린이집 햇살반, 딸기라면 자다가도 깸" },
        { name: "나정우", ageOrBirth: "2살", memo: "걸음마를 최근 떼서 집안 온 군데를 헤집고 다님" }
      ]
    },
    memo: "사촌 동생. 직장이 소아과라 자녀 건강 관련 조언을 많이 얻음. 아로마 테라피가 취미며 스트레스 해소법으로 밤하늘 별 보며 드라이브하기를 즐김. 오렌지 향 디퓨저 선물을 아주 기쁘게 받았던 이력이 있음.",
    avatarEmoji: "🌸",
    avatarBg: "bg-pink-100 text-pink-800",
    lastContactDate: "2026-07-20",
    lastContactMedium: "카톡",
    history: [
      {
        id: "h4_1",
        date: "2026-07-20",
        medium: "카톡",
        summary: "1. 소희가 최근 여름 감기에 걸려서 열이 안 떨어진다고 육아 고충을 토로함.\n2. 병원 리모델링 때문에 간호 부서 교대 근무 조율이 타이트해져 피로를 호소함.\n3. 주말에 우리 집에 아이들과 놀러 오겠다고 약속을 선점해 둠."
      }
    ]
  }
];
