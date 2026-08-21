import type { User } from "@supabase/supabase-js";
import { CustomGroup, Person } from "../types";
import { VaultData } from "../vault";
import { supabase } from "./supabase";

const migrationVersion = "supabase_v1";

export type MigrationCounts = {
  people: number;
  records: number;
  followUps: number;
  completedFollowUps: number;
};

type DbPerson = {
  id: string;
  owner_user_id: string;
  name: string;
  phone: string;
  company: string;
  category: Person["category"];
  groups: string[];
  family_info: Person["familyInfo"];
  preferences: Person["preferences"];
  events_history: Person["eventsHistory"];
  avatar_emoji: string;
  avatar_bg: string;
  avatar_image_data_url?: string | null;
  avatar_preset?: Person["avatarPreset"] | null;
  last_contact_date?: string | null;
  last_contact_medium: Person["lastContactMedium"];
  remind_interval_days?: number | null;
};

type DbRecord = {
  id: string;
  owner_user_id: string;
  person_id: string;
  date: string;
  medium: Person["lastContactMedium"];
  summary: string;
  raw_transcript?: string | null;
  ai_analysis?: any;
};

type DbFollowUp = {
  id: string;
  owner_user_id: string;
  person_id: string;
  source_record_id?: string | null;
  text: string;
  status: "pending" | "completed";
  created_at: string;
  completed_at?: string | null;
  result_record_id?: string | null;
};

type DbAiSummary = {
  id: string;
  owner_user_id: string;
  person_id: string;
  source_hash: string;
  summary: string;
  tags: any[];
  provider?: "gemini" | "local" | null;
  model?: string | null;
  fallback?: boolean | null;
  generated_at: string;
};

export async function loadCloudVault(): Promise<VaultData> {
  const client = requireClient();
  const [peopleResult, recordsResult, followUpsResult, groupsResult, aiResult] = await Promise.all([
    client.from("people").select("*").order("updated_at", { ascending: false }),
    client.from("records").select("*").order("date", { ascending: false }),
    client.from("follow_ups").select("*").order("created_at", { ascending: false }),
    client.from("custom_groups").select("*").order("created_at", { ascending: true }),
    client.from("ai_summaries").select("*").eq("status", "complete")
  ]);

  assertOk(peopleResult.error);
  assertOk(recordsResult.error);
  assertOk(followUpsResult.error);
  assertOk(groupsResult.error);
  assertOk(aiResult.error);

  const recordsByPerson = groupBy(recordsResult.data || [], (record: DbRecord) => record.person_id);
  const followUpsByPerson = groupBy(followUpsResult.data || [], (item: DbFollowUp) => item.person_id);
  const aiByPerson = new Map((aiResult.data || []).map((item: DbAiSummary) => [item.person_id, item]));

  return {
    people: (peopleResult.data || []).map((person: DbPerson) => toPerson(person, recordsByPerson.get(person.id) || [], followUpsByPerson.get(person.id) || [], aiByPerson.get(person.id))).sort((a, b) => {
      const aDate = a.history[0]?.date || a.lastContactDate || "";
      const bDate = b.history[0]?.date || b.lastContactDate || "";
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    }),
    customGroups: (groupsResult.data || []).map((group: any) => ({ id: group.id, name: group.name }))
  };
}

export async function saveCloudVault(user: User, data: VaultData): Promise<void> {
  const client = requireClient();
  const owner = user.id;
  const peopleRows = data.people.map((person) => toPersonRow(owner, person));
  const recordRows = data.people.flatMap((person) => person.history.map((record) => ({
    id: record.id,
    owner_user_id: owner,
    person_id: person.id,
    date: record.date,
    medium: record.medium,
    summary: record.summary,
    raw_transcript: record.rawTranscript || null,
    ai_analysis: record.aiAnalysis || null,
    updated_at: new Date().toISOString()
  })));
  const followUpRows = data.people.flatMap((person) => (person.followUps || []).map((item) => ({
    id: item.id,
    owner_user_id: owner,
    person_id: person.id,
    source_record_id: item.sourceRecordId || null,
    text: item.text,
    status: item.status,
    created_at: item.createdAt,
    completed_at: item.completedAt || null,
    result_record_id: item.resultRecordId || null,
    updated_at: new Date().toISOString()
  })));
  const aiRows = data.people
    .filter((person) => person.aiBriefing)
    .map((person) => ({
      id: `briefing_${person.id}`,
      owner_user_id: owner,
      person_id: person.id,
      source_hash: person.aiBriefing!.sourceHash,
      summary: person.aiBriefing!.text,
      tags: person.aiBriefing!.tags || [],
      status: "complete",
      provider: person.aiBriefing!.provider || null,
      model: person.aiBriefing!.model || null,
      fallback: person.aiBriefing!.fallback ?? null,
      generated_at: person.aiBriefing!.updatedAt,
      updated_at: new Date().toISOString()
    }));
  const groupRows = data.customGroups.map((group) => ({
    id: group.id,
    owner_user_id: owner,
    name: group.name,
    updated_at: new Date().toISOString()
  }));

  if (peopleRows.length) assertOk((await client.from("people").upsert(peopleRows)).error);
  await deleteMissing("people", owner, data.people.map((person) => person.id));

  if (recordRows.length) assertOk((await client.from("records").upsert(recordRows)).error);
  await deleteMissing("records", owner, recordRows.map((record) => record.id));

  if (followUpRows.length) assertOk((await client.from("follow_ups").upsert(followUpRows)).error);
  await deleteMissing("follow_ups", owner, followUpRows.map((item) => item.id));

  if (aiRows.length) assertOk((await client.from("ai_summaries").upsert(aiRows)).error);
  await deleteMissing("ai_summaries", owner, aiRows.map((item) => item.id));

  if (groupRows.length) assertOk((await client.from("custom_groups").upsert(groupRows)).error);
  await deleteMissing("custom_groups", owner, groupRows.map((group) => group.id));
}

