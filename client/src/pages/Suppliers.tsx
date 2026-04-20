import { useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DynamicForm } from "../components/DynamicForm";
import { PhoneInput } from "../components/PhoneInput";
import { ResourceList } from "../components/ResourceList";
import { ResourceNav } from "../components/ResourceNav";
import { api } from "../api";
import type { FormFieldConfig, Supplier, SupplierUpsertBody } from "../types";

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
    type: "phone",
    label: "Phone Number",
    name: "phone",
    placeholder: "e.g. (555) 123-4567",
  },
];

function emptyFormValues(): Record<string, string> {
  return { name: "", address: "", phone: "" };
}

function supplierToFormValues(s: Supplier): Record<string, string> {
  return { name: s.name, address: s.address, phone: PhoneInput.formatPhone(s.phone) };
}

export default function Suppliers() {
  const queryClient = useQueryClient();
  const { data: suppliers } = useSuspenseQuery({
    queryKey: ["suppliers"],
    queryFn: api.getSuppliers,
  });

  const createMutation = useMutation({
    mutationFn: (body: SupplierUpsertBody) => api.createSupplier(body),
    onSuccess: () => {
      toast.success("Supplier created successfully.");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: SupplierUpsertBody & { id: string }) =>
      api.updateSupplier(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSupplier(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

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
    const body = {
      name: values.name,
      address: values.address,
      phone: PhoneInput.normalizePhone(values.phone),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...body });
    } else {
      createMutation.mutate(body);
    }
    handleCancel();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      <ResourceNav
        action={
          !showForm ? (
            <button
              type="button"
              onClick={handleAdd}
              className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer"
            >
              + Add Supplier
            </button>
          ) : undefined
        }
      />

      {showForm && !editingId && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-brick-200 mb-4">New Supplier</h2>
          <DynamicForm
            fields={SUPPLIER_FIELDS}
            values={formValues}
            onChange={(name, value) =>
              setFormValues((prev) => ({ ...prev, [name]: value }))
            }
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="Add Supplier"
          />
        </div>
      )}

      <ResourceList
        items={suppliers}
        titleKey="name"
        columns={[
          {
            label: "Phone",
            value: (s) => (s.phone ? PhoneInput.formatPhoneForDisplay(s.phone) : "—"),
          },
          { label: "Address", value: (s) => s.address },
        ]}
        onItemClick={handleEdit}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        editingId={editingId || undefined}
        renderEditForm={() => (
          <DynamicForm
            fields={SUPPLIER_FIELDS}
            values={formValues}
            onChange={(name, value) =>
              setFormValues((prev) => ({ ...prev, [name]: value }))
            }
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="Save Changes"
          />
        )}
        emptyMessage="No suppliers yet. Add one above."
      />
    </div>
  );
}
