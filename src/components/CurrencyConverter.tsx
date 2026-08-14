import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpDown } from "lucide-react";
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

  const effectiveBaseCurrency = currencies.includes(baseCurrency)
    ? baseCurrency
    : (currencies[0] ?? latest.base);

  const effectiveTargetCurrency = currencies.includes(targetCurrency)
    ? targetCurrency
    : (currencies.includes("BDT") ? "BDT" : (currencies[0] ?? latest.base));

  const numericAmount = Number(amount);

  const conversion = useMemo(
    () =>
      convertAmount(
        numericAmount,
        effectiveBaseCurrency,
        effectiveTargetCurrency,
        latest,
      ),
    [numericAmount, effectiveBaseCurrency, effectiveTargetCurrency, latest],
  );

  const swapCurrencies = () => {
    setBaseCurrency(effectiveTargetCurrency);
    setTargetCurrency(effectiveBaseCurrency);
  };

  const quickAmounts = [1, 10, 100, 1000];

  return (
    <section className="card converter-card">
      <div className="converter-heading">
        <div>
          <p className="converter-kicker">Fast conversion</p>
          <h2>Convert currency</h2>
        </div>
        <p>Live calculation from the latest stored rate</p>
      </div>

      <div className="converter-grid">
        <label className="control-field amount-field" htmlFor="amount-input">
          <span>Amount</span>
          <input
            id="amount-input"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <div className="quick-amounts" aria-label="Quick amounts">
            {quickAmounts.map((quickAmount) => (
              <button type="button" key={quickAmount} onClick={() => setAmount(String(quickAmount))}>
                {quickAmount.toLocaleString()}
              </button>
            ))}
          </div>
        </label>

        <div className="currency-route">
          <CurrencySelector id="convert-base" label="From" value={effectiveBaseCurrency} options={currencies} onChange={setBaseCurrency} />
          <button className="swap-button" type="button" onClick={swapCurrencies} aria-label="Swap currencies" title="Swap currencies">
            <ArrowUpDown size={22} strokeWidth={3} />
          </button>
          <CurrencySelector id="convert-target" label="To" value={effectiveTargetCurrency} options={currencies} onChange={setTargetCurrency} />
        </div>
      </div>

      <div className="converter-result" aria-live="polite">
        {conversion ? (
          <>
            <div className="result-route">
              <span>{numericAmount.toLocaleString()} {effectiveBaseCurrency}</span>
              <ArrowRight aria-hidden="true" />
              <span>{effectiveTargetCurrency}</span>
            </div>
            <p className="result-amount">
              {conversion.convertedAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })} <small>{effectiveTargetCurrency}</small>
            </p>
            <div className="result-meta">
              <p>1 {effectiveBaseCurrency} = {formatRate(conversion.appliedRate)} {effectiveTargetCurrency}</p>
              <p>Updated {latest.observedAt ?? "Unknown"}</p>
            </div>
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
