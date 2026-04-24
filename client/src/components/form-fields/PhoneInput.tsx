import React from "react";

const PHONE_DIGIT_LIMIT = 10;

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, PHONE_DIGIT_LIMIT);
}

function formatPhone(value: string): string {
  const digits = normalizePhone(value);

  if (!digits) return "";
  if (digits.length < 4) return digits;
  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatPhoneForDisplay(value: string): string {
  const formatted = formatPhone(value);
  return formatted || value;
}

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

type PhoneInputComponent = React.FC<PhoneInputProps> & {
  normalizePhone: (value: string) => string;
  formatPhone: (value: string) => string;
  formatPhoneForDisplay: (value: string) => string;
};

export const PhoneInput: PhoneInputComponent = ({
  label,
  value,
  onChange,
  placeholder,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-brick-200">{label}</label>
      <input
        type="tel"
        value={value}
        onChange={(e) => onChange(formatPhone(e.target.value))}
        placeholder={placeholder ?? "e.g. (555) 123-4567"}
        inputMode="tel"
        autoComplete="tel"
        className="px-3 py-2 bg-brick-950/55 text-brick-100 border border-brick-600/90 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500 placeholder:text-brick-400"
        {...props}
      />
    </div>
  );
};

PhoneInput.normalizePhone = normalizePhone;
PhoneInput.formatPhone = formatPhone;
PhoneInput.formatPhoneForDisplay = formatPhoneForDisplay;
