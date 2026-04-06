import { useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DynamicForm } from "../components/DynamicForm";
import { ResourceList } from "../components/ResourceList";
import { ResourceNav } from "../components/ResourceNav";
import { api } from "../api";
import type { Equipment, FormFieldConfig } from "../types";

const EQUIPMENT_FIELDS: FormFieldConfig[] = [
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
    type: "small-text",
    label: "Place to Rent From",
    name: "placeToRentFrom",
    placeholder: "e.g. United Rentals (Provo)",
    required: true,
  },
];

function emptyFormValues(): Record<string, string> {
  return { name: "", costPerDay: "", costHalfDay: "", placeToRentFrom: "" };
}

function equipmentToFormValues(e: Equipment): Record<string, string> {
  return {
    name: e.name,
    costPerDay: String(e.costPerDay),
    costHalfDay: String(e.costHalfDay),
    placeToRentFrom: e.placeToRentFrom,
  };
}

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const { data: equipment } = useSuspenseQuery({
    queryKey: ["equipment"],
    queryFn: api.getEquipment,
  });

  const createMutation = useMutation({
    mutationFn: (body: Omit<Equipment, "id">) => api.createEquipment(body),
    onSuccess: () => {
      toast.success("Equipment created successfully.");
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Equipment) => api.updateEquipment(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["equipment"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEquipment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["equipment"] }),
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
    const body = {
      name: values.name,
      costPerDay: parseFloat(values.costPerDay) || 0,
      costHalfDay: parseFloat(values.costHalfDay) || 0,
      placeToRentFrom: values.placeToRentFrom,
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
      <ResourceNav />
      {!showForm && (
        <div className="flex items-center justify-end mb-6 pb-4 border-b border-brick-800">
          <button
            onClick={handleAdd}
            className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer"
          >
            + Add Equipment
          </button>
        </div>
      )}

      {showForm && !editingId && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-brick-200 mb-4">New Equipment</h2>
          <DynamicForm
            fields={EQUIPMENT_FIELDS}
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
          { label: "Rental", value: (e) => e.placeToRentFrom },
        ]}
        onItemClick={handleEdit}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        editingId={editingId || undefined}
        renderEditForm={() => (
          <DynamicForm
            fields={EQUIPMENT_FIELDS}
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
