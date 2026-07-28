export type CategoryType = '가족' | '친구' | '지인' | '회사-업무' | '회사-동료' | '외부 기타';

export interface ChildInfo {
  name: string;
  birthDate?: string; // 'YYYY-MM-DD' — when present, age is auto-calculated
  ageOrBirth: string; // free-text fallback (e.g. "초교 1학년") shown when birthDate is absent
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
  rawTranscript?: string;
}

export interface Preferences {
  food: string; // 좋아하는/못 먹는 음식
  hobbies: string; // 취미
  notes: string; // 그 외 특이사항
}

export type EventType = '축의금' | '조의금' | '선물' | '기타';

export interface EventHistoryItem {
  id: string;
  date: string; // 'YYYY-MM-DD'
  type: EventType;
  amountOrGift: string;
  note: string;
}

export interface Person {
  id: string;
  name: string;
  phone: string;
  company: string;
  category: CategoryType;
  groups: string[]; // Custom groups
  familyInfo: FamilyInfo;
  preferences: Preferences;
  eventsHistory: EventHistoryItem[];
  avatarEmoji: string;
  avatarBg: string;
  lastContactDate: string; // 'YYYY-MM-DD'
  lastContactMedium: '통화' | '카톡' | '식사' | '대면' | '기타';
  remindIntervalDays?: number; // e.g. 30/60/90 — unset means no reminder tracking
  history: InteractionHistory[];
}

export interface CustomGroup {
  id: string;
  name: string;
}
