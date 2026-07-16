interface CurrencySelectorProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (nextCurrency: string) => void;
}

export function CurrencySelector({
  id,
  label,
  value,
  options,
  onChange,
}: CurrencySelectorProps) {
  return (
    <label className="control-field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </label>
  );
}
