import React from "react";

export interface LargeTextInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const LargeTextInput: React.FC<LargeTextInputProps> = ({ label, ...props }) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-brick-200">{label}</label>
      <textarea
        className="px-3 py-2 bg-brick-950/55 text-brick-100 border border-brick-600/90 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500 placeholder:text-brick-400 min-h-25"
        {...props}
      />
    </div>
  );
};
