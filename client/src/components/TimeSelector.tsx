import React from "react";

export interface TimeSelectorProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({ label, ...props }) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-brick-300">{label}</label>
      <input
        type="time"
        className="px-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500"
        {...props}
      />
    </div>
  );
};
