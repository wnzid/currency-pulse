import type { TimeRangeValue } from "../types/exchange";
import { TIME_RANGE_OPTIONS } from "../utils/currency";

interface TimeRangeSelectorProps {
  value: TimeRangeValue;
  onChange: (nextRange: TimeRangeValue) => void;
}

export function TimeRangeSelector({
  value,
  onChange,
}: TimeRangeSelectorProps) {
  return (
    <div className="time-range-selector" role="tablist" aria-label="Time range">
      {TIME_RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          className={value === option.value ? "active" : ""}
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
