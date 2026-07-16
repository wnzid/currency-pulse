import { appendFile, readFile } from "node:fs/promises";
import { getApplicationDateString } from "./shared/dates";
import {
  SNAPSHOT_SLOTS,
  getPlanPathForDate,
  readDailyPlanFile,
} from "./shared/plans";

type SkipReason =
  | "plan-not-found"
  | "slot-not-selected"
  | "slot-already-completed"
  | "invalid-plan"
  | "unknown-trigger-schedule";

async function writeGithubOutput(lines: string[]): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  await appendFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function skip(reason: SkipReason): Promise<void> {
  await writeGithubOutput(["selected=false", `reason=${reason}`]);
  console.log(`selected=false (${reason})`);
}

async function checkSnapshotSlot(): Promise<void> {
  const triggerSchedule = (process.env.TRIGGER_SCHEDULE ?? "").trim();
  const planDate = getApplicationDateString();

  console.log(`Plan date: ${planDate}`);
  console.log(`Trigger schedule: ${triggerSchedule || "(empty)"}`);

  if (!triggerSchedule) {
    await skip("unknown-trigger-schedule");
    return;
  }

  const knownSlot = SNAPSHOT_SLOTS.find((slot) => slot.cron === triggerSchedule);
  if (!knownSlot) {
    await skip("unknown-trigger-schedule");
    return;
  }

  console.log(`Resolved slot ID: ${knownSlot.id}`);

  const planPath = getPlanPathForDate(planDate);

  const rawPlanContent = await readFile(planPath, "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  });

  if (rawPlanContent === null) {
    console.log("No valid plan exists for the current application date. Skipping.");
    await skip("plan-not-found");
    return;
  }

  const plan = await readDailyPlanFile(planPath);
  if (!plan) {
    await skip("invalid-plan");
    return;
  }

  const selectedSlot = plan.selectedSlots.find((slot) => slot.id === knownSlot.id);
  if (!selectedSlot) {
    await skip("slot-not-selected");
    return;
  }

  const alreadyCompleted = plan.completedSlots.some(
    (entry) => entry.slotId === selectedSlot.id,
  );

  if (alreadyCompleted) {
    await skip("slot-already-completed");
    return;
  }

  await writeGithubOutput([
    "selected=true",
    `slotId=${selectedSlot.id}`,
    `planDate=${plan.date}`,
  ]);

  console.log(`selected=true slotId=${selectedSlot.id}`);
}

checkSnapshotSlot().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Unknown slot-check error",
  );
  process.exit(1);
});
