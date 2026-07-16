import { useEffect, useMemo, useState } from "react";
import type { LatestSnapshotData } from "../types/exchange";
import { CurrencySelector } from "./CurrencySelector";
import { formatRate } from "../utils/currency";

interface CurrencyConverterProps {
  latest: LatestSnapshotData;
  currencies: string[];
}

interface ConversionResult {
  convertedAmount: number;
  appliedRate: number;
}

function convertAmount(
  amount: number,
  baseCurrency: string,
  targetCurrency: string,
  latest: LatestSnapshotData,
): ConversionResult | null {
  if (amount <= 0) {
    return null;
  }

  const sourceRate =
    baseCurrency === latest.base ? 1 : latest.rates[baseCurrency] ?? undefined;
  const targetRate =
    targetCurrency === latest.base ? 1 : latest.rates[targetCurrency] ?? undefined;

  if (typeof sourceRate !== "number" || typeof targetRate !== "number") {
    return null;
  }

  const amountInBase = amount / sourceRate;
  const convertedAmount = amountInBase * targetRate;

  return {
    convertedAmount,
    appliedRate: convertedAmount / amount,
  };
}

export function CurrencyConverter({
  latest,
  currencies,
}: CurrencyConverterProps) {
  const [amount, setAmount] = useState("1");
  const [baseCurrency, setBaseCurrency] = useState(latest.base);
  const [targetCurrency, setTargetCurrency] = useState("BDT");

  useEffect(() => {
    if (!currencies.includes(baseCurrency)) {
      setBaseCurrency(currencies[0] ?? latest.base);
    }

    if (!currencies.includes(targetCurrency)) {
      const fallback = currencies.includes("BDT")
        ? "BDT"
        : (currencies[0] ?? latest.base);
      setTargetCurrency(fallback);
    }
  }, [currencies, baseCurrency, targetCurrency, latest.base]);

  const numericAmount = Number(amount);

  const conversion = useMemo(
    () =>
      convertAmount(
        numericAmount,
        baseCurrency,
        targetCurrency,
        latest,
      ),
    [numericAmount, baseCurrency, targetCurrency, latest],
  );

  return (
    <section className="card converter-card">
      <div className="section-heading">
        <h2>Currency converter</h2>
        <p>Uses latest stored snapshot only</p>
      </div>

      <div className="converter-grid">
        <label className="control-field" htmlFor="amount-input">
          <span>Amount</span>
          <input
            id="amount-input"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>

        <CurrencySelector
          id="convert-base"
          label="Base currency"
          value={baseCurrency}
          options={currencies}
          onChange={setBaseCurrency}
        />

        <CurrencySelector
          id="convert-target"
          label="Target currency"
          value={targetCurrency}
          options={currencies}
          onChange={setTargetCurrency}
        />
      </div>

      <div className="converter-result">
        {conversion ? (
          <>
            <p className="result-amount">
              {numericAmount.toLocaleString()} {baseCurrency} ={" "}
              {conversion.convertedAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}{" "}
              {targetCurrency}
            </p>
            <p className="card-subtle">
              Exchange rate used: 1 {baseCurrency} = {formatRate(conversion.appliedRate)}{" "}
              {targetCurrency}
            </p>
            <p className="card-subtle">
              Snapshot timestamp: {latest.observedAt ?? "Unknown"}
            </p>
          </>
        ) : (
          <p className="card-subtle">
            Conversion unavailable for this currency pair in the latest snapshot.
          </p>
        )}
      </div>
    </section>
  );
}
