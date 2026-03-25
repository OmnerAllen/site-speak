import { useState } from "react";
import { DynamicForm } from "../components/DynamicForm";
import { ResourceList } from "../components/ResourceList";
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
    type: "number",
    label: "Cost Per Day ($)",
    name: "costPerDay",
    placeholder: "0.00",
    required: true,
    step: "0.01",
  },
  {
    type: "number",
    label: "Cost Half Day ($)",
    name: "costHalfDay",
    placeholder: "0.00",
    required: true,
    step: "0.01",
  },
  {
    type: "small-text",
    label: "Place to Rent From",
    name: "placeToRentFrom",
    placeholder: "e.g. United Rentals (Provo)",
    required: true,
  },
];

const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: "1",
    name: "Mini Excavator (3.5 Ton)",
    costPerDay: 385.0,
    costHalfDay: 245.0,
    placeToRentFrom: "Ace Rents (Provo)",
  },
  {
    id: "2",
    name: "Skid Steer (Tracked)",
    costPerDay: 340.0,
    costHalfDay: 215.0,
    placeToRentFrom: "United Rentals (Provo)",
  },
  {
    id: "3",
    name: "Telehandler (5500lb Reach)",
    costPerDay: 550.0,
    costHalfDay: 360.0,
    placeToRentFrom: "Sunbelt Rentals (Lindon)",
  },
  {
    id: "4",
    name: "Concrete Boom Pump (38M)",
    costPerDay: 950.0,
    costHalfDay: 600.0,
    placeToRentFrom: "United Rentals (Provo)",
  },
  {
    id: "5",
    name: "Ride-on Power Trowel",
    costPerDay: 220.0,
    costHalfDay: 145.0,
    placeToRentFrom: "Ace Rents (Spanish Fork)",
  },
  {
    id: "6",
    name: "Towable Generator (20kW)",
    costPerDay: 195.0,
    costHalfDay: 120.0,
    placeToRentFrom: "Sunbelt Rentals (Orem)",
  },
  {
    id: "7",
    name: "Vibratory Soil Compactor",
    costPerDay: 295.0,
    costHalfDay: 185.0,
    placeToRentFrom: "United Rentals (Provo)",
  },
  {
    id: "8",
    name: "Scissor Lift (26ft Electric)",
    costPerDay: 155.0,
    costHalfDay: 95.0,
    placeToRentFrom: "Sunbelt Rentals (Lindon)",
  },
];

function emptyFormValues(): Record<string, string> {
  return {
    name: "",
    costPerDay: "",
    costHalfDay: "",
    placeToRentFrom: "",
  };
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
  const [equipment, setEquipment] = useState<Equipment[]>(INITIAL_EQUIPMENT);
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
    if (editingId) {
      setEquipment((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? {
                ...e,
                name: values.name,
                costPerDay: parseFloat(values.costPerDay) || 0,
                costHalfDay: parseFloat(values.costHalfDay) || 0,
                placeToRentFrom: values.placeToRentFrom,
              }
            : e,
        ),
      );
    } else {
      const newEquipment: Equipment = {
        id: crypto.randomUUID(),
        name: values.name,
        costPerDay: parseFloat(values.costPerDay) || 0,
        costHalfDay: parseFloat(values.costHalfDay) || 0,
        placeToRentFrom: values.placeToRentFrom,
      };
      setEquipment((prev) => [newEquipment, ...prev]);
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
            + Add Equipment
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-brick-200 mb-4">
            {editingId ? "Edit Equipment" : "New Equipment"}
          </h2>
          <DynamicForm
            fields={EQUIPMENT_FIELDS}
            values={formValues}
            onChange={(name, value) =>
              setFormValues((prev) => ({ ...prev, [name]: value }))
            }
            onSubmit={handleSubmit}
            submitLabel={editingId ? "Save Changes" : "Add Equipment"}
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
        onEdit={handleEdit}
        onDelete={(id) =>
          setEquipment((prev) => prev.filter((e) => e.id !== id))
        }
        emptyMessage="No equipment yet. Add one above."
      />
    </div>
  );
}
