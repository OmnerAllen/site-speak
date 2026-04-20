import { useMemo, useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DynamicForm } from "../components/DynamicForm";
import { ResourceList } from "../components/ResourceList";
import { ResourceNav } from "../components/ResourceNav";
import { api } from "../api";
import type { Equipment, FormFieldConfig, Supplier } from "../types";

function buildEquipmentFields(suppliers: Supplier[]): FormFieldConfig[] {
  return [
    {
      type: "small-text",
      label: "Name",
      name: "name",
      placeholder: "e.g. Mini Excavator (3.5 Ton)",
      required: true,
    },
    {
      type: "money",
      label: "Cost Per Day",
      name: "costPerDay",
      placeholder: "0.00",
      required: true,
    },
    {
      type: "money",
      label: "Cost Half Day",
      name: "costHalfDay",
      placeholder: "0.00",
      required: true,
    },
    {
      type: "select",
      label: "Rental supplier",
      name: "rentalSupplierId",
      required: true,
      options: suppliers.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    },
  ];
}

function emptyFormValues(): Record<string, string> {
  return {
    name: "",
    costPerDay: "",
    costHalfDay: "",
    rentalSupplierId: "",
  };
}

function equipmentToFormValues(e: Equipment): Record<string, string> {
  return {
    name: e.name,
    costPerDay: String(e.costPerDay),
    costHalfDay: String(e.costHalfDay),
    rentalSupplierId: e.rentalSupplierId ?? "",
  };
}

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [{ data: equipment }, { data: suppliers }] = useSuspenseQueries({
    queries: [
      { queryKey: ["equipment"], queryFn: api.getEquipment },
      { queryKey: ["suppliers"], queryFn: api.getSuppliers },
    ],
  });

  const fields = useMemo(
    () => buildEquipmentFields(suppliers),
    [suppliers],
  );

  const createMutation = useMutation({
    mutationFn: (body: {
      name: string;
      costPerDay: number;
      costHalfDay: number;
      rentalSupplierId: string;
    }) => api.createEquipment(body),
    onSuccess: () => {
      toast.success("Equipment created successfully.");
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: () => toast.error("Could not create equipment."),
  });

  const updateMutation = useMutation({
    mutationFn: (args: {
      id: string;
      name: string;
      costPerDay: number;
      costHalfDay: number;
      rentalSupplierId: string;
    }) =>
      api.updateEquipment(args.id, {
        name: args.name,
        costPerDay: args.costPerDay,
        costHalfDay: args.costHalfDay,
        rentalSupplierId: args.rentalSupplierId,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["equipment"] }),
    onError: () => toast.error("Could not update equipment."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEquipment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["equipment"] }),
    onError: () => toast.error("Could not delete equipment."),
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

  const handleEdit = (item: Equipment) => {
    setEditingId(item.id);
    setFormValues(equipmentToFormValues(item));
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormValues(emptyFormValues());
  };

  const handleSubmit = (values: Record<string, string>) => {
    if (!values.rentalSupplierId) {
      toast.error("Choose a rental supplier.");
      return;
    }

    const payload = {
      name: values.name,
      costPerDay: parseFloat(values.costPerDay) || 0,
      costHalfDay: parseFloat(values.costHalfDay) || 0,
      rentalSupplierId: values.rentalSupplierId,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
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
              + Add Equipment
            </button>
          ) : undefined
        }
      />

      {showForm && !editingId && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-brick-200 mb-4">New Equipment</h2>
          <DynamicForm
            fields={fields}
            values={formValues}
            onChange={(name, value) =>
              setFormValues((prev) => ({ ...prev, [name]: value }))
            }
            onSubmit={handleSubmit}
            submitLabel="Add Equipment"
            onCancel={handleCancel}
          />
        </div>
      )}

      <ResourceList
        items={equipment}
        titleKey="name"
        columns={[
          {
            label: "Full Day",
            value: (e) => (
              <span className="font-mono text-grass-500">
                ${e.costPerDay.toFixed(2)}
              </span>
            ),
          },
          {
            label: "Half Day",
            value: (e) => (
              <span className="font-mono text-grass-500">
                ${e.costHalfDay.toFixed(2)}
              </span>
            ),
          },
          { label: "Rental", value: (e) => e.rentalSupplierName || "—" },
        ]}
        onItemClick={handleEdit}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        editingId={editingId || undefined}
        renderEditForm={() => (
          <DynamicForm
            fields={fields}
            values={formValues}
            onChange={(name, value) =>
              setFormValues((prev) => ({ ...prev, [name]: value }))
            }
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            onCancel={handleCancel}
          />
        )}
        emptyMessage="No equipment yet. Add one above."
      />
    </div>
  );
}
