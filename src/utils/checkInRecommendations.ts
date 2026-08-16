import type { Person } from "../types";
import { daysSince, formatDateKo, normalizeMemoryText } from "./saramdam";

export type CheckInSourceType = "history" | "memory" | "family" | "preference" | "event";
export type CheckInSensitivity = "normal" | "sensitive";

export interface CheckInMemoryCandidate {
  id: string;
  text: string;
  sourceType: CheckInSourceType;
  sourceDate?: string;
  source: string;
  category: string;
  sensitivity: CheckInSensitivity;
  recencyScore: number;
  followUpScore: number;
  repetitionScore: number;
  finalScore: number;
}

export interface CheckInRecommendationTopic {
  id: string;
  icon: string;
  topic: string;
  reason: string;
  source: string;
  sensitivity: CheckInSensitivity;
  suggestedQuestion: string;
  candidateId?: string;
}

const sensitivePattern = /건강|질병|수술|아프|통증|병원|입원|검사|약|치료|가족 문제|사망|장례|부고|금전|돈|빚|갈등|싸움|퇴사|이직|스트레스|우울|불안|힘들|걱정|사고|이혼|실직/;
const followUpPattern = /예정|계획|준비|시작|시작했|시작함|배우|입학|입사|이직|퇴사|프로젝트|마감|발표|시험|면접|여행|제주|이사|결혼|출산|수술|병원|검사|어린이집|유치원|학교|적응|하기로|간다고|가기로|만나기로|다음 달|다음 주|이번 달|이번 주/;
const weakPattern = /좋아함|좋아해|관심|취미|맛집|커피|음식|운동/;
const stopWords = new Set(["오늘", "요즘", "최근", "지난번", "다음", "이번", "정도", "이야기", "기록", "사람", "관련", "준비", "시작", "계획"]);

export function buildCheckInCandidates(person: Person, now = new Date()): CheckInMemoryCandidate[] {
  const raw = collectRawCandidates(person, now);
  const tokenCounts = buildTokenCounts(raw.map((candidate) => candidate.text));

  return raw
    .map((candidate) => {
      const repetitionScore = getRepetitionScore(candidate.text, tokenCounts);
      const finalScore = Number((
        candidate.followUpScore * 0.42 +
        candidate.recencyScore * 0.28 +
        repetitionScore * 0.18 +
        getSpecificityScore(candidate.text) * 0.12 -
        getWeaknessPenalty(candidate)
      ).toFixed(3));
      return { ...candidate, repetitionScore, finalScore };
    })
    .filter((candidate) => candidate.finalScore >= 0.3 || candidate.followUpScore >= 0.75 || candidate.repetitionScore >= 0.55)
    .sort((a, b) => b.finalScore - a.finalScore);
}

export function buildCheckInTopics(person: Person, now = new Date(), limit = 4): CheckInRecommendationTopic[] {
  const selected: CheckInMemoryCandidate[] = [];
  const seen = new Set<string>();

  for (const candidate of buildCheckInCandidates(person, now)) {
    const key = normalizeForDedupe(candidate.text);
    if (!key || seen.has(key)) continue;
    if (selected.some((item) => areSimilar(item.text, candidate.text))) continue;
    selected.push(candidate);
    seen.add(key);
    if (selected.length >= limit) break;
  }

  return selected.map((candidate) => candidateToTopic(person, candidate));
}

export function buildLocalStarters(person: Person, topic: CheckInRecommendationTopic, tone: "casual" | "polite" | "short") {
  const respectful = String(person.category || "").includes("회사");
  const sensitive = topic.sensitivity === "sensitive";
  const naturalQuestion = stripOuterQuotes(topic.suggestedQuestion);

  if (tone === "short") {
    return {
      natural: sensitive ? "오랜만이야. 문득 생각나서 연락했어. 요즘은 좀 어때?" : `오랜만이야! ${topic.topic} 생각나서 연락했어. 잘 지내?`,
      friendly: `${person.name}아 잘 지내? 문득 생각나서 연락했어.`,
      polite: "오랜만이에요. 잘 지내고 계신가요?"
    };
  }

  if (tone === "polite" || respectful) {
    return {
      natural: sensitive ? "오랜만이에요. 지난번에 이야기하셨던 일이 생각났어요. 요즘은 좀 괜찮으세요?" : `오랜만이에요. 지난번에 ${topic.topic} 이야기가 생각났어요. 요즘은 어떠세요?`,
      friendly: sensitive ? `${person.name}님, 지난번 이야기가 생각나서요. 요즘은 조금 괜찮으세요?` : `${person.name}님, ${topic.topic} 이야기가 생각났는데 요즘은 어떠세요?`,
      polite: sensitive ? "오랜만이에요. 부담스럽지 않게 안부만 여쭤보고 싶었어요. 요즘은 조금 괜찮으신가요?" : `오랜만이에요. ${topic.topic} 이야기가 문득 생각났어요. 요즘은 어떠신가요?`
    };
  }

  return {
    natural: sensitive ? "오랜만이야. 지난번에 말했던 게 생각나서 연락했어. 요즘은 좀 괜찮아?" : `오랜만이야! 지난번에 ${topic.topic} 얘기했던 거 생각났어. ${naturalQuestion}`,
    friendly: sensitive ? `${person.name}아 문득 생각나서 연락했어. 요즘은 좀 괜찮아?` : `${person.name}아 갑자기 네 생각나서 ㅋㅋ ${naturalQuestion}`,
    polite: sensitive ? "오랜만이에요. 지난번에 이야기하셨던 일이 문득 생각났어요. 요즘은 조금 괜찮으신가요?" : `오랜만이에요. 지난번에 ${topic.topic} 이야기가 생각났어요. 요즘은 어떠세요?`
  };
}

