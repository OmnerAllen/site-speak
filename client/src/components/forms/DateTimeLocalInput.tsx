import React from "react";

const inputClass =
  "w-full px-3 py-2 bg-brick-950/55 text-brick-100 border border-brick-600/90 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500 placeholder:text-brick-400";

export interface DateTimeLocalInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export const DateTimeLocalInput: React.FC<DateTimeLocalInputProps> = ({
  label,
  name,
  value,
  onChange,
  required,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-brick-200">{label}</label>
    <input
      type="datetime-local"
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className={inputClass}
    />
  </div>
);
