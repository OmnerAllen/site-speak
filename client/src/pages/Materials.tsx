import { useState } from "react";
import { DynamicForm } from "../components/DynamicForm";
import type { FormFieldConfig, Material } from "../types";

const MATERIAL_FIELDS: FormFieldConfig[] = [
  {
    type: "small-text",
    label: "Product Name",
    name: "productName",
    placeholder: "e.g. Hammer",
    required: true,
  },
  {
    type: "small-text",
    label: "Supplier",
    name: "supplierName",
    placeholder: "e.g. Stanley",
    required: true,
  },
  {
    type: "small-text",
    label: "Unit",
    name: "unit",
    placeholder: "e.g. Piece, Sack, Box",
    required: true,
  },
  {
    type: "small-text",
    label: "Product Type",
    name: "productType",
    placeholder: "e.g. Tool, Cement, Plumbing",
    required: true,
  },
  {
    type: "number",
    label: "Price Per Unit",
    name: "pricePerUnit",
    placeholder: "0.00",
    required: true,
    step: "0.01",
  },
  {
    type: "small-text",
    label: "Currency",
    name: "currency",
    placeholder: "USD",
    required: true,
  },
];

const INITIAL_MATERIALS: Material[] = [
  {
    id: "1",
    productName: "Hammer",
    supplierName: "Lippro",
    unit: "Piece",
    productType: "Tool",
    pricePerUnit: 2.95,
    currency: "USD",
  },
  {
    id: "2",
    productName: "Hand Saw",
    supplierName: "Tekiro",
    unit: "Piece",
    productType: "Tool",
    pricePerUnit: 3.54,
    currency: "USD",
  },
  {
    id: "3",
    productName: "Ceramic Tile",
    supplierName: "Roman",
    unit: "Box",
    productType: "Tile",
    pricePerUnit: 4.42,
    currency: "USD",
  },
  {
    id: "4",
    productName: "Wall Paint",
    supplierName: "Dulux",
    unit: "Can",
    productType: "Paint",
    pricePerUnit: 7.08,
    currency: "USD",
  },
  {
    id: "5",
    productName: "PVC Pipe",
    supplierName: "Wavin",
    unit: "Meter",
    productType: "Plumbing",
    pricePerUnit: 0.88,
    currency: "USD",
  },
  {
    id: "6",
    productName: "Tiga Roda 50 kg",
    supplierName: "Tiga Roda",
    unit: "Sack",
    productType: "Cement",
    pricePerUnit: 4.48,
    currency: "USD",
  },
  {
    id: "7",
    productName: "3000 PSI Standard Ready-Mix",
    supplierName: "Geneva Rock",
    unit: "1 cubic yard",
    productType: "Concrete",
    pricePerUnit: 145.0,
    currency: "USD",
  },
  {
    id: "8",
    productName: "Rebar 10mm",
    supplierName: "Gunung Steel",
    unit: "Meter",
    productType: "Steel",
    pricePerUnit: 1.47,
    currency: "USD",
  },
];

function emptyFormValues(): Record<string, string> {
  return {
    productName: "",
    supplierName: "",
    unit: "",
    productType: "",
    pricePerUnit: "",
    currency: "USD",
  };
}

function materialToFormValues(m: Material): Record<string, string> {
  return {
    productName: m.productName,
    supplierName: m.supplierName,
    unit: m.unit,
    productType: m.productType,
    pricePerUnit: String(m.pricePerUnit),
    currency: m.currency,
  };
}

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
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

  const handleEdit = (material: Material) => {
    setEditingId(material.id);
    setFormValues(materialToFormValues(material));
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormValues(emptyFormValues());
  };

  const handleSubmit = (values: Record<string, string>) => {
    if (editingId) {
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === editingId
            ? {
                ...m,
                productName: values.productName,
                supplierName: values.supplierName,
                unit: values.unit,
                productType: values.productType,
                pricePerUnit: parseFloat(values.pricePerUnit) || 0,
                currency: values.currency,
              }
            : m,
        ),
      );
    } else {
      const newMaterial: Material = {
        id: crypto.randomUUID(),
        productName: values.productName,
        supplierName: values.supplierName,
        unit: values.unit,
        productType: values.productType,
        pricePerUnit: parseFloat(values.pricePerUnit) || 0,
        currency: values.currency,
      };
      setMaterials((prev) => [newMaterial, ...prev]);
    }
    handleCancel();
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-brick-800">
        <h1 className="text-2xl font-bold text-brick-100">
          Materials{" "}
          <span className="ml-2 bg-brick-800 text-brick-300 text-sm px-2.5 py-0.5 rounded-full">
            {materials.length}
          </span>
        </h1>
        {!showForm && (
          <button
            onClick={handleAdd}
            className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer"
          >
            + Add Material
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-brick-200 mb-4">
            {editingId ? "Edit Material" : "New Material"}
          </h2>
          <DynamicForm
            fields={MATERIAL_FIELDS}
            values={formValues}
            onChange={(name, value) =>
              setFormValues((prev) => ({ ...prev, [name]: value }))
            }
            onSubmit={handleSubmit}
            submitLabel={editingId ? "Save Changes" : "Add Material"}
            onCancel={handleCancel}
          />
        </div>
      )}

      {materials.length === 0 ? (
        <p className="text-brick-400 italic bg-brick-900/50 p-6 rounded-lg border border-brick-800/50 text-center">
          No materials yet. Add one above.
        </p>
      ) : (
        <div className="space-y-3">
          {materials.map((m) => (
            <div
              key={m.id}
              className="bg-brick-900 border border-brick-800 rounded-lg p-5 hover:border-brick-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-brick-200 truncate">
                      {m.productName}
                    </h3>
                    <span className="shrink-0 text-xs bg-brick-800 text-brick-300 px-2 py-0.5 rounded-full">
                      {m.productType}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-brick-400">
                    <span>
                      <span className="text-brick-500">Supplier:</span>{" "}
                      {m.supplierName}
                    </span>
                    <span>
                      <span className="text-brick-500">Unit:</span> {m.unit}
                    </span>
                    <span className="font-mono text-grass-400">
                      {m.currency} {m.pricePerUnit.toFixed(2)}
                      <span className="text-brick-500 font-sans">
                        /{m.unit.toLowerCase()}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(m)}
                    className="text-sm text-brick-300 hover:text-brick-100 px-3 py-1.5 border border-brick-700 rounded-md hover:bg-brick-800 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    onBlur={() => setConfirmDeleteId(null)}
                    className={`text-sm px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      confirmDeleteId === m.id
                        ? "bg-radioactive-700 text-radioactive-100 border border-radioactive-600"
                        : "text-brick-400 hover:text-radioactive-300 border border-brick-700 hover:border-radioactive-800"
                    }`}
                  >
                    {confirmDeleteId === m.id ? "Confirm?" : "Delete"}
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
