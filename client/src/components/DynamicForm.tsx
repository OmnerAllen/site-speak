import React from "react";
import type { FormFieldConfig } from "../types";
import { SmallTextInput } from "./SmallTextInput";
import { LargeTextInput } from "./LargeTextInput";
import { TimeSelector } from "./TimeSelector";
import { NumberInput } from "./NumberInput";
import { PhoneInput } from "./PhoneInput";
import { SelectInput } from "./SelectInput";
import { DateInput } from "./DateInput";
import { DateTimeLocalInput } from "./DateTimeLocalInput";
import { MoneyInput } from "./MoneyInput";


export interface DynamicFormProps {
  fields: FormFieldConfig[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onSubmit: (values: Record<string, string>) => void;
  /** Fires when a field loses focus (e.g. overview blur to run AI estimate). */
  onFieldBlur?: (name: string) => void;
  submitLabel?: string;
  onCancel?: () => void;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  values,
  onChange,
  onSubmit,
  onFieldBlur,
  submitLabel = "Submit",
  onCancel,
  submitDisabled = false,
  cancelDisabled = false,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const renderField = (field: FormFieldConfig) => {
    const { type, label, name, placeholder, required, step, options, description } =
      field;

    switch (type) {
      case "heading":
        return (
          <div
            key={name}
            className="mt-14 first:mt-0 pt-6 border-t border-brick-700 first:border-t-0 first:pt-0"
          >
            <h3 className="text-base md:text-lg font-semibold text-brick-200">
              {label}
            </h3>
            {description ? (
              <p className="text-xs text-brick-500 mt-1">{description}</p>
            ) : null}
          </div>
        );
      case "small-text":
        return (
          <SmallTextInput
            key={name}
            label={label}
            name={name}
            value={values[name] ?? ""}
            onChange={(e) => onChange(name, e.target.value)}
            onBlur={() => onFieldBlur?.(name)}
            placeholder={placeholder}
            required={required}
          />
        );
      case "phone":
        return (
          <PhoneInput
            key={name}
            label={label}
            name={name}
            value={values[name] ?? ""}
            onChange={(value) => onChange(name, value)}
            placeholder={placeholder}
            required={required}
          />
        );
      case "large-text":
        return (
          <LargeTextInput
            key={name}
            label={label}
            name={name}
            value={values[name] ?? ""}
            onChange={(e) => onChange(name, e.target.value)}
            onBlur={() => onFieldBlur?.(name)}
            placeholder={placeholder}
            required={required}
          />
        );
      case "time":
        return (
          <TimeSelector
            key={name}
            label={label}
            name={name}
            value={values[name] ?? ""}
            onChange={(val) => onChange(name, val)}
            required={required}
          />
        );
      case "number":
        return (
          <NumberInput
            key={name}
            label={label}
            name={name}
            value={values[name] ?? ""}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder={placeholder}
            required={required}
            step={step ?? "0.01"}
          />
        );
      case "select":
        return (
          <SelectInput
            key={name}
            label={label}
            name={name}
            value={values[name] ?? ""}
            onChange={(value) => onChange(name, value)}
            options={options ?? []}
            required={required}
          />
        );
      case "date":
        return (
          <DateInput
            key={name}
            label={label}
            name={name}
            value={values[name] ?? ""}
            onChange={(e) => onChange(name, e.target.value)}
            required={required}
          />
        );
      case "datetime-local":
        return (
          <DateTimeLocalInput
            key={name}
            label={label}
            name={name}
            value={values[name] ?? ""}
            onChange={(e) => onChange(name, e.target.value)}
            required={required}
          />
        );
      case "money":
        return (
          <MoneyInput
            key={name}
            label={label}
            name={name}
            value={values[name] ?? ""}
            onChange={(value) => onChange(name, value)}
            placeholder={placeholder}
            required={required}
          />
        );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-brick-800 p-6 rounded-lg shadow-md border border-brick-700"
    >
      {fields.map(renderField)}
      <div
        className={`flex gap-3 items-center ${onCancel ? "justify-between" : "justify-end"}`}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelDisabled}
            className="px-4 py-2 text-brick-300 hover:text-brick-100 border border-brick-600 rounded-md hover:bg-brick-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitDisabled}
          className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 focus:outline-none focus:ring-2 focus:ring-brick-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
