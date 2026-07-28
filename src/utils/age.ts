// Formats a birth date as a Korean "만 나이" (years + months) string.
export function calculateAge(birthDate: string): string | null {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return null;

  return months > 0 ? `만 ${years}세 ${months}개월` : `만 ${years}세`;
}
