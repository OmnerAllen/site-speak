import { useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DynamicForm } from "../components/DynamicForm";
import { ResourceList } from "../components/ResourceList";
import { api } from "../api";
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
    type: "money",
    label: "Price Per Unit",
    name: "pricePerUnit",
    placeholder: "0.00",
    required: true,
  },
];


function emptyFormValues(): Record<string, string> {
  return {
    productName: "",
    supplierName: "",
    productType: "",
    pricePerUnit: "",
  };
}

function materialToFormValues(m: Material): Record<string, string> {
  return {
    productName: m.productName,
    supplierName: m.supplierName,
    unit: m.unit,
    productType: m.productType,
    pricePerUnit: String(m.pricePerUnit),
  };
}

function formatMaterialUnitPrice(m: Material): string {
  const price = m.pricePerUnit.toFixed(2);
  // Defaulting to '$' since currency field is removed
  return `$${price}`;
}

export default function Materials() {
  const queryClient = useQueryClient();
  const { data: materials } = useSuspenseQuery({
    queryKey: ["materials"],
    queryFn: api.getMaterials,
  });

  const createMutation = useMutation({
    mutationFn: (body: Omit<Material, "id">) => api.createMaterial(body),
    onSuccess: () => {
      toast.success("Material created successfully.");
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Material) => api.updateMaterial(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["materials"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMaterial(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["materials"] }),
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
    const body = {
      productName: values.productName,
      supplierName: values.supplierName,
      unit: values.unit,
      productType: values.productType,
      pricePerUnit: parseFloat(values.pricePerUnit) || 0,
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
      {!showForm && (
        <div className="flex items-center justify-end mb-6 pb-4 border-b border-brick-800">
          <button
            onClick={handleAdd}
            className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer"
          >
            + Add Material
          </button>
        </div>
      )}

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

      <ResourceList
        items={materials}
        titleKey="productName"
        badgeKey="productType"
        columns={[
          { label: "Supplier", value: (m) => m.supplierName || "—" },
          {
            label: "Price",
            value: (m) => (
              <span className="font-mono text-grass-500">
                {formatMaterialUnitPrice(m)}
                <span className="text-brick-600 font-sans">
                  /{m.unit.toLowerCase()}
                </span>
              </span>
            ),
          },
        ]}
        onItemClick={handleEdit}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        emptyMessage="No materials yet. Add one above."
      />
    </div>
  );
}
