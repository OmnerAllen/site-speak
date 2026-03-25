import { useState } from "react";
import { DynamicForm } from "../components/DynamicForm";
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-brick-800">
        <h1 className="text-2xl font-bold text-brick-100">
          Suppliers{" "}
          <span className="ml-2 bg-brick-800 text-brick-300 text-sm px-2.5 py-0.5 rounded-full">
            {suppliers.length}
          </span>
        </h1>
        {!showForm && (
          <button
            onClick={handleAdd}
            className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer"
          >
            + Add Supplier
          </button>
        )}
      </div>

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

      {suppliers.length === 0 ? (
        <p className="text-brick-400 italic bg-brick-900/50 p-6 rounded-lg border border-brick-800/50 text-center">
          No suppliers yet. Add one above.
        </p>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-brick-900 border border-brick-800 rounded-lg p-5 hover:border-brick-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-brick-200 truncate mb-2">
                    {s.name}
                  </h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-brick-400">
                    <span>
                      <span className="text-brick-500">Phone:</span> {s.phone}
                    </span>
                    <span>
                      <span className="text-brick-500">Address:</span>{" "}
                      {s.address}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(s)}
                    className="text-sm text-brick-300 hover:text-brick-100 px-3 py-1.5 border border-brick-700 rounded-md hover:bg-brick-800 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    onBlur={() => setConfirmDeleteId(null)}
                    className={`text-sm px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      confirmDeleteId === s.id
                        ? "bg-radioactive-700 text-radioactive-100 border border-radioactive-600"
                        : "text-brick-400 hover:text-radioactive-300 border border-brick-700 hover:border-radioactive-800"
                    }`}
                  >
                    {confirmDeleteId === s.id ? "Confirm?" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
