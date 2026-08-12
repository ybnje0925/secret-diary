import { CustomGroup, Person } from "./types";

export const initialGroups: CustomGroup[] = [
  { id: "g1", name: "테니스 모임" },
  { id: "g2", name: "회사 동료" },
  { id: "g3", name: "대학 동기" },
  { id: "g4", name: "축구 동호회" },
  { id: "g5", name: "가족 모임" }
];

export const initialPeople: Person[] = [
  {
    id: "p1",
    name: "김민수",
    phone: "010-4321-9876",
    company: "",
    category: "친구",
    groups: ["테니스 모임"],
    familyInfo: {
      spouseName: "지현",
      children: [{ name: "민지", birthDate: "2017-03-11", ageOrBirth: "", memo: "요즘 축구와 테니스에 관심이 많음" }]
    },
    preferences: {
      food: "삼겹살을 좋아함",
      hobbies: "테니스, 새로운 카페 찾기",
      notes: "최근 테니스 엘보 때문에 운동을 쉬는 중. 다음 달 복식대회 같이 나가기로 함."
    },
    eventsHistory: [
      { id: "e1_1", date: "2026-08-28", type: "기념일", amountOrGift: "민지 생일", note: "작은 선물 챙기기" }
    ],
    avatarEmoji: "🙂",
    avatarBg: "bg-[#f3dfd1]",
    lastContactDate: "2026-06-01",
    lastContactMedium: "식사",
    remindIntervalDays: 60,
    history: [
      {
        id: "h1_1",
        date: "2026-07-21",
        medium: "식사",
        summary: "테니스 엘보 때문에 요즘 운동을 쉬는 중. 다음 달 복식대회 같이 참가하기로 함.",
        rawTranscript: "요즘 팔꿈치가 안 좋아서 테니스를 조금 쉬고 있어. 다음 달 복식대회는 같이 나가자."
      },
      {
        id: "h1_2",
        date: "2026-06-10",
        medium: "카톡",
        summary: "요즘 핸드드립 커피에 빠졌다고 이야기함. 괜찮은 새 카페를 찾고 있다고 함."
      }
    ]
  },
  {
    id: "p2",
    name: "박지현",
    phone: "010-8888-2222",
    company: "브랜드팀",
    category: "친구",
    groups: ["회사 동료"],
    familyInfo: { children: [] },
    preferences: {
      food: "샐러드와 가벼운 브런치",
      hobbies: "전시 보기, 산책",
      notes: "새 부서로 이동해서 정신없다고 했음."
    },
    eventsHistory: [],
    avatarEmoji: "🙂",
    avatarBg: "bg-[#f6e2d9]",
    lastContactDate: "2026-07-22",
    lastContactMedium: "카톡",
    remindIntervalDays: 30,
    history: [
      { id: "h2_1", date: "2026-07-22", medium: "카톡", summary: "새 부서로 이동해서 정신없다고 했음. 적응하면 점심을 먹기로 함." }
    ]
  },
  {
    id: "p3",
    name: "이영훈",
    phone: "010-5555-7777",
    company: "캠핑 모임",
    category: "친구",
    groups: ["캠핑 모임"],
    familyInfo: { spouseName: "수연", children: [] },
    preferences: {
      food: "고기구이, 막걸리",
      hobbies: "캠핑, 장비 구경",
      notes: "아내가 임신 5개월이라고 했음."
    },
    eventsHistory: [{ id: "e3_1", date: "2026-08-20", type: "기념일", amountOrGift: "수연 생일", note: "작은 꽃다발" }],
    avatarEmoji: "🙂",
    avatarBg: "bg-[#eadccf]",
    lastContactDate: "2026-07-29",
    lastContactMedium: "통화",
    remindIntervalDays: 30,
    history: [
      { id: "h3_1", date: "2026-07-29", medium: "통화", summary: "아내가 임신 5개월이라고 했음. 이번 주말에 캠핑 가기로 했음." }
    ]
  },
  {
    id: "p4",
    name: "최수진",
    phone: "010-1234-5678",
    company: "대학 동기",
    category: "지인",
    groups: ["대학 동기"],
    familyInfo: { children: [] },
    preferences: {
      food: "라떼, 디저트",
      hobbies: "강아지와 산책",
      notes: "강아지 쿠키와 함께 산책 중이라고 했음."
    },
    eventsHistory: [],
    avatarEmoji: "🙂",
    avatarBg: "bg-[#f1e5d8]",
    lastContactDate: "2026-03-11",
    lastContactMedium: "메시지",
    remindIntervalDays: 90,
    history: [
      { id: "h4_1", date: "2026-03-11", medium: "메시지", summary: "강아지 쿠키와 함께 산책 중이라고 했음. 날씨가 좋아 자주 걷는다고 함." }
    ]
  },
  {
    id: "p5",
    name: "정우성",
    phone: "010-7777-1111",
    company: "축구 동호회",
    category: "친구",
    groups: ["축구 동호회"],
    familyInfo: { children: [] },
    preferences: {
      food: "국밥, 매운 음식",
      hobbies: "축구, 캠핑",
      notes: "이번 주말에 캠핑 가기로 했음."
    },
    eventsHistory: [],
    avatarEmoji: "🙂",
    avatarBg: "bg-[#efd8c8]",
    lastContactDate: "2026-01-14",
    lastContactMedium: "대면",
    remindIntervalDays: 90,
    history: [
      { id: "h5_1", date: "2026-01-14", medium: "대면", summary: "이번 주말에 캠핑 가기로 했음. 새 텐트를 샀다고 이야기함." }
    ]
  }
];
