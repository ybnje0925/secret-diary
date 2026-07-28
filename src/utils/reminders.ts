import { Person } from "../types";

export interface OverdueContact {
  person: Person;
  daysSinceContact: number;
}

// People whose remindIntervalDays has elapsed since lastContactDate,
// sorted with the longest-overdue contact first.
export function getOverdueContacts(people: Person[]): OverdueContact[] {
  const now = new Date();

  return people
    .filter((p) => typeof p.remindIntervalDays === "number" && p.remindIntervalDays > 0 && p.lastContactDate)
    .map((p) => {
      const last = new Date(p.lastContactDate);
      const daysSinceContact = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      return { person: p, daysSinceContact };
    })
    .filter(({ person, daysSinceContact }) => daysSinceContact >= (person.remindIntervalDays as number))
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);
}
