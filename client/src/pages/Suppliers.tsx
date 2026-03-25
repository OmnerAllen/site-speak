import { useState } from "react";
import { DynamicForm } from "../components/DynamicForm";
import { ResourceList } from "../components/ResourceList";
import type { FormFieldConfig, Supplier } from "../types";

const SUPPLIER_FIELDS: FormFieldConfig[] = [
  {
    type: "small-text",
    label: "Company Name",
    name: "name",
    placeholder: "e.g. Acme Corp",
    required: true,
  },
  {
    type: "large-text",
    label: "Address",
    name: "address",
    placeholder: "e.g. 123 Main St",
    required: true,
  },
  {
    type: "small-text",
    label: "Phone Number",
    name: "phone",
    placeholder: "e.g. 555-1234",
    required: true,
  },
];

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: "1",
    name: "Acme Corp",
    address: "123 Main St, Springfield",
    phone: "555-1234",
  },
  {
    id: "2",
    name: "Global Industries",
    address: "456 Oak Ave, Metropolis",
    phone: "555-5678",
  },
];

function emptyFormValues(): Record<string, string> {
  return {
    name: "",
    address: "",
    phone: "",
  };
}

function supplierToFormValues(s: Supplier): Record<string, string> {
  return {
    name: s.name,
    address: s.address,
    phone: s.phone,
  };
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(
    emptyFormValues(),
  );

  const handleAdd = () => {
    setEditingId(null);
    setFormValues(emptyFormValues());
    setShowForm(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setFormValues(supplierToFormValues(supplier));
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormValues(emptyFormValues());
  };

  const handleSubmit = (values: Record<string, string>) => {
    if (editingId) {
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                name: values.name,
                address: values.address,
                phone: values.phone,
              }
            : s,
        ),
      );
    } else {
      const newSupplier: Supplier = {
        id: crypto.randomUUID(),
        name: values.name,
        address: values.address,
        phone: values.phone,
      };
      setSuppliers((prev) => [newSupplier, ...prev]);
    }
    handleCancel();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      {!showForm && (
        <div className="flex items-center justify-end mb-6 pb-4 border-b border-brick-800">
          <button
            onClick={handleAdd}
            className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer"
          >
            + Add Supplier
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-8 relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-brick-200">
              {editingId ? "Edit Supplier" : "New Supplier"}
            </h2>
            
          </div>
          <DynamicForm
            fields={SUPPLIER_FIELDS}
            values={formValues}
            onChange={(name, value) =>
              setFormValues((prev) => ({ ...prev, [name]: value }))
            }
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel={editingId ? "Save Changes" : "Add Supplier"}
          />
        </div>
      )}

      <ResourceList
        items={suppliers}
        titleKey="name"
        columns={[
          { label: "Phone", value: (s) => s.phone },
          { label: "Address", value: (s) => s.address },
        ]}
        onEdit={handleEdit}
        onDelete={(id) =>
          setSuppliers((prev) => prev.filter((s) => s.id !== id))
        }
        emptyMessage="No suppliers yet. Add one above."
      />
    </div>
  );
}
