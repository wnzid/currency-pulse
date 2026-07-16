import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomInt } from "node:crypto";
import { APPLICATION_TIMEZONE } from "./dates";

export interface SnapshotSlot {
  id: string;
  cron: string;
  utcTime: string;
}

export interface CompletedSlot {
  slotId: string;
  completedAt: string;
  snapshotPath: string;
}

export interface DailySnapshotPlan {
  version: 1;
  date: string;
  timezone: typeof APPLICATION_TIMEZONE;
  createdAt: string;
  snapshotCount: number;
  plannerSnapshotIncluded: true;
  selectedSlots: SnapshotSlot[];
  completedSlots: CompletedSlot[];
}

export const SNAPSHOT_SLOTS = [
  { id: "slot-01", cron: "17 1 * * *", utcTime: "01:17" },
  { id: "slot-02", cron: "43 4 * * *", utcTime: "04:43" },
  { id: "slot-03", cron: "11 8 * * *", utcTime: "08:11" },
  { id: "slot-04", cron: "37 11 * * *", utcTime: "11:37" },
  { id: "slot-05", cron: "19 15 * * *", utcTime: "15:19" },
  { id: "slot-06", cron: "47 18 * * *", utcTime: "18:47" },
  { id: "slot-07", cron: "23 21 * * *", utcTime: "21:23" },
] as const satisfies readonly SnapshotSlot[];

const WEIGHTED_SNAPSHOT_COUNTS = [
  { count: 1, weight: 10 },
  { count: 2, weight: 15 },
  { count: 3, weight: 20 },
  { count: 4, weight: 25 },
  { count: 5, weight: 15 },
  { count: 6, weight: 10 },
  { count: 7, weight: 5 },
] as const;

export function getPlanPathForDate(date: string): string {
  return path.join("data", "plans", `${date}.json`);
}

export async function writeJsonWithTrailingNewline(
  filePath: string,
  data: unknown,
): Promise<void> {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(tmpPath, content, "utf8");

  try {
    await rename(tmpPath, filePath);
  } catch {
    await writeFile(filePath, content, "utf8");
    await unlink(tmpPath).catch(() => undefined);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIsoTimestamp(value: string): boolean {
  return Number.isFinite(new Date(value).getTime());
}

function parseSlot(value: unknown): SnapshotSlot | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : null;
  const cron = typeof value.cron === "string" ? value.cron : null;
  const utcTime = typeof value.utcTime === "string" ? value.utcTime : null;

  if (!id || !cron || !utcTime) {
    return null;
  }

  const knownSlot = SNAPSHOT_SLOTS.find((slot) => slot.id === id);
  if (!knownSlot) {
    return null;
  }

  if (knownSlot.cron !== cron || knownSlot.utcTime !== utcTime) {
    return null;
  }

  return { id, cron, utcTime };
}

function parseCompletedSlot(value: unknown): CompletedSlot | null {
  if (!isRecord(value)) {
    return null;
  }

  const slotId = typeof value.slotId === "string" ? value.slotId : null;
  const completedAt =
    typeof value.completedAt === "string" ? value.completedAt : null;
  const snapshotPath =
    typeof value.snapshotPath === "string" ? value.snapshotPath : null;

  if (!slotId || !completedAt || !snapshotPath) {
    return null;
  }

  if (!isIsoTimestamp(completedAt)) {
    return null;
  }

  return {
    slotId,
    completedAt,
    snapshotPath,
  };
}

export function parseDailyPlan(value: unknown): DailySnapshotPlan | null {
  if (!isRecord(value)) {
    return null;
  }

  const version = value.version;
  const date = value.date;
  const timezone = value.timezone;
  const createdAt = value.createdAt;
  const snapshotCount = value.snapshotCount;
  const plannerSnapshotIncluded = value.plannerSnapshotIncluded;

  if (version !== 1) {
    return null;
  }

  if (typeof date !== "string" || !isIsoDate(date)) {
    return null;
  }

  if (timezone !== APPLICATION_TIMEZONE) {
    return null;
  }

  if (typeof createdAt !== "string" || !isIsoTimestamp(createdAt)) {
    return null;
  }

  if (
    typeof snapshotCount !== "number" ||
    !Number.isInteger(snapshotCount) ||
    snapshotCount < 1 ||
    snapshotCount > SNAPSHOT_SLOTS.length
  ) {
    return null;
  }

  if (plannerSnapshotIncluded !== true) {
    return null;
  }

  if (!Array.isArray(value.selectedSlots) || !Array.isArray(value.completedSlots)) {
    return null;
  }

  const selectedSlots = value.selectedSlots.map(parseSlot);
  if (selectedSlots.some((slot) => slot === null)) {
    return null;
  }

  const uniqueSelected = new Set(selectedSlots.map((slot) => slot.id));
  if (uniqueSelected.size !== selectedSlots.length) {
    return null;
  }

  if (selectedSlots.length !== snapshotCount - 1) {
    return null;
  }

  const completedSlots = value.completedSlots.map(parseCompletedSlot);
  if (completedSlots.some((slot) => slot === null)) {
    return null;
  }

  const completedSlotIds = completedSlots.map((slot) => slot.slotId);
  const uniqueCompleted = new Set(completedSlotIds);
  if (uniqueCompleted.size !== completedSlotIds.length) {
    return null;
  }

  for (const completed of completedSlots) {
    if (!uniqueSelected.has(completed.slotId)) {
      return null;
    }
  }

  return {
    version,
    date,
    timezone,
    createdAt,
    snapshotCount,
    plannerSnapshotIncluded,
    selectedSlots: selectedSlots as SnapshotSlot[],
    completedSlots: completedSlots as CompletedSlot[],
  };
}

export async function readDailyPlanFile(planPath: string): Promise<DailySnapshotPlan | null> {
  let raw: string;
  try {
    raw = await readFile(planPath, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  return parseDailyPlan(parsed);
}

export function pickWeightedSnapshotCount(): number {
  const totalWeight = WEIGHTED_SNAPSHOT_COUNTS.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );

  let pick = randomInt(totalWeight);

  for (const entry of WEIGHTED_SNAPSHOT_COUNTS) {
    if (pick < entry.weight) {
      return entry.count;
    }

    pick -= entry.weight;
  }

  return 4;
}

export function pickFutureSlots(snapshotCount: number): SnapshotSlot[] {
  const required = Math.max(0, snapshotCount - 1);
  const shuffled = [...SNAPSHOT_SLOTS];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const selected = shuffled.slice(0, required);
  const deduped = [...new Map(selected.map((slot) => [slot.id, slot])).values()];

  if (deduped.length !== required) {
    throw new Error("Planner generated duplicate selected slots.");
  }

  const slotOrder = new Map(SNAPSHOT_SLOTS.map((slot, index) => [slot.id, index]));
  deduped.sort((left, right) => {
    const leftOrder = slotOrder.get(left.id) ?? 0;
    const rightOrder = slotOrder.get(right.id) ?? 0;
    return leftOrder - rightOrder;
  });

  return deduped;
}
