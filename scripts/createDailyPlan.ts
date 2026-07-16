import {
  DailySnapshotPlan,
  getPlanPathForDate,
  pickFutureSlots,
  pickWeightedSnapshotCount,
  readDailyPlanFile,
  writeJsonWithTrailingNewline,
} from "./shared/plans";
import { APPLICATION_TIMEZONE, getApplicationDateString } from "./shared/dates";

async function appendGithubOutput(lines: string[]): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  const { appendFile } = await import("node:fs/promises");
  await appendFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function createDailyPlan(): Promise<void> {
  const planDate = getApplicationDateString();
  const planPath = getPlanPathForDate(planDate);

  const existingPlan = await readDailyPlanFile(planPath);
  if (existingPlan) {
    console.log(`Plan already exists for ${planDate}. No changes made.`);
    await appendGithubOutput([
      "created=false",
      `planDate=${planDate}`,
      `snapshotCount=${existingPlan.snapshotCount}`,
    ]);
    return;
  }

  const snapshotCount = pickWeightedSnapshotCount();
  const selectedSlots = pickFutureSlots(snapshotCount);

  if (selectedSlots.length !== snapshotCount - 1) {
    throw new Error("Selected slots count does not match snapshotCount - 1.");
  }

  const plan: DailySnapshotPlan = {
    version: 1,
    date: planDate,
    timezone: APPLICATION_TIMEZONE,
    createdAt: new Date().toISOString(),
    snapshotCount,
    plannerSnapshotIncluded: true,
    selectedSlots,
    completedSlots: [],
  };

  await writeJsonWithTrailingNewline(planPath, plan);

  console.log(`Created plan for ${planDate}`);
  console.log(`Target snapshot count: ${snapshotCount}`);
  if (selectedSlots.length === 0) {
    console.log("Selected 0 future snapshot slots (planner snapshot only day).");
  } else {
    console.log(`Selected ${selectedSlots.length} future snapshot slots:`);
    for (const slot of selectedSlots) {
      console.log(`- ${slot.id}: ${slot.cron}`);
    }
  }

  await appendGithubOutput([
    "created=true",
    `planDate=${planDate}`,
    `snapshotCount=${snapshotCount}`,
  ]);
}

createDailyPlan().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown planner error");
  process.exit(1);
});
