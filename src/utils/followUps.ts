import type { FollowUpItem, Person } from "../types";

export interface FollowUpDraft {
  enabled: boolean;
  text: string;
}

export function getFollowUps(person: Person): FollowUpItem[] {
  return Array.isArray(person.followUps) ? person.followUps : [];
}

export function getPendingFollowUps(person: Person): FollowUpItem[] {
  return getFollowUps(person).filter((item) => item.status === "pending");
}

export function getCompletedFollowUps(person: Person): FollowUpItem[] {
  return getFollowUps(person).filter((item) => item.status === "completed");
}

export function createFollowUp(personId: string, sourceRecordId: string, text: string): FollowUpItem {
  return {
    id: `fu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    personId,
    sourceRecordId,
    text: text.trim(),
    status: "pending",
    createdAt: new Date().toISOString()
  };
}

export function upsertPendingFollowUp(person: Person, sourceRecordId: string, text: string): Person {
  const cleanText = text.trim();
  if (!cleanText) return person;

  const followUps = getFollowUps(person);
  const existingIndex = followUps.findIndex((item) => item.sourceRecordId === sourceRecordId && item.status === "pending");
  if (existingIndex >= 0) {
    return {
      ...person,
      followUps: followUps.map((item, index) => index === existingIndex ? { ...item, text: cleanText } : item)
    };
  }

  return {
    ...person,
    followUps: [createFollowUp(person.id, sourceRecordId, cleanText), ...followUps]
  };
}

export function completeFollowUp(person: Person, followUpId: string, resultRecordId?: string): Person {
  return {
    ...person,
    followUps: getFollowUps(person).map((item) => item.id === followUpId
      ? { ...item, status: "completed", completedAt: new Date().toISOString(), resultRecordId: resultRecordId || item.resultRecordId }
      : item)
  };
}

export function linkFollowUpResult(person: Person, followUpId: string, resultRecordId: string): Person {
  return {
    ...person,
    followUps: getFollowUps(person).map((item) => item.id === followUpId
      ? {
        ...item,
        status: "completed",
        completedAt: item.completedAt || new Date().toISOString(),
        resultRecordId
      }
      : item)
  };
}

export function deleteFollowUp(person: Person, followUpId: string): Person {
  return {
    ...person,
    followUps: getFollowUps(person).filter((item) => item.id !== followUpId)
  };
}

export function deletePendingFollowUpForRecord(person: Person, sourceRecordId: string): Person {
  return {
    ...person,
    followUps: getFollowUps(person).filter((item) => !(item.sourceRecordId === sourceRecordId && item.status === "pending"))
  };
}

export function findPendingFollowUpForRecord(person: Person, recordId: string): FollowUpItem | null {
  return getPendingFollowUps(person).find((item) => item.sourceRecordId === recordId) || null;
}

export function inferFollowUpText(summary: string): string {
  const firstLine = summary
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .find(Boolean) || "";

  return firstLine
    .replace(/(라고|다고)?\s*(했음|함|했다|했어요|했습니다)\.?$/g, "")
    .replace(/(있다고|간다고|가기로|하기로)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}