function collectRawCandidates(person: Person, now: Date): CheckInMemoryCandidate[] {
  const candidates: CheckInMemoryCandidate[] = [];

  person.history.forEach((history, index) => {
    splitMemoryLines(history.summary).forEach((line, lineIndex) => {
      candidates.push(createCandidate({
        id: `history-${index}-${lineIndex}`,
        text: line,
        sourceType: "history",
        sourceDate: history.date,
        source: `${formatDateKo(history.date)} 이야기에서`,
        category: detectCategory(line),
        now
      }));
    });
  });

  splitMemoryLines(person.preferences.notes).forEach((line, index) => {
    candidates.push(createCandidate({
      id: `memory-${index}`,
      text: line,
      sourceType: "memory",
      source: "기억 메모에서",
      category: detectCategory(line),
      now
    }));
  });

  if (person.preferences.hobbies) {
    candidates.push(createCandidate({
      id: "preference-hobbies",
      text: person.preferences.hobbies,
      sourceType: "preference",
      source: "취향 정보에서",
      category: "interest",
      now
    }));
  }

  if (person.preferences.food) {
    candidates.push(createCandidate({
      id: "preference-food",
      text: person.preferences.food,
      sourceType: "preference",
      source: "취향 정보에서",
      category: "food",
      now
    }));
  }

  person.familyInfo.children.forEach((child, index) => {
    const text = [child.name, child.ageOrBirth, child.memo].filter(Boolean).join(" · ");
    if (!text.trim()) return;
    candidates.push(createCandidate({
      id: `family-child-${index}`,
      text,
      sourceType: "family",
      source: "가족 정보에서",
      category: "family",
      now
    }));
  });

  person.eventsHistory.forEach((event, index) => {
    const text = [event.type, event.amountOrGift, event.note].filter(Boolean).join(" · ");
    if (!text.trim()) return;
    candidates.push(createCandidate({
      id: `event-${index}`,
      text,
      sourceType: "event",
      sourceDate: event.date,
      source: `${formatDateKo(event.date)} 함께한 마음에서`,
      category: "event",
      now
    }));
  });

  return candidates.filter((candidate) => candidate.text.length >= 4);
}

function createCandidate({
  id,
  text,
  sourceType,
  sourceDate,
  source,
  category,
  now
}: {
  id: string;
  text: string;
  sourceType: CheckInSourceType;
  sourceDate?: string;
  source: string;
  category: string;
  now: Date;
}): CheckInMemoryCandidate {
  const cleanText = compactText(text);
  const sensitivity = sensitivePattern.test(cleanText) ? "sensitive" : "normal";
  return {
    id,
    text: cleanText,
    sourceType,
    sourceDate,
    source,
    category,
    sensitivity,
    recencyScore: getRecencyScore(sourceDate, now),
    followUpScore: getFollowUpScore(cleanText, sourceType),
    repetitionScore: 0,
    finalScore: 0
  };
}

function candidateToTopic(person: Person, candidate: CheckInMemoryCandidate): CheckInRecommendationTopic {
  return {
    id: `rec-${candidate.id}`,
    icon: pickCheckInIcon(candidate.text),
    topic: makeTopicTitle(candidate.text),
    reason: makeReason(candidate),
    source: candidate.source,
    sensitivity: candidate.sensitivity,
    suggestedQuestion: makeSuggestedQuestion(person, candidate),
    candidateId: candidate.id
  };
}

