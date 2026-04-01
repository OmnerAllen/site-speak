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

export interface DynamicFormProps {
  fields: FormFieldConfig[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onSubmit: (values: Record<string, string>) => void;
  submitLabel?: string;
  onCancel?: () => void;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  values,
  onChange,
  onSubmit,
  submitLabel = "Submit",
  onCancel,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const renderField = (field: FormFieldConfig) => {
    const { type, label, name, placeholder, required, step, options } = field;

    switch (type) {
      case "small-text":
        return (
          <SmallTextInput
            key={name}
            label={label}
            name={name}
            value={values[name] ?? ""}
            onChange={(e) => onChange(name, e.target.value)}
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
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-brick-800 p-6 rounded-lg shadow-md border border-brick-700"
    >
      {fields.map(renderField)}
      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 focus:outline-none focus:ring-2 focus:ring-brick-500 focus:ring-offset-2 transition-colors cursor-pointer"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-brick-300 hover:text-brick-100 border border-brick-600 rounded-md hover:bg-brick-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
