import React from "react";

export interface NumberInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-brick-200">{label}</label>
      <input
        type="number"
        className="px-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500"
        {...props}
      />
    </div>
  );
};