function makeReason(candidate: CheckInMemoryCandidate) {
  const fact = cleanFact(candidate.text);
  if (candidate.sensitivity === "sensitive") {
    return `지난번에 조심스럽게 안부를 전하면 좋을 이야기가 있었어요.`;
  }
  if (candidate.sourceType === "history") return `지난번에 ${makeFactSentence(fact)}`;
  if (candidate.sourceType === "family") return `가족 정보에 ${fact}라고 담겨 있어요.`;
  if (candidate.sourceType === "preference") return `${fact}에 관심이 있다고 기록되어 있어요.`;
  if (candidate.sourceType === "event") return `함께한 마음 기록에 ${fact}라고 남아 있어요.`;
  return `${fact}라고 기억해두었어요.`;
}

function makeSuggestedQuestion(person: Person, candidate: CheckInMemoryCandidate) {
  const target = extractTopicKeyword(candidate.text);
  if (candidate.sensitivity === "sensitive") {
    return "지난번에 신경 쓰이는 일이 있다고 했는데, 요즘은 좀 괜찮은지 조심스럽게 물어봐도 좋아요.";
  }
  if (/여행|제주/.test(candidate.text)) return "제주도 여행은 잘 다녀왔는지 자연스럽게 물어보세요.";
  if (/어린이집|유치원|학교|입학|적응/.test(candidate.text)) return "어린이집이나 새 환경에는 잘 적응하고 있는지 물어보세요.";
  if (/프로젝트|업무|마감|발표/.test(candidate.text)) return "새 프로젝트나 요즘 일은 잘 시작됐는지 가볍게 물어보세요.";
  if (/골프/.test(candidate.text)) return "골프는 요즘도 계속하고 있는지 물어보세요.";
  if (/테니스|운동|러닝|필라테스/.test(candidate.text)) return "운동은 요즘도 계속하고 있는지 물어보세요.";
  if (/카페|커피|음식|맛집|라떼|샐러드/.test(candidate.text)) return `요즘도 ${extractTopicKeyword(candidate.text)} 좋아하는지 가볍게 물어보세요.`;
  return `${person.name}님에게 지난번 이야기했던 ${target}은 요즘 어떤지 물어보세요.`;
}

function getFollowUpScore(text: string, sourceType: CheckInSourceType) {
  if (followUpPattern.test(text)) return 0.95;
  if (sourceType === "history" && weakPattern.test(text)) return 0.55;
  if (sourceType === "preference") return 0.35;
  return 0.45;
}

