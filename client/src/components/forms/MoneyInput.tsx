import React, { useState } from "react";

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  currencySymbol?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  label,
  value,
  onChange,
  currencySymbol = "$",
  required,
  placeholder,
  ...props
}) => {
  const formatWithCommas = (val: string) => {
    if (!val) return val;
    const cleaned = val.toString().replace(/,/g, "");
    const parts = cleaned.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const cleanValue = (val: string) => val.replace(/,/g, "");

  const [internalValue, setInternalValue] = useState(() => formatWithCommas(value));
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setInternalValue(formatWithCommas(value));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow numbers, commas, empty string, and a single decimal point
    if (/^[\d,]*\.?\d*$/.test(val)) {
      setInternalValue(val);
      onChange(cleanValue(val));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let val = cleanValue(e.target.value);
    if (val) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        val = num.toFixed(2);
        const formatted = formatWithCommas(val);
        setInternalValue(formatted);
        onChange(val);
      }
    }
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-brick-200">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-brick-900">{currencySymbol}</span>
        </div>
        <input
          type="text"
          inputMode="decimal"
          className="w-full pl-8 pr-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500"
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder || "0.00"}
          required={required}
          {...props}
        />
      </div>
    </div>
  );
};
