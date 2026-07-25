export type CategoryType = '가족' | '친구' | '지인' | '회사-업무' | '회사-동료' | '외부 기타';

export interface ChildInfo {
  name: string;
  ageOrBirth: string;
  memo: string;
}

export interface FamilyInfo {
  spouseName?: string;
  children: ChildInfo[];
}

export interface InteractionHistory {
  id: string;
  date: string;
  medium: '통화' | '카톡' | '식사' | '대면' | '기타';
  summary: string; // 3줄 요약
  rawTranscript?: string; // 오디오 녹음 분석 결과 등
}

export interface Person {
  id: string;
  name: string;
  phone: string;
  company: string;
  category: CategoryType;
  groups: string[]; // Custom groups
  familyInfo: FamilyInfo;
  memo: string; // 취미, 식성, 좋아하는 것 등 자유 텍스트
  avatarEmoji: string; // Adorable illustration emoji representation
  avatarBg: string; // Hex color or Tailwind pastel background class
  lastContactDate: string; // 'YYYY-MM-DD'
  lastContactMedium: '통화' | '카톡' | '식사' | '대면' | '기타';
  history: InteractionHistory[];
}

export interface CustomGroup {
  id: string;
  name: string;
}