function getRecencyScore(sourceDate: string | undefined, now: Date) {
  if (!sourceDate) return 0.34;
  const diff = Math.max(0, Math.floor((now.getTime() - new Date(`${sourceDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)));
  if (!Number.isFinite(diff)) return 0.34;
  if (diff <= 30) return 1;
  if (diff <= 90) return 0.82;
  if (diff <= 180) return 0.6;
  if (diff <= 365) return 0.36;
  return 0.16;
}

function getRepetitionScore(text: string, tokenCounts: Map<string, number>) {
  const tokens = extractTokens(text);
  if (!tokens.length) return 0;
  const repeated = tokens.filter((token) => (tokenCounts.get(token) || 0) >= 2).length;
  return Math.min(1, repeated / Math.max(2, tokens.length));
}

function getSpecificityScore(text: string) {
  if (text.length < 8) return 0.1;
  let score = 0.3;
  if (/[0-9]|월|주|날|제주|어린이집|유치원|프로젝트|골프|여행/.test(text)) score += 0.35;
  if (text.length >= 16) score += 0.2;
  if (text.length >= 32) score += 0.15;
  return Math.min(1, score);
}

function getWeaknessPenalty(candidate: CheckInMemoryCandidate) {
  let penalty = 0;
  if (candidate.sourceType === "preference" && !followUpPattern.test(candidate.text)) penalty += 0.18;
  if (candidate.text.length < 8) penalty += 0.18;
  if (!candidate.sourceDate && candidate.sourceType !== "family") penalty += 0.06;
  return penalty;
}

function splitMemoryLines(text: string | undefined) {
  return String(text || "")
    .split(/\n|(?<=[.!?。])\s+/)
    .map((line) => compactText(line.replace(/^\d+\.\s*/, "")))
    .filter(Boolean)
    .slice(0, 12);
}

function compactText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function buildTokenCounts(texts: string[]) {
  const counts = new Map<string, number>();
  texts.forEach((text) => {
    Array.from(new Set(extractTokens(text))).forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
  });
  return counts;
}

function extractTokens(text: string) {
  const compact = text.toLowerCase().replace(/[.,!?'"“”·]/g, " ");
  const tokens = compact.match(/[가-힣a-zA-Z0-9]{2,}/g) || [];
  const keywordTokens = [
    /제주/.test(text) ? "제주" : "",
    /여행/.test(text) ? "여행" : "",
    /골프/.test(text) ? "골프" : "",
    /어린이집/.test(text) ? "어린이집" : "",
    /유치원/.test(text) ? "유치원" : "",
    /프로젝트/.test(text) ? "프로젝트" : "",
    /병원|검사|수술|건강/.test(text) ? "건강" : ""
  ].filter(Boolean);
  return Array.from(new Set([...tokens, ...keywordTokens])).filter((token) => token.length >= 2 && !stopWords.has(token)).slice(0, 12);
}

function normalizeForDedupe(text: string) {
  if (/제주|여행/.test(text)) return "plan:travel";
  if (/골프/.test(text)) return "interest:golf";
  if (/어린이집|유치원|입학|적응/.test(text)) return "family:school";
  if (/프로젝트/.test(text)) return "work:project";
  if (/병원|검사|수술|건강/.test(text)) return "sensitive:health";
  return extractTokens(text).slice(0, 4).join(":");
}

function areSimilar(a: string, b: string) {
  const aTokens = new Set(extractTokens(a));
  const bTokens = extractTokens(b);
  if (!aTokens.size || !bTokens.length) return false;
  const overlap = bTokens.filter((token) => aTokens.has(token)).length;
  return overlap >= Math.min(2, Math.ceil(Math.min(aTokens.size, bTokens.length) * 0.6));
}

function detectCategory(text: string) {
  if (/가족|딸|아들|아내|남편|아이|어린이집|유치원|학교/.test(text)) return "family";
  if (/회사|업무|직장|이직|퇴사|프로젝트/.test(text)) return "work";
  if (/여행|제주|만나|약속|다음/.test(text)) return "plan";
  if (/골프|테니스|운동|커피|카페|맛집|음식/.test(text)) return "interest";
  if (sensitivePattern.test(text)) return "sensitive";
  return "general";
}

function pickCheckInIcon(text: string) {
  if (/커피|카페|핸드드립|라떼/.test(text)) return "☕";
  if (/테니스|운동|축구|골프|필라테스|러닝/.test(text)) return "🎾";
  if (/가족|딸|아들|아내|남편|아이|어린이집|유치원|학교/.test(text)) return "👧";
  if (/회사|업무|직장|이직|퇴사|프로젝트/.test(text)) return "💼";
  if (/여행|제주|부산|일본|캠핑/.test(text)) return "✈️";
  if (sensitivePattern.test(text)) return "❤️";
  return "🤚";
}

function makeTopicTitle(text: string) {
  if (/제주/.test(text)) return "제주도 여행";
  if (/여행/.test(text)) return "여행 이야기";
  if (/어린이집/.test(text)) return "어린이집 이야기";
  if (/유치원/.test(text)) return "유치원 이야기";
  if (/골프/.test(text)) return "골프 이야기";
  if (/테니스|운동/.test(text)) return "운동 이야기";
  if (/프로젝트/.test(text)) return "새 프로젝트";
  if (/회사|업무|직장/.test(text)) return "요즘 일";
  if (/커피|카페/.test(text)) return "커피 이야기";
  const keyword = extractTopicKeyword(text);
  return keyword.length > 14 ? `${keyword.slice(0, 14)}...` : keyword;
}

function extractTopicKeyword(text: string) {
  const firstPhrase = compactText(text)
    .replace(/^(오늘|지난번에|최근|요즘)\s*/, "")
    .split(/[,.。]/)[0]
    .replace(/(라고|다고|함|했어요|했습니다|한다고|간다고).*$/, "")
    .trim();
  if (firstPhrase.length >= 3) return firstPhrase.length > 24 ? `${firstPhrase.slice(0, 24)}...` : firstPhrase;
  const tokens = extractTokens(text);
  return tokens[0] || "그 이야기";
}

function cleanFact(text: string) {
  return compactText(text)
    .replace(/[.。]+$/g, "")
    .replace(/(라고\s*)?함$/g, "")
    .replace(/(라고\s*)?했어요$/g, "")
    .trim();
}

function makeFactSentence(fact: string) {
  if (/다고$/.test(fact)) return `${fact} 했어요.`;
  if (/예정$/.test(fact)) return `${fact}이라고 했어요.`;
  if (/시작$/.test(fact)) return `${fact}했다고 했어요.`;
  return `${fact}라고 했어요.`;
}

function stripOuterQuotes(text: string) {
  return text.replace(/^["“”']|["“”']$/g, "").trim();
}
