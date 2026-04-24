import React from "react";

export interface SmallTextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const SmallTextInput: React.FC<SmallTextInputProps> = ({ label, ...props }) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-brick-200">{label}</label>
      <input
        type="text"
        className="px-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500"
        {...props}
      />
    </div>
  );
};
