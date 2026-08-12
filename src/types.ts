export type CategoryType =
  | "가족"
  | "친구"
  | "지인"
  | "회사"
  | "그룹"
  | "기타"
  | "회사-업무"
  | "회사-동료"
  | "외부 기타";

export type ContactMedium = "통화" | "카톡" | "식사" | "대면" | "메시지" | "기타";

export interface ChildInfo {
  name: string;
  birthDate?: string;
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
  medium: ContactMedium;
  summary: string;
  rawTranscript?: string;
}

export interface Preferences {
  food: string;
  hobbies: string;
  notes: string;
}

export type EventType = "축의금" | "조의금" | "선물" | "기념일" | "기타";

export interface EventHistoryItem {
  id: string;
  date: string;
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
  groups: string[];
  familyInfo: FamilyInfo;
  preferences: Preferences;
  eventsHistory: EventHistoryItem[];
  avatarEmoji: string;
  avatarBg: string;
  avatarImageDataUrl?: string;
  avatarPreset?: "man" | "woman" | "neutral" | "plant" | "heart";
  lastContactDate: string;
  lastContactMedium: ContactMedium;
  remindIntervalDays?: number;
  history: InteractionHistory[];
}

export interface CustomGroup {
  id: string;
  name: string;
}
