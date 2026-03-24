import type { Post } from "@/hooks/usePosts";

export type PeriodPreset = "month" | "3months" | "6months" | "1year";
export type RitmoPreset = "15days" | "30days" | "3months" | "6months" | "1year";
export type AccountFilter = "total" | string;

export function getStartDate(preset: PeriodPreset): Date {
  const now = new Date();
  switch (preset) {
    case "month": return new Date(now.getFullYear(), now.getMonth(), 1);
    case "3months": { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    case "6months": { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
    case "1year": { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
  }
}

export function getRitmoRange(preset: RitmoPreset): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(endDate);
  switch (preset) {
    case "15days": startDate.setDate(startDate.getDate() - 14); break;
    case "30days": startDate.setDate(startDate.getDate() - 29); break;
    case "3months": startDate.setMonth(startDate.getMonth() - 3); break;
    case "6months": startDate.setMonth(startDate.getMonth() - 6); break;
    case "1year": startDate.setFullYear(startDate.getFullYear() - 1); break;
  }
  return { startDate, endDate };
}

export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function countDaysInRange(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export function getActiveDaysSet(posts: Post[], startDate: Date, endDate: Date): Set<string> {
  const startKey = toDayKey(startDate);
  const endKey = toDayKey(endDate);
  const set = new Set<string>();
  posts.forEach((p) => {
    if (p.status.toLowerCase().includes("publicad") && p.data_postagem >= startKey && p.data_postagem <= endKey) {
      set.add(p.data_postagem);
    }
  });
  return set;
}

export function getInactiveDaysCount(startDate: Date, endDate: Date, activeDaysSet: Set<string>): number {
  return countDaysInRange(startDate, endDate) - activeDaysSet.size;
}

export function getDaysSinceLastActivity(posts: Post[]): { inactiveDays: number; lastActiveLabel: string } {
  let lastKey = "";
  posts.forEach((p) => {
    if (p.status.toLowerCase().includes("publicad") && p.data_postagem > lastKey) lastKey = p.data_postagem;
  });
  if (!lastKey) return { inactiveDays: 0, lastActiveLabel: "-" };
  const today = new Date();
  const todayKey = toDayKey(today);
  const todayStart = new Date(todayKey + "T00:00:00");
  const lastStart = new Date(lastKey + "T00:00:00");
  const diff = Math.floor((todayStart.getTime() - lastStart.getTime()) / (24 * 60 * 60 * 1000));
  const inactiveDays = Math.max(0, diff - 1);
  const d = lastStart;
  const lastActiveLabel = `${d.getDate()}/${d.getMonth() + 1}`;
  return { inactiveDays, lastActiveLabel };
}

export function getInactiveCardStyles(inactiveDays: number): { bg: string; border: string; text: string } {
  if (inactiveDays <= 5) return { bg: "", border: "", text: "" };
  if (inactiveDays <= 10) return { bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-300 dark:border-yellow-700", text: "text-yellow-900 dark:text-yellow-100" };
  if (inactiveDays <= 15) return { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-400 dark:border-amber-700", text: "text-amber-900 dark:text-amber-100" };
  if (inactiveDays <= 20) return { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-400 dark:border-orange-700", text: "text-orange-900 dark:text-orange-100" };
  if (inactiveDays <= 25) return { bg: "bg-orange-100 dark:bg-orange-950/50", border: "border-orange-500 dark:border-orange-600", text: "text-orange-950 dark:text-orange-100" };
  if (inactiveDays <= 29) return { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-400 dark:border-red-700", text: "text-red-900 dark:text-red-100" };
  return { bg: "bg-red-100 dark:bg-red-950/50", border: "border-red-500 dark:border-red-600", text: "text-white dark:text-red-100" };
}

export function filterByPeriod(posts: Post[], preset: PeriodPreset): Post[] {
  const start = getStartDate(preset);
  return posts.filter((p) => new Date(p.data_postagem + "T00:00:00") >= start);
}

export function filterByAccount(posts: Post[], account: AccountFilter): Post[] {
  if (account === "total") return posts;
  return posts.filter((p) => p.local === account);
}

export function countByStatus(posts: Post[]): Record<string, number> {
  const counts: Record<string, number> = {};
  posts.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
  return counts;
}

export function countByType(posts: Post[]): Record<string, number> {
  const counts: Record<string, number> = {};
  posts.forEach((p) => { counts[p.tipo_conteudo] = (counts[p.tipo_conteudo] || 0) + 1; });
  return counts;
}

export function countByAccount(posts: Post[]): Record<string, number> {
  const counts: Record<string, number> = {};
  posts.forEach((p) => { counts[p.local] = (counts[p.local] || 0) + 1; });
  return counts;
}

export function postsPerWeek(publishedPosts: Post[], preset: PeriodPreset, sinceDate?: Date): { avg: number; bestWeek: number; bestWeekLabel: string } {
  if (publishedPosts.length === 0) return { avg: 0, bestWeek: 0, bestWeekLabel: "-" };
  const presetStart = getStartDate(preset);
  const start = sinceDate && sinceDate > presetStart ? sinceDate : presetStart;
  const now = new Date();
  const totalWeeks = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  const weekMap = new Map<string, number>();
  publishedPosts.forEach((p) => {
    const d = new Date(p.data_postagem + "T00:00:00");
    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weekMap.set(key, (weekMap.get(key) || 0) + 1);
  });
  let bestWeek = 0;
  let bestWeekLabel = "-";
  weekMap.forEach((count, key) => {
    if (count > bestWeek) {
      bestWeek = count;
      const d = new Date(key + "T00:00:00");
      bestWeekLabel = `${d.getDate()}/${d.getMonth() + 1}`;
    }
  });
  return { avg: Math.round((publishedPosts.length / totalWeeks) * 10) / 10, bestWeek, bestWeekLabel };
}

export function weekOverWeekChange(posts: Post[]): { pct: number; direction: "up" | "down" | "same" } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - dayOfWeek);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

  const thisWeekKey = toDayKey(thisWeekStart);
  const todayKey = toDayKey(today);
  const lastWeekStartKey = toDayKey(lastWeekStart);
  const lastWeekEndKey = toDayKey(lastWeekEnd);

  let thisCount = 0;
  let lastCount = 0;
  posts.forEach((p) => {
    const d = p.data_postagem;
    if (d >= thisWeekKey && d <= todayKey) thisCount++;
    if (d >= lastWeekStartKey && d <= lastWeekEndKey) lastCount++;
  });

  if (lastCount === 0 && thisCount === 0) return { pct: 0, direction: "same" };
  if (lastCount === 0) return { pct: 100, direction: "up" };
  const pct = Math.round(((thisCount - lastCount) / lastCount) * 100);
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : pct < 0 ? "down" : "same" };
}

export function topAuthors(posts: Post[], account: AccountFilter): { name: string; count: number }[] {
  const filtered = filterByAccount(posts, account);
  const map = new Map<string, number>();
  filtered.forEach((p) => {
    if (p.responsavel) map.set(p.responsavel, (map.get(p.responsavel) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .filter((a) => a.count > 0);
}
