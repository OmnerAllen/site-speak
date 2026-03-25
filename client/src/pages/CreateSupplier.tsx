import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DynamicForm } from "../components/DynamicForm";
import type { FormFieldConfig } from "../types";

const fields: FormFieldConfig[] = [
  {
    type: "small-text",
    label: "Company Name",
    name: "name",
    placeholder: "Enter company name",
    required: true,
  },
  {
    type: "large-text",
    label: "Address",
    name: "address",
    placeholder: "Enter full address...",
    required: true,
  },
  {
    type: "small-text",
    label: "Phone Number",
    name: "phone",
    placeholder: "Enter phone number",
    required: true,
  },
];

export default function CreateSupplier() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, string>>({
    name: "",
    address: "",
    phone: "",
  });

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (values: Record<string, string>) => {
    console.log("Mock Create Supplier Form submitted:", values);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 text-brick-100">
      <h1 className="text-2xl font-bold mb-6 text-brick-300">Create Supplier (Mock)</h1>
      <DynamicForm
        fields={fields}
        values={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel="Create Supplier"
      />
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleCancel}
          type="button"
          className="bg-radioactive-800 text-radioactive-50 font-medium py-2 px-4 rounded-md hover:bg-radioactive-700 focus:outline-none focus:ring-2 focus:ring-radioactive-500 focus:ring-offset-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