export async function markMigrationComplete(user: User, counts: MigrationCounts): Promise<void> {
  const client = requireClient();
  assertOk((await client.from("migration_status").upsert({
    owner_user_id: user.id,
    migration_version: migrationVersion,
    legacy_people_count: counts.people,
    legacy_records_count: counts.records,
    legacy_follow_ups_count: counts.followUps,
    completed_at: new Date().toISOString()
  })).error);
}

export async function hasCompletedMigration(): Promise<boolean> {
  const client = requireClient();
  const result = await client.from("migration_status").select("migration_version").eq("migration_version", migrationVersion).maybeSingle();
  assertOk(result.error);
  return Boolean(result.data);
}

export function countVaultData(data: VaultData): MigrationCounts {
  const followUps = data.people.flatMap((person) => person.followUps || []);
  return {
    people: data.people.length,
    records: data.people.reduce((count, person) => count + person.history.length, 0),
    followUps: followUps.filter((item) => item.status === "pending").length,
    completedFollowUps: followUps.filter((item) => item.status === "completed").length
  };
}

function requireClient() {
  if (!supabase) throw new Error("Supabase environment variables are not configured.");
  return supabase;
}

function assertOk(error: any) {
  if (error) throw new Error(error.message || "Supabase request failed.");
}

async function deleteMissing(table: string, owner: string, ids: string[]) {
  const client = requireClient();
  let query = client.from(table).delete().eq("owner_user_id", owner);
  if (ids.length) query = query.not("id", "in", `(${ids.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",")})`);
  assertOk((await query).error);
}

function toPersonRow(owner: string, person: Person): DbPerson & { updated_at: string } {
  return {
    id: person.id,
    owner_user_id: owner,
    name: person.name,
    phone: person.phone || "",
    company: person.company || "",
    category: person.category,
    groups: person.groups || [],
    family_info: person.familyInfo || { children: [] },
    preferences: person.preferences || { food: "", hobbies: "", notes: "" },
    events_history: person.eventsHistory || [],
    avatar_emoji: person.avatarEmoji || "🙂",
    avatar_bg: person.avatarBg || "bg-[#f3dfd1]",
    avatar_image_data_url: person.avatarImageDataUrl || null,
    avatar_preset: person.avatarPreset || null,
    last_contact_date: person.lastContactDate || null,
    last_contact_medium: person.lastContactMedium || "기타",
    remind_interval_days: person.remindIntervalDays || null,
    updated_at: new Date().toISOString()
  };
}

function toPerson(person: DbPerson, records: DbRecord[], followUps: DbFollowUp[], ai?: DbAiSummary): Person {
  return {
    id: person.id,
    name: person.name,
    phone: person.phone || "",
    company: person.company || "",
    category: person.category || "지인",
    groups: person.groups || [],
    familyInfo: person.family_info || { children: [] },
    preferences: person.preferences || { food: "", hobbies: "", notes: "" },
    eventsHistory: person.events_history || [],
    avatarEmoji: person.avatar_emoji || "🙂",
    avatarBg: person.avatar_bg || "bg-[#f3dfd1]",
    avatarImageDataUrl: person.avatar_image_data_url || undefined,
    avatarPreset: person.avatar_preset || undefined,
    lastContactDate: person.last_contact_date || "",
    lastContactMedium: person.last_contact_medium || "기타",
    remindIntervalDays: person.remind_interval_days || undefined,
    history: records.map((record) => ({
      id: record.id,
      date: record.date,
      medium: record.medium,
      summary: record.summary,
      rawTranscript: record.raw_transcript || undefined,
      aiAnalysis: record.ai_analysis || undefined
    })),
    followUps: followUps.map((item) => ({
      id: item.id,
      personId: item.person_id,
      sourceRecordId: item.source_record_id || "",
      text: item.text,
      status: item.status,
      createdAt: item.created_at,
      completedAt: item.completed_at || undefined,
      resultRecordId: item.result_record_id || undefined
    })),
    aiBriefing: ai ? {
      sourceHash: ai.source_hash,
      text: ai.summary,
      tags: ai.tags || [],
      updatedAt: ai.generated_at,
      provider: ai.provider || undefined,
      model: ai.model || undefined,
      fallback: ai.fallback ?? undefined
    } : undefined
  };
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    map.set(key, [...(map.get(key) || []), item]);
  });
  return map;
}

