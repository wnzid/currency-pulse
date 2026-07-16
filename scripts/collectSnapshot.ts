import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomInt } from "node:crypto";
import path from "node:path";

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface ExchangeRateSnapshot {
  observedAt: string;
  rateDate: string;
  base: string;
  rates: Record<string, number>;
  source: "Frankfurter";
  collection?: {
    environment: "local" | "github-actions";
    planDate?: string;
    slotId?: string;
  };
}

const API_URL =
  "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP,AUD,BDT,CAD,CHF,JPY";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRates(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, number>>((acc, [key, rate]) => {
    if (typeof rate === "number" && Number.isFinite(rate)) {
      acc[key] = rate;
    }

    return acc;
  }, {});
}

function parseFrankfurterResponse(value: unknown): FrankfurterResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const amount = value.amount;
  const base = value.base;
  const date = value.date;
  const rates = normalizeRates(value.rates);

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    typeof base !== "string" ||
    base.length === 0 ||
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return null;
  }

  return {
    amount,
    base,
    date,
    rates,
  };
}

function parseSnapshot(value: unknown): ExchangeRateSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const observedAt = value.observedAt;
  const rateDate = value.rateDate;
  const base = value.base;
  const source = value.source;
  const rates = normalizeRates(value.rates);

  if (
    typeof observedAt !== "string" ||
    !Number.isFinite(new Date(observedAt).getTime()) ||
    typeof rateDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(rateDate) ||
    typeof base !== "string" ||
    base.length === 0 ||
    source !== "Frankfurter"
  ) {
    return null;
  }

  const collection = isRecord(value.collection)
    ? {
        environment:
          value.collection.environment === "github-actions"
            ? "github-actions"
            : "local",
        planDate:
          typeof value.collection.planDate === "string"
            ? value.collection.planDate
            : undefined,
        slotId:
          typeof value.collection.slotId === "string"
            ? value.collection.slotId
            : undefined,
      }
    : undefined;

  return {
    observedAt,
    rateDate,
    base,
    rates,
    source: "Frankfurter",
    collection,
  };
}

async function readHistory(
  historyPath: string,
): Promise<ExchangeRateSnapshot[]> {
  try {
    const content = await readFile(historyPath, "utf8");
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => parseSnapshot(entry))
      .filter((entry): entry is ExchangeRateSnapshot => entry !== null);
  } catch {
    return [];
  }
}

async function writeGithubOutput(lines: string[]): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  await appendFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function collectSnapshot(): Promise<void> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(
      `Frankfurter request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as unknown;
  const result = parseFrankfurterResponse(payload);

  if (!result) {
    throw new Error("The API returned an unexpected response.");
  }

  const observedAt = new Date().toISOString();
  const snapshotPlanDate = process.env.SNAPSHOT_PLAN_DATE;
  const snapshotSlotId = process.env.SNAPSHOT_SLOT_ID;
  const isGithubActions = process.env.GITHUB_ACTIONS === "true";

  const snapshot: ExchangeRateSnapshot = {
    observedAt,
    rateDate: result.date,
    base: result.base,
    rates: result.rates,
    source: "Frankfurter",
    collection: {
      environment: isGithubActions ? "github-actions" : "local",
      planDate: snapshotPlanDate,
      slotId: snapshotSlotId,
    },
  };

  const year = observedAt.slice(0, 4);
  const month = observedAt.slice(5, 7);
  const day = observedAt.slice(8, 10);
  const safeTimestamp = observedAt.replaceAll(":", "-").replaceAll(".", "-");
  const randomSuffix = randomInt(1000, 10000);
  const snapshotFileName = `${safeTimestamp}-${randomSuffix}.json`;

  const snapshotDirectory = path.join(
    "data",
    "snapshots",
    year,
    month,
    day,
  );

  const publicDataDirectory = path.join("public", "data");
  const historyPath = path.join(publicDataDirectory, "history.json");

  await mkdir(snapshotDirectory, { recursive: true });
  await mkdir(publicDataDirectory, { recursive: true });

  const snapshotPath = path.join(snapshotDirectory, snapshotFileName);

  await writeFile(
    snapshotPath,
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );

  await writeFile(
    path.join(publicDataDirectory, "latest.json"),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );

  const history = await readHistory(historyPath);
  const alreadyExists = history.some(
    (entry) => entry.observedAt === snapshot.observedAt,
  );

  if (!alreadyExists) {
    history.push(snapshot);
  }

  history.sort(
    (left, right) =>
      new Date(left.observedAt).getTime() -
      new Date(right.observedAt).getTime(),
  );

  await writeFile(
    historyPath,
    `${JSON.stringify(history, null, 2)}\n`,
  );

  console.log(`Snapshot recorded at ${observedAt}`);
  console.log(`Snapshot path: ${snapshotPath}`);

  await writeGithubOutput([
    `snapshotPath=${snapshotPath}`,
    `observedAt=${observedAt}`,
  ]);
}

collectSnapshot().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Unknown snapshot error",
  );

  process.exit(1);
});
