import type { ContactMedium, CustomGroup, EventHistoryItem, EventType, Person } from "../types";

const customGroups: CustomGroup[] = [
  { id: "test_group_01", name: "회사 동료" },
  { id: "test_group_02", name: "대학 동기" },
  { id: "test_group_03", name: "테니스 모임" },
  { id: "test_group_04", name: "골프 모임" },
  { id: "test_group_05", name: "러닝 모임" },
  { id: "test_group_06", name: "동네 친구" },
  { id: "test_group_07", name: "육아 모임" },
  { id: "test_group_08", name: "거래처" },
  { id: "test_group_09", name: "이전 직장" },
  { id: "test_group_10", name: "가족 모임" },
  { id: "test_group_11", name: "캠핑 모임" }
];

type EventSeed = {
  daysOffset: number;
  type: EventType;
  amountOrGift: string;
  note: string;
};

type PersonSeed = {
  index: number;
  name: string;
  company: string;
  category: Person["category"];
  groups: string[];
  avatarEmoji: string;
  avatarBg: string;
  avatarPreset: Person["avatarPreset"];
  remindIntervalDays: number;
  lastContactDaysAgo: number;
  medium: ContactMedium;
  spouseName?: string;
  children?: Person["familyInfo"]["children"];
  preferences: Person["preferences"];
  summaries: string[];
  events?: EventSeed[];
};

const offsets = [0, 3, 7, 14, 21, 30, 45, 60, 75, 90, 105, 120, 140, 160, 180, 200, 220, 250, 280, 320];

export function createTestSeedData(referenceDate = new Date()): { people: Person[]; customGroups: CustomGroup[] } {
  return {
    people: seeds.map((seed) => toPerson(seed, referenceDate)),
    customGroups
  };
}

function toPerson(seed: PersonSeed, referenceDate: Date): Person {
  const baseDaysAgo = seed.lastContactDaysAgo;
  const history = seed.summaries.map((summary, historyIndex) => {
    const daysAgo = baseDaysAgo + offsets[historyIndex];
    return {
      id: `test_history_${pad(seed.index)}_${pad(historyIndex + 1)}`,
      date: dateByOffset(referenceDate, -daysAgo),
      medium: pickMedium(seed.medium, historyIndex),
      summary
    };
  });

  return {
    id: `test_person_${pad(seed.index)}`,
    name: seed.name,
    phone: `010-9000-${String(seed.index).padStart(4, "0")}`,
    company: seed.company,
    category: seed.category,
    groups: seed.groups,
    familyInfo: {
      spouseName: seed.spouseName,
      children: seed.children || []
    },
    preferences: seed.preferences,
    eventsHistory: (seed.events || []).map((event, eventIndex): EventHistoryItem => ({
      id: `test_event_${pad(seed.index)}_${pad(eventIndex + 1)}`,
      date: dateByOffset(referenceDate, event.daysOffset),
      type: event.type,
      amountOrGift: event.amountOrGift,
      note: event.note
    })),
    avatarEmoji: seed.avatarEmoji,
    avatarBg: seed.avatarBg,
    avatarPreset: seed.avatarPreset,
    lastContactDate: dateByOffset(referenceDate, -baseDaysAgo),
    lastContactMedium: seed.medium,
    remindIntervalDays: seed.remindIntervalDays,
    history
  };
}

function dateByOffset(referenceDate: Date, daysOffset: number) {
  const date = new Date(referenceDate);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}

