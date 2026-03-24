import { useState } from "react";
import { DynamicForm } from "../components/DynamicForm";
import type { FormFieldConfig } from "../types";

const fields: FormFieldConfig[] = [
  {
    type: "small-text",
    label: "sample small text input",
    name: "title",
    placeholder: "Enter task title",
    required: true,
  },
  {
    type: "large-text",
    label: "sample large text input",
    name: "description",
    placeholder: "Describe the task in detail...",
    required: true,
  },
  {
    type: "time",
    label: "sample time selector",
    name: "time",
    required: true,
  },
];

const fields2: FormFieldConfig[] = [
  {
    type: "small-text",
    label: "sample small text input",
    name: "title",
    placeholder: "Enter task title",
    required: true,
  },
  {
    type: "small-text",
    label: "sample smallish text input",
    name: "money",
    placeholder: "Describe the task in detail...",
    required: true,
  },
  {
    type: "time",
    label: "sample time selector",
    name: "time",
    required: true,
  },
];

export default function CustomForms() {
  const [formData, setFormData] = useState<Record<string, string>>({
    title: "",
    description: "",
    time: "",
  });

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (values: Record<string, string>) => {
    console.log("Form submitted:", values);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 text-brick-100">
      <h1 className="text-2xl font-bold mb-6 text-brick-300">Custom Forms Page</h1>
      <DynamicForm
        fields={fields}
        values={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel="Submit Form"
      />      
      <DynamicForm
      fields={fields2}
      values={formData}
      onChange={handleChange}
      onSubmit={handleSubmit}
      submitLabel="Submit Form"
      />
    </div>
  );
}
