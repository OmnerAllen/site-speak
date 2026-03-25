import { useState } from "react";
import { DynamicForm } from "../components/DynamicForm";
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      setEquipment((prev) => prev.filter((e) => e.id !== id));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-brick-800">
        <h1 className="text-2xl font-bold text-brick-100">
          Equipment{" "}
          <span className="ml-2 bg-brick-800 text-brick-300 text-sm px-2.5 py-0.5 rounded-full">
            {equipment.length}
          </span>
        </h1>
        {!showForm && (
          <button
            onClick={handleAdd}
            className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer"
          >
            + Add Equipment
          </button>
        )}
      </div>

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

      {equipment.length === 0 ? (
        <p className="text-brick-400 italic bg-brick-900/50 p-6 rounded-lg border border-brick-800/50 text-center">
          No equipment yet. Add one above.
        </p>
      ) : (
        <div className="space-y-3">
          {equipment.map((e) => (
            <div
              key={e.id}
              className="bg-brick-900 border border-brick-800 rounded-lg p-5 hover:border-brick-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-brick-200 truncate mb-2">
                    {e.name}
                  </h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-brick-400">
                    <span>
                      <span className="text-brick-500">Full Day:</span>{" "}
                      <span className="font-mono text-grass-400">
                        ${e.costPerDay.toFixed(2)}
                      </span>
                    </span>
                    <span>
                      <span className="text-brick-500">Half Day:</span>{" "}
                      <span className="font-mono text-grass-400">
                        ${e.costHalfDay.toFixed(2)}
                      </span>
                    </span>
                    <span>
                      <span className="text-brick-500">Rental:</span>{" "}
                      {e.placeToRentFrom}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(e)}
                    className="text-sm text-brick-300 hover:text-brick-100 px-3 py-1.5 border border-brick-700 rounded-md hover:bg-brick-800 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    onBlur={() => setConfirmDeleteId(null)}
                    className={`text-sm px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      confirmDeleteId === e.id
                        ? "bg-radioactive-700 text-radioactive-100 border border-radioactive-600"
                        : "text-brick-400 hover:text-radioactive-300 border border-brick-700 hover:border-radioactive-800"
                    }`}
                  >
                    {confirmDeleteId === e.id ? "Confirm?" : "Delete"}
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