function pickMedium(defaultMedium: ContactMedium, index: number): ContactMedium {
  const mediums: ContactMedium[] = [defaultMedium, "카톡", "식사", "대면", "통화", "메시지", "기타"];
  return mediums[index % mediums.length];
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

const seeds: PersonSeed[] = [
  {
    index: 1,
    name: "김민수",
    company: "라온테크 전략기획팀",
    category: "친구",
    groups: ["테니스 모임", "동네 친구"],
    avatarEmoji: "🎾",
    avatarBg: "#f3d6a4",
    avatarPreset: "man",
    remindIntervalDays: 30,
    lastContactDaysAgo: 32,
    medium: "카톡",
    spouseName: "서윤",
    children: [{ name: "하준", birthDate: "2021-05-14", ageOrBirth: "5세", memo: "공룡 책을 좋아하고 주말마다 놀이터에 간다고 함" }],
    preferences: {
      food: "매운 쭈꾸미, 평양냉면",
      hobbies: "테니스, 라켓 장비 비교",
      notes: "복식대회 이야기가 이어지다가 결과 기록은 아직 없음"
    },
    summaries: [
      "테니스를 다시 시작했고 주 2회 레슨을 알아보고 있다고 했다.",
      "새 라켓을 빌려 쳐봤는데 손목에는 예전 라켓이 더 편하다고 했다.",
      "테니스 레슨을 시작했고 포핸드 자세를 다시 잡는 중이라고 했다.",
      "팔꿈치가 조금 불편해서 무리하지 않으려고 한다고 했다.",
      "정형외과에 다녀왔고 큰 문제는 아니지만 쉬라는 이야기를 들었다고 했다.",
      "운동을 잠시 쉬면서 가벼운 스트레칭만 하고 있다고 했다.",
      "다음 달 동네 복식대회에 나갈지 고민 중이라고 했다.",
      "회사 분기 보고가 겹쳐 퇴근 시간이 늦어졌다고 했다.",
      "하준이가 공룡 전시를 보고 싶어 해서 주말 일정을 잡았다고 했다.",
      "쭈꾸미집에서 밥을 먹으며 테니스 폼 영상을 보여줬다.",
      "서윤님과 육아 분담 이야기를 많이 하는 시기라고 했다.",
      "동네 실내코트 예약이 어려워져 새 코트를 찾고 있다고 했다.",
      "대회 파트너 후보와 한 번 맞춰보기로 했다고 했다.",
      "비 오는 주말이라 카페에서 쉬었다고 했다.",
      "회사 워크숍 장소를 알아보느라 바빴다고 했다.",
      "테니스화를 바꾸고 싶지만 팔꿈치가 먼저 괜찮아져야 한다고 했다.",
      "하준이 어린이집 상담 일정이 잡혔다고 했다.",
      "복식대회 신청 마감이 다가온다고 했지만 신청 여부는 말하지 않았다.",
      "명절에 가족 모임을 짧게 다녀왔다고 했다.",
      "오랜만에 통화하며 조만간 식사하자고 했다."
    ],
    events: [
      { daysOffset: 1, type: "기념일", amountOrGift: "생일", note: "민수 생일 D-1 알림 검수용" },
      { daysOffset: -120, type: "선물", amountOrGift: "테니스 그립", note: "테니스 복귀 축하로 작은 선물을 줌" }
    ]
  },
  {
    index: 2,
    name: "이지훈",
    company: "브릭스튜디오 BX팀",
    category: "지인",
    groups: ["골프 모임", "거래처"],
    avatarEmoji: "⛳",
    avatarBg: "#d7e8c1",
    avatarPreset: "man",
    remindIntervalDays: 60,
    lastContactDaysAgo: 12,
    medium: "식사",
    spouseName: "민경",
    preferences: {
      food: "양갈비, 드립커피",
      hobbies: "골프, 스윙 영상 분석",
      notes: "라운딩 스코어보다 허리 컨디션을 더 신경 쓰는 편"
    },
    summaries: [
      "봄부터 골프 레슨을 다시 받기 시작했다고 했다.",
      "드라이버 슬라이스가 계속 나서 영상을 찍어 분석 중이라고 했다.",
      "민경님과 주말 라운딩을 한 번 가보고 싶다고 했다.",
      "허리가 뻐근해져서 연습량을 줄였다고 했다.",
      "피팅을 받아본 뒤 아이언 샤프트를 바꿀지 고민한다고 했다.",
      "거래처 캠페인 제안서 마감 때문에 늦게까지 일했다고 했다.",
      "새 골프장 예약은 했지만 비 예보가 있어 취소될 수도 있다고 했다.",
      "양갈비집에서 다음 프로젝트 일정 이야기를 나눴다.",
      "골프 모임 단톡에서 스크린골프 약속을 잡고 있다고 했다.",
      "허리 스트레칭 루틴을 시작했다고 했다.",
      "클라이언트 수정 요청이 많아 일정 관리가 어렵다고 했다.",
      "민경님 생일 선물로 가벼운 가방을 보고 있다고 했다.",
      "스크린골프에서 드라이버가 조금 안정됐다고 했다.",
      "다음 라운딩 결과는 아직 듣지 못했다.",
      "커피 원두를 바꾸니 집에서 마시는 맛이 좋아졌다고 했다.",
      "회사에서 신규 브랜드 론칭을 맡았다고 했다.",
      "골프 장갑 사이즈를 잘못 사서 교환했다고 했다.",
      "휴가를 길게 쓰기는 어려울 것 같다고 했다.",
      "연말 모임은 조용한 식당이 좋겠다고 했다.",
      "오랜만에 안부 카톡을 주고받았다."
    ],
    events: [{ daysOffset: 0, type: "기념일", amountOrGift: "생일", note: "지훈 생일 당일 알림 검수용" }]
  },
  {
    index: 3,
    name: "최서연",
    company: "모닝헬스케어 운영팀",
    category: "친구",
    groups: ["러닝 모임", "대학 동기"],
    avatarEmoji: "🏃",
    avatarBg: "#c8e6f0",
    avatarPreset: "woman",
    remindIntervalDays: 90,
    lastContactDaysAgo: 88,
    medium: "카톡",
    preferences: {
      food: "비건 샐러드, 베이글",
      hobbies: "러닝, 마라톤 기록 관리",
      notes: "하프마라톤 준비 흐름이 있고 완주 결과 기록은 없음"
    },
    summaries: [
      "퇴근 후 한강 러닝을 다시 시작했다고 했다.",
      "5km 페이스가 조금씩 회복되는 중이라고 했다.",
      "러닝화를 바꿨는데 발볼은 편하지만 쿠션감은 아직 애매하다고 했다.",
      "하프마라톤 신청을 고민하고 있다고 했다.",
      "주 3회 러닝 계획을 세웠지만 야근 때문에 한 번 놓쳤다고 했다.",
      "무릎이 살짝 불편해져서 폼롤러를 샀다고 했다.",
      "러닝 모임에서 새벽 러닝을 제안받았다고 했다.",
      "베이글 카페에서 근황을 길게 나눴다.",
      "회사 운영 지표 보고가 많아 눈이 피곤하다고 했다.",
      "하프마라톤 접수는 했고 기록 욕심은 내려놓겠다고 했다.",
      "비 오는 날에는 실내 자전거로 대체한다고 했다.",
      "대학 동기 모임 날짜를 조율 중이라고 했다.",
      "새 러닝 재킷이 생각보다 덥다고 했다.",
      "마라톤 전날 식단을 어떻게 할지 묻고 싶다고 했다.",
      "대회 주간 컨디션을 조심하고 있다고 했다.",
      "대회 이후 이야기는 아직 남기지 않았다.",
      "동네 샐러드집을 추천해줬다.",
      "팀원이 새로 들어와 교육을 맡게 됐다고 했다.",
      "요즘 잠을 조금 더 일찍 자려고 한다고 했다.",
      "짧게 카톡으로 잘 지낸다고 했다."
    ],
    events: [{ daysOffset: -40, type: "기타", amountOrGift: "러닝대회", note: "하프마라톤 접수 이야기를 들음" }]
  },
  {
    index: 4,
    name: "박도윤",
    company: "한빛물류 데이터팀",
    category: "친구",
    groups: ["캠핑 모임", "동네 친구"],
    avatarEmoji: "🏕️",
    avatarBg: "#ead7b7",
    avatarPreset: "man",
    remindIntervalDays: 30,
    lastContactDaysAgo: 3,
    medium: "대면",
    spouseName: "가은",
    children: [{ name: "로아", birthDate: "2023-11-02", ageOrBirth: "2세", memo: "낯가림이 조금 있고 동요를 좋아한다고 함" }],
    preferences: {
      food: "바비큐, 칼국수",
      hobbies: "캠핑, 장비 정리",
      notes: "가을 캠핑장 예약 결과가 아직 없음"
    },
    summaries: [
      "가을 캠핑을 가려고 장비를 다시 점검했다고 했다.",
      "새 텐트 폴대가 무거워서 혼자 치기 어렵다고 했다.",
      "로아가 캠핑장에서 잠을 잘 잘지 걱정된다고 했다.",
      "가은님이 가까운 캠핑장이면 괜찮겠다고 했다고 한다.",
      "캠핑장 예약 오픈 시간을 기다리고 있다고 했다.",
      "회사 데이터 대시보드 개편 업무가 시작됐다고 했다.",
      "예약 시도는 했는데 성공 여부는 아직 이야기하지 않았다.",
      "동네 칼국수집에서 점심을 먹었다.",
      "캠핑용 랜턴 배터리를 새로 샀다고 했다.",
      "로아가 동요를 따라 부르기 시작했다고 했다.",
      "주말에는 장비 창고를 정리했다고 했다.",
      "가은님과 가족사진을 찍을지 이야기 중이라고 했다.",
      "물류 예측 모델 회의가 길어졌다고 했다.",
      "비가 오면 캠핑 대신 키즈카페를 갈 수도 있다고 했다.",
      "새 침낭은 따뜻하지만 부피가 크다고 했다.",
      "캠핑 모임 사람들과 날짜를 맞추는 중이라고 했다.",
      "동네 친구 생일 모임에 잠깐 들렀다고 했다.",
      "로아 감기 기운이 있어 주말 계획을 줄였다고 했다.",
      "바비큐 소스 추천을 해줬다.",
      "최근에는 가족과 쉬는 시간이 가장 좋다고 했다."
    ],
    events: [
      { daysOffset: 28, type: "기념일", amountOrGift: "로아 생일", note: "자녀 생일 알림 검수용" },
      { daysOffset: -210, type: "선물", amountOrGift: "아기 그림책", note: "로아에게 그림책을 선물함" }
    ]
  },
  {
    index: 5,
    name: "정하린",
    company: "푸른어린이집",
    category: "친구",
    groups: ["육아 모임", "동네 친구"],
    avatarEmoji: "🧸",
    avatarBg: "#f4cfd8",
    avatarPreset: "woman",
    remindIntervalDays: 60,
    lastContactDaysAgo: 61,
    medium: "통화",
    spouseName: "태오",
    children: [{ name: "유나", birthDate: "2022-03-09", ageOrBirth: "4세", memo: "어린이집 적응을 앞두고 있음" }],
    preferences: {
      food: "파스타, 과일 디저트",
      hobbies: "아이 사진 정리, 그림책",
      notes: "유나 어린이집 입학 준비 흐름"
    },
    summaries: [
      "유나 어린이집 입학 상담을 예약했다고 했다.",
      "태오님과 등하원 시간을 어떻게 나눌지 이야기 중이라고 했다.",
      "유나가 새 가방을 고르며 신나 했다고 했다.",
      "입학 전 준비물 목록이 생각보다 많다고 했다.",
      "어린이집 첫날에 울지 않을지 걱정된다고 했다.",
      "본인도 어린이집 행사 준비로 일이 바쁘다고 했다.",
      "입학 전 적응 프로그램을 한 번 가보기로 했다고 했다.",
      "파스타를 먹으며 육아 모임 이야기를 나눴다.",
      "유나가 낮잠 시간이 바뀌면 힘들어할까 걱정된다고 했다.",
      "태오님 일정이 바빠져 등원 첫 주가 변수라고 했다.",
      "어린이집 이름표를 주문했다고 했다.",
      "유나가 그림책을 반복해서 읽어달라고 한다고 했다.",
      "입학식 날짜를 확인했지만 이후 결과는 듣지 못했다.",
      "본인 감기가 오래가서 쉬고 싶다고 했다.",
      "동네 친구들과 키즈카페 약속을 조율 중이라고 했다.",
      "준비물 중 실내화를 아직 못 샀다고 했다.",
      "새 반 선생님 인상이 좋아 안심됐다고 했다.",
      "과일 디저트 카페를 추천해줬다.",
      "태오님과 주말에 짧게 산책했다고 했다.",
      "통화로 요즘 정신없지만 잘 버티고 있다고 했다."
    ],
    events: [{ daysOffset: 10, type: "기념일", amountOrGift: "어린이집 입학", note: "유나 어린이집 입학 예정" }]
  },
  {
    index: 6,
    name: "오세진",
    company: "마루초등학교",
    category: "가족",
    groups: ["가족 모임", "육아 모임"],
    avatarEmoji: "🎒",
    avatarBg: "#dbe7ff",
    avatarPreset: "woman",
    remindIntervalDays: 90,
    lastContactDaysAgo: 105,
    medium: "카톡",
    spouseName: "준호",
    children: [
      { name: "민재", birthDate: "2020-01-18", ageOrBirth: "6세", memo: "초등학교 입학 준비 중" },
      { name: "소율", birthDate: "2024-07-02", ageOrBirth: "2세", memo: "밤잠 패턴이 아직 들쑥날쑥함" }
    ],
    preferences: {
      food: "샤브샤브, 따뜻한 차",
      hobbies: "문구류 구경, 가족 앨범",
      notes: "민재 초등학교 입학 준비와 소율 육아 피로가 함께 있음"
    },
    summaries: [
      "민재 초등학교 예비소집 안내를 받았다고 했다.",
      "가방과 필통을 보러 가야 한다고 했다.",
      "소율이가 밤에 자주 깨서 잠이 부족하다고 했다.",
      "준호님이 입학 준비 체크리스트를 만들었다고 했다.",
      "민재가 학교 급식을 기대한다고 했다.",
      "본인은 학부모 모임이 조금 부담스럽다고 했다.",
      "가족 모임에서 입학 축하 이야기가 나왔다.",
      "샤브샤브를 먹으며 아이들 사진을 보여줬다.",
      "소율 예방접종 일정을 확인해야 한다고 했다.",
      "민재 한글 쓰기 연습을 조금씩 하고 있다고 했다.",
      "준호님 출장과 입학 일정이 겹칠까 걱정된다고 했다.",
      "학교 앞 문구점 위치를 알아봤다고 했다.",
      "입학식 옷을 준비해야 한다고 했다.",
      "입학식 이후 적응 이야기는 아직 듣지 못했다.",
      "따뜻한 차를 마시며 잠깐 쉬는 시간이 좋다고 했다.",
      "소율 낮잠이 짧아져 힘들다고 했다.",
      "민재가 친구를 빨리 사귀면 좋겠다고 했다.",
      "가족 앨범을 정리하려고 사진을 골랐다고 했다.",
      "요즘은 짧은 카톡 답장도 늦어진다고 했다.",
      "잘 지내냐는 안부에 조금 피곤하지만 괜찮다고 했다."
    ],
    events: [
      { daysOffset: -70, type: "선물", amountOrGift: "입학 준비 문구 세트", note: "민재 입학 준비 선물" },
      { daysOffset: 45, type: "기념일", amountOrGift: "소율 생일", note: "소율 생일 예정" }
    ]
  },
  {
    index: 7,
    name: "강유진",
    company: "노을디자인",
    category: "친구",
    groups: ["대학 동기", "동네 친구"],
    avatarEmoji: "🍼",
    avatarBg: "#ffe0ce",
    avatarPreset: "woman",
    remindIntervalDays: 30,
    lastContactDaysAgo: 29,
    medium: "메시지",
    spouseName: "현우",
    preferences: {
      food: "쌀국수, 복숭아",
      hobbies: "전시 보기, 필름카메라",
      notes: "배우자 임신 소식은 조심스럽게 다룰 것"
    },
    summaries: [
      "현우님과 임신 소식을 조심스럽게 가족에게 알렸다고 했다.",
      "아직 초기라 주변에는 많이 말하지 않았으면 한다고 했다.",
      "병원 검진 일정이 잡혀 있어 긴장된다고 했다.",
      "입덧 때문에 쌀국수처럼 담백한 음식이 편하다고 했다.",
      "회사에는 안정기가 지나면 알릴 생각이라고 했다.",
      "필름카메라로 일상을 남기고 싶다고 했다.",
      "검진 결과를 기다리는 동안 마음이 오락가락한다고 했다.",
      "대학 동기 모임은 당분간 조용히 참석하고 싶다고 했다.",
      "현우님이 집안일을 많이 도와준다고 했다.",
      "노을디자인 신규 프로젝트가 시작되어 일정이 빡빡하다고 했다.",
      "복숭아가 먹고 싶다고 해서 과일 가게 이야기를 했다.",
      "전시는 당분간 사람이 적은 시간에 가고 싶다고 했다.",
      "다음 검진 이후 이야기는 아직 듣지 못했다.",
      "몸이 피곤해져서 일찍 자려고 한다고 했다.",
      "가족들이 축하해줘서 고맙지만 부담도 있다고 했다.",
      "회사 발표 자료 디자인을 맡았다고 했다.",
      "현우님과 태명 후보를 장난스럽게 이야기했다고 했다.",
      "주말에는 집에서 영화만 봤다고 했다.",
      "필름 현상을 맡겼는데 결과가 기대된다고 했다.",
      "짧게 메시지로 무리하지 않겠다고 했다."
    ],
    events: [{ daysOffset: -14, type: "축의금", amountOrGift: "축하 꽃", note: "임신 소식에 작은 꽃을 보냄" }]
  },
  {
    index: 8,
    name: "문태경",
    company: "오름카페 사장",
    category: "친구",
    groups: ["동네 친구", "대학 동기"],
    avatarEmoji: "🌴",
    avatarBg: "#c8eadf",
    avatarPreset: "man",
    remindIntervalDays: 60,
    lastContactDaysAgo: 63,
    medium: "카톡",
    spouseName: "수빈",
    preferences: {
      food: "흑돼지, 산미 있는 커피",
      hobbies: "여행 계획, 카페 탐방",
      notes: "제주도 여행 예정 이후 결과 기록 없음"
    },
    summaries: [
      "수빈님과 제주도 여행을 계획하고 있다고 했다.",
      "숙소는 서쪽 바다 근처로 보고 있다고 했다.",
      "카페를 운영하다 보니 긴 휴가를 내기 어렵다고 했다.",
      "흑돼지 맛집보다 조용한 카페를 더 기대한다고 했다.",
      "항공권 가격이 올라 날짜를 바꿀지 고민한다고 했다.",
      "가게 신메뉴 테스트로 바닐라 라떼를 조정 중이라고 했다.",
      "제주도 렌터카 예약을 해뒀다고 했다.",
      "여행 전날까지 매장 발주를 챙겨야 한다고 했다.",
      "여행 다녀온 이야기는 아직 남기지 않았다.",
      "동네 친구들과 저녁 약속을 잡았다.",
      "카페 원두 납품사가 바뀔 수도 있다고 했다.",
      "수빈님이 바다보다 숲길을 더 좋아한다고 했다.",
      "비가 오면 여행 코스를 크게 바꿀 계획이라고 했다.",
      "대학 동기 단톡에서 사진을 공유하자고 했다.",
      "신메뉴 이름을 정하지 못해 고민이라고 했다.",
      "가게 알바생 일정 조율이 어렵다고 했다.",
      "조용한 숙소 후기를 찾아보고 있다고 했다.",
      "커피 산미 취향이 점점 강해졌다고 했다.",
      "다음에는 카페 투어 리스트를 보내주겠다고 했다.",
      "카톡으로 곧 정신없어질 것 같다고 했다."
    ],
    events: [{ daysOffset: -6, type: "기타", amountOrGift: "여행 예정", note: "제주 여행 전 안부를 나눔" }]
  },
  {
    index: 9,
    name: "송아람",
    company: "네오핀 해외사업팀",
    category: "회사",
    groups: ["회사 동료", "거래처"],
    avatarEmoji: "✈️",
    avatarBg: "#d8ddf7",
    avatarPreset: "woman",
    remindIntervalDays: 90,
    lastContactDaysAgo: 120,
    medium: "대면",
    preferences: {
      food: "타코, 아이스라떼",
      hobbies: "공항 라운지 후기 읽기, 공연 예매",
      notes: "해외출장 예정 이후 귀국 결과 기록 없음"
    },
    summaries: [
      "싱가포르 해외출장이 잡혔다고 했다.",
      "첫 단독 미팅이라 발표 자료를 여러 번 고치고 있다고 했다.",
      "출장 짐을 최소화하고 싶다고 했다.",
      "현지 파트너와 저녁 식사 일정이 생겼다고 했다.",
      "영어 발표 리허설을 부탁받아 잠깐 도와줬다.",
      "타코를 먹으며 출장 동선 이야기를 했다.",
      "공항 라운지를 처음 이용해볼 예정이라고 했다.",
      "귀국 후 바로 내부 공유회를 해야 한다고 했다.",
      "출장 결과나 공유회 이야기는 아직 듣지 못했다.",
      "팀 내 신규 KPI가 바뀌어 적응 중이라고 했다.",
      "거래처 담당자 교체가 있어 연락 방식이 달라졌다고 했다.",
      "공연 티켓을 예매했는데 출장 일정과 겹칠까 걱정했다.",
      "발표 자료 마지막 장 문구를 고민한다고 했다.",
      "호텔 위치가 미팅 장소와 멀어 택시를 알아봤다고 했다.",
      "출장 전날까지 업무가 밀릴 것 같다고 했다.",
      "아이스라떼를 하루 두 잔 마신다고 했다.",
      "해외사업팀 회의가 길어져 피곤하다고 했다.",
      "귀국 선물은 따로 챙기기 어려울 것 같다고 했다.",
      "다음 달 식사 약속을 잡자고 했다.",
      "대면 회의 후 짧게 안부를 나눴다."
    ],
    events: [{ daysOffset: 17, type: "기타", amountOrGift: "공연 예정", note: "예매한 공연 일정" }]
  },
  {
    index: 10,
    name: "윤지아",
    company: "스튜디오봄 콘텐츠팀",
    category: "친구",
    groups: ["대학 동기"],
    avatarEmoji: "🎭",
    avatarBg: "#efd6f2",
    avatarPreset: "woman",
    remindIntervalDays: 30,
    lastContactDaysAgo: 14,
    medium: "식사",
    preferences: {
      food: "오므라이스, 밀크티",
      hobbies: "공연 관람, 굿즈 모으기",
      notes: "공연 관람 예정과 다음 달 식사 약속이 있음"
    },
    summaries: [
      "좋아하는 배우 공연 티켓을 예매했다고 했다.",
      "좌석이 생각보다 뒤쪽이라 아쉽지만 기대된다고 했다.",
      "공연 전 굿즈 줄이 길까 걱정한다고 했다.",
      "다음 달에 공연 보고 난 뒤 식사하자고 했다.",
      "콘텐츠팀 새 캠페인 촬영 일정이 잡혔다고 했다.",
      "오므라이스집에서 근황을 나눴다.",
      "밀크티 신메뉴를 추천해줬다.",
      "공연 후기를 길게 남기겠다고 했지만 아직 듣지 못했다.",
      "촬영 현장 소품 준비가 생각보다 많다고 했다.",
      "대학 동기 모임은 조용한 곳이면 좋겠다고 했다.",
      "배우 인터뷰 영상을 반복해서 봤다고 했다.",
      "굿즈 예산을 정해두려고 한다고 했다.",
      "팀장이 바뀌어 업무 방식이 조금 달라졌다고 했다.",
      "주말에는 집에서 대본집을 읽었다고 했다.",
      "공연장 근처 맛집을 찾고 있다고 했다.",
      "다음 달 식사 날짜는 아직 확정하지 않았다.",
      "카메라 장비 반납 때문에 늦게 퇴근했다고 했다.",
      "밀크티보다 요즘은 따뜻한 차가 편하다고 했다.",
      "짧게 카톡으로 공연만 기다린다고 했다.",
      "식사 후 산책하며 요즘 생각을 나눴다."
    ],
    events: [{ daysOffset: 21, type: "기념일", amountOrGift: "공연", note: "예매한 공연 예정일" }]
  },
  {
    index: 11,
    name: "한재원",
    company: "루트랩 제품기획팀",
    category: "회사",
    groups: ["회사 동료", "이전 직장"],
    avatarEmoji: "📊",
    avatarBg: "#d8e1cb",
    avatarPreset: "man",
    remindIntervalDays: 60,
    lastContactDaysAgo: 60,
    medium: "대면",
    spouseName: "은채",
    preferences: {
      food: "돈카츠, 콜드브루",
      hobbies: "생산성 앱 비교, 보드게임",
      notes: "새 부서 이동 적응 흐름"
    },
    summaries: [
      "제품기획팀으로 새 부서 이동을 했다고 했다.",
      "기존 개발 조직과 일하는 방식이 달라 적응 중이라고 했다.",
      "첫 로드맵 회의에서 질문을 많이 받았다고 했다.",
      "은채님이 퇴근 후 이야기를 잘 들어준다고 했다.",
      "제품 지표를 새로 공부하고 있다고 했다.",
      "돈카츠를 먹으며 새 팀 분위기를 이야기했다.",
      "이전 직장 동료들과도 가끔 연락한다고 했다.",
      "새 부서에서 맡은 기능 범위가 넓어졌다고 했다.",
      "다음 분기 기획안 초안을 맡았다고 했다.",
      "보드게임 모임은 당분간 쉬어야 할 것 같다고 했다.",
      "팀 온보딩 문서가 부족해 직접 정리하고 있다고 했다.",
      "상사와 1:1 미팅을 앞두고 있다고 했다.",
      "미팅 이후 분위기는 아직 듣지 못했다.",
      "콜드브루를 줄이려고 한다고 했다.",
      "이전 팀과 협업할 때 역할 경계가 애매하다고 했다.",
      "은채님과 짧은 여행을 생각 중이라고 했다.",
      "생산성 앱을 새로 갈아탔다고 했다.",
      "회사 동료들과 점심을 먹으며 조금 편해졌다고 했다.",
      "기획안 피드백이 곧 올 것 같다고 했다.",
      "대면으로 반갑게 인사만 나눴다."
    ],
    events: [{ daysOffset: -30, type: "선물", amountOrGift: "노트", note: "새 부서 이동 응원 선물" }]
  },
  {
    index: 12,
    name: "배수호",
    company: "핀치모바일 백엔드팀",
    category: "회사",
    groups: ["회사 동료", "이전 직장"],
    avatarEmoji: "💼",
    avatarBg: "#cfd9e6",
    avatarPreset: "man",
    remindIntervalDays: 90,
    lastContactDaysAgo: 90,
    medium: "카톡",
    preferences: {
      food: "라멘, 제로콜라",
      hobbies: "기술 블로그 읽기, 키보드",
      notes: "이직 준비와 프로젝트 시작이 함께 있음"
    },
    summaries: [
      "이직 준비를 조심스럽게 시작했다고 했다.",
      "현재 회사에는 아직 말하지 않았고 포트폴리오를 정리 중이라고 했다.",
      "새 결제 프로젝트 백엔드 설계를 맡게 됐다고 했다.",
      "면접 질문을 다시 정리하고 있다고 했다.",
      "라멘집에서 최근 고민을 들었다.",
      "프로젝트 일정이 촉박해 이직 준비 시간이 부족하다고 했다.",
      "키보드 스위치를 바꾸며 스트레스를 푼다고 했다.",
      "기술 블로그 글감을 메모해두고 있다고 했다.",
      "면접을 한 곳 봤지만 결과는 아직 듣지 못했다.",
      "결제 프로젝트 첫 배포 일정이 잡혔다고 했다.",
      "팀 내 코드리뷰 기준을 다시 맞추고 있다고 했다.",
      "제로콜라를 줄이려다 실패했다고 했다.",
      "이전 직장 동료에게 레퍼런스를 부탁할지 고민한다고 했다.",
      "새 회사 후보의 문화가 궁금하다고 했다.",
      "프로젝트 장애 대응 문서를 만들고 있다고 했다.",
      "면접 결과와 배포 결과 모두 아직 기록이 없다.",
      "주말에는 거의 잠만 잤다고 했다.",
      "회사에서는 평소처럼 지내려 한다고 했다.",
      "카톡으로 요즘 정신없다고 했다.",
      "다음에 시간 되면 커피 마시자고 했다."
    ],
    events: [{ daysOffset: -95, type: "기타", amountOrGift: "커피챗", note: "이직 준비 관련 커피챗" }]
  },
  {
    index: 13,
    name: "서나영",
    company: "라임약국",
    category: "지인",
    groups: ["동네 친구"],
    avatarEmoji: "🌿",
    avatarBg: "#e1e9c8",
    avatarPreset: "woman",
    remindIntervalDays: 30,
    lastContactDaysAgo: 45,
    medium: "통화",
    spouseName: "도현",
    preferences: {
      food: "죽, 따뜻한 국물",
      hobbies: "식물 키우기, 산책",
      notes: "건강 이야기는 단정하지 않고 조심스럽게 확인"
    },
    summaries: [
      "최근 병원 검사를 앞두고 있어 마음이 조금 불편하다고 했다.",
      "큰일은 아닐 거라 생각하려 하지만 긴장된다고 했다.",
      "도현님이 병원에 같이 가주기로 했다고 했다.",
      "따뜻한 죽이 속에 편하다고 했다.",
      "검사 전에는 무리하지 않으려고 산책만 한다고 했다.",
      "약국 근무가 길어 다리가 자주 붓는다고 했다.",
      "검사 결과를 기다리는 중이라고 했다.",
      "결과 이야기는 아직 자세히 듣지 못했다.",
      "집에 들인 작은 화분이 잘 자라고 있다고 했다.",
      "도현님과 주말에 가까운 공원을 걸었다고 했다.",
      "건강 관련 검색을 너무 많이 해서 오히려 불안하다고 했다.",
      "동네 친구 모임은 이번 달 쉬기로 했다고 했다.",
      "국물 있는 음식을 먹으니 마음이 놓인다고 했다.",
      "약국 손님이 많아 퇴근 후 말수가 줄었다고 했다.",
      "검사 일정이 바뀔 수도 있다고 했다.",
      "가볍게 안부를 묻는 정도가 좋겠다고 했다.",
      "새 화분 이름을 장난스럽게 붙였다고 했다.",
      "밤에 잠이 얕아졌다고 했다.",
      "통화 끝에 괜찮아지면 밥 먹자고 했다.",
      "최근 소식은 조심스럽게 물어봐야 할 것 같다."
    ],
    events: [{ daysOffset: -20, type: "기타", amountOrGift: "병문안 과일", note: "검사 전 부담 없는 과일을 보냄" }]
  },
  {
    index: 14,
    name: "임건우",
    company: "하버소프트 QA팀",
    category: "친구",
    groups: ["이전 직장"],
    avatarEmoji: "☕",
    avatarBg: "#e8d5c7",
    avatarPreset: "man",
    remindIntervalDays: 60,
    lastContactDaysAgo: 75,
    medium: "카톡",
    preferences: {
      food: "김치찌개, 아메리카노",
      hobbies: "영화 보기, 산책",
      notes: "퇴사 고민과 스트레스는 압박하지 말 것"
    },
    summaries: [
      "회사 스트레스가 커져서 퇴사를 고민한다고 했다.",
      "당장 결정한 것은 아니고 조금 쉬고 싶다는 마음이 크다고 했다.",
      "가족에게는 아직 자세히 말하지 않았다고 했다.",
      "QA 일정이 계속 밀려 야근이 잦다고 했다.",
      "김치찌개를 먹으며 요즘 힘든 이야기를 들었다.",
      "영화를 보려고 해도 집중이 잘 안 된다고 했다.",
      "팀장과 면담을 할지 고민 중이라고 했다.",
      "면담 결과는 아직 듣지 못했다.",
      "주말 산책이 그나마 머리를 비워준다고 했다.",
      "가족 문제도 조금 겹쳐 마음이 복잡하다고 했다.",
      "이전 직장 동료에게 이직 시장을 물어봤다고 했다.",
      "아메리카노를 너무 많이 마셔 잠이 얕다고 했다.",
      "퇴사보다는 휴직이 가능한지 알아보고 싶다고 했다.",
      "카톡 답장이 늦어도 이해해달라고 했다.",
      "회사 테스트 자동화 도입도 맡게 됐다고 했다.",
      "가볍게 걷자는 약속을 잡을지 이야기했다.",
      "가족 이야기는 자세히 파고들지 않는 편이 좋겠다고 느꼈다.",
      "마감 후 조금 쉬고 싶다고 했다.",
      "최근에는 짧은 안부가 더 편하다고 했다.",
      "다음에 조용한 카페에서 보자고 했다."
    ],
    events: [{ daysOffset: -12, type: "기타", amountOrGift: "커피", note: "힘든 시기라 커피를 사며 이야기를 들음" }]
  },
  {
    index: 15,
    name: "장호준",
    company: "세림건축 설계팀",
    category: "지인",
    groups: ["대학 동기", "이전 직장"],
    avatarEmoji: "📐",
    avatarBg: "#ddd2c5",
    avatarPreset: "man",
    remindIntervalDays: 30,
    lastContactDaysAgo: 180,
    medium: "메시지",
    spouseName: "다혜",
    children: [{ name: "이든", birthDate: "2018-09-25", ageOrBirth: "8세", memo: "레고와 만들기를 좋아한다고 함" }],
    preferences: {
      food: "칼국수, 만두",
      hobbies: "건축 전시, 레고",
      notes: "오래 연락하지 못한 사람. 최근 상황을 단정하지 말 것"
    },
    summaries: [
      "새 설계 프로젝트가 시작되어 바쁘다고 했다.",
      "다혜님과 이든이 주말 전시에 같이 가고 싶어 한다고 했다.",
      "이든이 레고 건물을 만드는 데 빠졌다고 했다.",
      "칼국수집에서 짧게 점심을 먹었다.",
      "프로젝트 인허가 일정이 복잡하다고 했다.",
      "대학 동기 모임에는 못 갈 것 같다고 했다.",
      "건축 전시 초대권을 받을 수도 있다고 했다.",
      "전시를 실제로 갔는지는 아직 모른다.",
      "만두 맛집을 추천해줬다.",
      "이든 학교 준비물 이야기를 잠깐 했다.",
      "다혜님이 새 일을 시작할지 고민한다고 했다.",
      "설계팀 야근이 늘었다고 했다.",
      "전 회사 동료와는 가끔 연락한다고 했다.",
      "프로젝트 마감 뒤 보자고 했다.",
      "마감 이후 소식은 남아 있지 않다.",
      "레고 전시를 아이와 같이 가면 좋겠다고 했다.",
      "주말에는 대부분 가족과 보낸다고 했다.",
      "메시지로 바쁘지만 잘 지낸다고 했다.",
      "다음 약속은 구체적으로 잡지 못했다.",
      "이후 6개월 가까이 연락 기록이 없다."
    ],
    events: [{ daysOffset: -180, type: "기념일", amountOrGift: "이든 생일", note: "아이 생일을 축하함" }]
  },
  {
    index: 16,
    name: "홍예린",
    company: "바닐라뮤직 A&R",
    category: "친구",
    groups: ["대학 동기"],
    avatarEmoji: "🎧",
    avatarBg: "#f1d6df",
    avatarPreset: "woman",
    remindIntervalDays: 90,
    lastContactDaysAgo: 250,
    medium: "카톡",
    preferences: {
      food: "마라탕, 요거트",
      hobbies: "플레이리스트 만들기, 공연",
      notes: "매우 오래 연락하지 못함. 최신 근황을 가정하지 말 것"
    },
    summaries: [
      "새 아티스트 쇼케이스 준비로 바쁘다고 했다.",
      "플레이리스트를 계절별로 나눠 만들고 있다고 했다.",
      "마라탕을 먹으며 대학 때 이야기를 했다.",
      "공연장 음향 체크가 길어졌다고 했다.",
      "요거트에 그래놀라를 넣어 먹는다고 했다.",
      "쇼케이스 이후 휴가를 쓰고 싶다고 했다.",
      "휴가를 실제로 갔는지는 기록이 없다.",
      "대학 동기 단톡에 자주 못 들어온다고 했다.",
      "새 음원 발매 일정이 밀릴 수 있다고 했다.",
      "공연 굿즈 디자인을 고르는 데 의견을 줬다고 했다.",
      "밤샘 작업 후 컨디션이 떨어졌다고 했다.",
      "다음에 공연 초대권이 생기면 알려주겠다고 했다.",
      "초대권 여부는 아직 듣지 못했다.",
      "음악 취향이 점점 잔잔한 쪽으로 간다고 했다.",
      "마라탕 맵기는 낮춰 먹는다고 했다.",
      "친구 결혼식에서 잠깐 보기로 했었다.",
      "결혼식 이후 별도 기록은 없다.",
      "카톡 답장이 늦어 미안하다고 했다.",
      "언젠가 조용히 차 마시자고 했다.",
      "이후 오래 연락이 끊겨 최신 정보가 부족하다."
    ],
    events: [{ daysOffset: -250, type: "기념일", amountOrGift: "쇼케이스", note: "쇼케이스 준비 안부를 남김" }]
  },
  {
    index: 17,
    name: "노지민",
    company: "미정",
    category: "지인",
    groups: ["동네 친구"],
    avatarEmoji: "🙂",
    avatarBg: "#e6dacd",
    avatarPreset: "neutral",
    remindIntervalDays: 60,
    lastContactDaysAgo: 28,
    medium: "카톡",
    preferences: {
      food: "",
      hobbies: "",
      notes: "정보 부족형. 저장되지 않은 가족, 취미, 직업을 만들지 말 것"
    },
    summaries: [
      "점심 먹었다고 했다.",
      "잘 지낸다고 했다.",
      "카톡으로 안부만 주고받았다.",
      "회사 일이 바쁘다고 했다.",
      "별다른 근황은 없다고 했다.",
      "주말에 쉬었다고 했다.",
      "식사는 대충 했다고 했다.",
      "요즘 피곤하다고 했다.",
      "날씨 이야기를 했다.",
      "다음에 보자고만 했다.",
      "카톡 답장이 짧았다.",
      "바쁘지만 괜찮다고 했다.",
      "점심 메뉴를 고민한다고 했다.",
      "퇴근이 늦었다고 했다.",
      "별일 없다고 했다.",
      "주말 계획은 없다고 했다.",
      "커피 마셨다고 했다.",
      "회사 바쁘다고 다시 말했다.",
      "잘 지낸다고 했다.",
      "짧게 인사했다."
    ],
    events: [{ daysOffset: -60, type: "기타", amountOrGift: "식사", note: "가벼운 점심" }]
  },
  {
    index: 18,
    name: "신바다",
    company: "프리랜서",
    category: "기타",
    groups: ["동네 친구"],
    avatarEmoji: "💬",
    avatarBg: "#d9e2df",
    avatarPreset: "neutral",
    remindIntervalDays: 90,
    lastContactDaysAgo: 7,
    medium: "메시지",
    preferences: {
      food: "",
      hobbies: "",
      notes: "정보 부족형. 의미 있는 사실을 과장하지 말 것"
    },
    summaries: [
      "카톡함.",
      "잘 지낸다고 함.",
      "점심 먹음.",
      "바쁘다고 함.",
      "별일 없다고 함.",
      "답장이 짧았음.",
      "회사 일이 있다고 함.",
      "주말에 쉬었다고 함.",
      "커피 마심.",
      "안부만 물음.",
      "다음에 보자고 함.",
      "요즘 정신없다고 함.",
      "식사했다고 함.",
      "날씨 얘기함.",
      "퇴근했다고 함.",
      "별다른 이야기는 없었음.",
      "잘 지낸다고 다시 말함.",
      "카톡만 주고받음.",
      "바쁘다고 함.",
      "짧게 마무리함."
    ],
    events: [{ daysOffset: -45, type: "기타", amountOrGift: "가벼운 안부", note: "짧은 메시지만 남긴 정보 부족형 이벤트" }]
  },
  {
    index: 19,
    name: "권민정",
    company: "비오랩 마케팅팀",
    category: "회사",
    groups: ["회사 동료", "러닝 모임", "육아 모임"],
    avatarEmoji: "🌈",
    avatarBg: "#d6e8f2",
    avatarPreset: "woman",
    remindIntervalDays: 30,
    lastContactDaysAgo: 120,
    medium: "식사",
    spouseName: "상우",
    children: [{ name: "서우", birthDate: "2019-12-12", ageOrBirth: "7세", memo: "초등학교 준비와 그림 그리기를 좋아함" }],
    preferences: {
      food: "쌀국수, 딸기 케이크",
      hobbies: "러닝, 가족여행, 마케팅 사례 수집",
      notes: "가족, 회사, 러닝, 여행이 섞인 복합형"
    },
    summaries: [
      "마케팅팀에서 새 제품 론칭 캠페인을 맡았다고 했다.",
      "서우 초등학교 준비도 같이 챙기느라 정신없다고 했다.",
      "상우님과 봄 가족여행지를 고르고 있다고 했다.",
      "러닝 모임은 주 1회만 나가기로 했다고 했다.",
      "쌀국수를 먹으며 캠페인 콘셉트 이야기를 했다.",
      "서우가 그림 그리기에 빠져 가족여행에서도 스케치북을 챙길 거라고 했다.",
      "론칭 촬영 일정이 갑자기 앞당겨졌다고 했다.",
      "러닝 중 발목이 조금 불편해 쉬고 있다고 했다.",
      "가족여행 숙소 후보를 두 곳으로 좁혔다고 했다.",
      "여행을 실제로 다녀왔는지는 아직 기록이 없다.",
      "딸기 케이크를 좋아해서 생일 케이크도 그쪽으로 생각한다고 했다.",
      "상우님 일정 때문에 여행 날짜가 바뀔 수 있다고 했다.",
      "캠페인 1차 성과가 곧 나온다고 했다.",
      "성과 발표 이후 이야기는 아직 듣지 못했다.",
      "육아 모임에서 입학 준비물을 공유받았다고 했다.",
      "러닝화를 새로 사야 할지 고민한다고 했다.",
      "회사 동료들과 회고 미팅을 했다고 했다.",
      "서우가 학교 가는 걸 기대한다고 했다.",
      "다음에는 가족여행 사진을 보여주겠다고 했다.",
      "식사 후 짧게 다음 약속을 이야기했다."
    ],
    events: [
      { daysOffset: -35, type: "기념일", amountOrGift: "서우 생일", note: "서우 생일 축하" },
      { daysOffset: 60, type: "기타", amountOrGift: "가족여행 예정", note: "봄 가족여행 후보 일정" }
    ]
  },
  {
    index: 20,
    name: "차은호",
    company: "에이블교육 세일즈팀",
    category: "회사",
    groups: ["거래처", "골프 모임", "가족 모임"],
    avatarEmoji: "🧭",
    avatarBg: "#e8e0c9",
    avatarPreset: "man",
    remindIntervalDays: 60,
    lastContactDaysAgo: 150,
    medium: "통화",
    spouseName: "미라",
    children: [
      { name: "지우", birthDate: "2017-04-03", ageOrBirth: "9세", memo: "수영을 배우고 있음" },
      { name: "윤우", birthDate: "2021-08-19", ageOrBirth: "5세", memo: "공룡 장난감을 좋아함" }
    ],
    preferences: {
      food: "초밥, 순댓국",
      hobbies: "골프, 아이들과 여행, 교육 트렌드",
      notes: "거래처, 가족, 골프, 여행이 섞인 복합형. 오래 초과 상태"
    },
    summaries: [
      "교육 플랫폼 제휴 제안으로 거래처 미팅이 늘었다고 했다.",
      "미라님과 아이들 방학 여행을 알아보고 있다고 했다.",
      "골프 모임에서 오랜만에 라운딩 날짜를 잡으려 한다고 했다.",
      "지우 수영 발표회 날짜를 확인해야 한다고 했다.",
      "윤우가 공룡 장난감만 찾는다고 웃었다.",
      "초밥집에서 제휴 제안서 피드백 이야기를 했다.",
      "거래처 담당자가 바뀌어 설명을 다시 해야 한다고 했다.",
      "라운딩은 일정 충돌로 미뤄질 수도 있다고 했다.",
      "방학 여행지는 강원도와 부산 중 고민한다고 했다.",
      "여행 결과는 아직 듣지 못했다.",
      "미라님이 아이들 체험형 여행을 선호한다고 했다.",
      "순댓국 맛집을 알려줬다.",
      "제휴 계약 검토가 길어지고 있다고 했다.",
      "계약 성사 여부는 아직 기록이 없다.",
      "지우 발표회 이후 이야기도 아직 없다.",
      "골프 스윙을 다시 잡아야 한다고 했다.",
      "윤우 생일 선물 후보를 공룡 책으로 생각한다고 했다.",
      "거래처와 다음 분기 계획을 이야기했다고 했다.",
      "가족 모임에서 여행 이야기를 꺼냈다고 했다.",
      "이후 몇 달 동안 통화 기록이 없다."
    ],
    events: [
      { daysOffset: -150, type: "기타", amountOrGift: "거래처 식사", note: "제휴 논의 식사" },
      { daysOffset: 35, type: "기념일", amountOrGift: "윤우 생일", note: "윤우 생일 예정" }
    ]
  }
];
