import React from "react";

const inputClass =
  "w-full px-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500";

export interface DateInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({ label, name, value, onChange, required }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-brick-300">{label}</label>
    <input type="date" name={name} value={value} onChange={onChange} required={required} className={inputClass} />
  </div>
);
