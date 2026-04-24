import React from "react";

const inputClass =
  "w-full px-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  required?: boolean;
  placeholderOption?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  required,
  placeholderOption = "Select…",
}) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-brick-200">{label}</label>
      <select
        name={name}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} cursor-pointer`}
      >
        <option value="">{placeholderOption}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};
