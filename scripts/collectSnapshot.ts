import { mkdir, readFile, writeFile } from "node:fs/promises";
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
}

const API_URL =
  "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP,AUD,BDT,CAD,CHF,JPY";

async function readHistory(
  historyPath: string,
): Promise<ExchangeRateSnapshot[]> {
  try {
    const content = await readFile(historyPath, "utf8");
    return JSON.parse(content) as ExchangeRateSnapshot[];
  } catch {
    return [];
  }
}

async function collectSnapshot(): Promise<void> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(
      `Frankfurter request failed: ${response.status} ${response.statusText}`,
    );
  }

  const result = (await response.json()) as FrankfurterResponse;

  if (!result.date || !result.base || !result.rates) {
    throw new Error("The API returned an unexpected response.");
  }

  const now = new Date();
  const observedAt = now.toISOString();

  const snapshot: ExchangeRateSnapshot = {
    observedAt,
    rateDate: result.date,
    base: result.base,
    rates: result.rates,
    source: "Frankfurter",
  };

  const year = observedAt.slice(0, 4);
  const month = observedAt.slice(5, 7);
  const day = observedAt.slice(8, 10);
  const time = observedAt.slice(11, 19).replaceAll(":", "-");

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

  await writeFile(
    path.join(snapshotDirectory, `${time}.json`),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );

  await writeFile(
    path.join(publicDataDirectory, "latest.json"),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );

  const history = await readHistory(historyPath);
  history.push(snapshot);

  await writeFile(
    historyPath,
    `${JSON.stringify(history, null, 2)}\n`,
  );

  console.log(`Snapshot recorded at ${observedAt}`);
  console.log(result.rates);
}

collectSnapshot().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Unknown snapshot error",
  );

  process.exit(1);
});
