import { appendFile } from "node:fs/promises";
import { getPlanPathForDate, readDailyPlanFile, writeJsonWithTrailingNewline } from "./shared/plans";

async function writeGithubOutput(lines: string[]): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  await appendFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function completeSnapshotSlot(): Promise<void> {
  const planDate = process.env.SNAPSHOT_PLAN_DATE;
  const slotId = process.env.SNAPSHOT_SLOT_ID;
  const snapshotPath = process.env.SNAPSHOT_PATH;

  if (!planDate || !slotId || !snapshotPath) {
    throw new Error(
      "SNAPSHOT_PLAN_DATE, SNAPSHOT_SLOT_ID and SNAPSHOT_PATH are required.",
    );
  }

  const planPath = getPlanPathForDate(planDate);
  const plan = await readDailyPlanFile(planPath);

  if (!plan) {
    throw new Error(`Could not load a valid plan at ${planPath}.`);
  }

  const selected = plan.selectedSlots.some((slot) => slot.id === slotId);
  if (!selected) {
    throw new Error(`Slot ${slotId} is not selected in plan ${planDate}.`);
  }

  const alreadyCompleted = plan.completedSlots.some((entry) => entry.slotId === slotId);
  if (alreadyCompleted) {
    console.log(`Slot ${slotId} already completed for ${planDate}.`);
    await writeGithubOutput(["completed=false", "reason=slot-already-completed"]);
    return;
  }

  plan.completedSlots.push({
    slotId,
    completedAt: new Date().toISOString(),
    snapshotPath,
  });

  await writeJsonWithTrailingNewline(planPath, plan);

  console.log(`Marked slot ${slotId} completed for ${planDate}.`);
  await writeGithubOutput(["completed=true"]);
}

completeSnapshotSlot().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Unknown complete-slot error",
  );
  process.exit(1);
});
