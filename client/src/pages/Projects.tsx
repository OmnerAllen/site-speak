import { useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { DynamicForm } from "../components/DynamicForm";
import { ResourceList } from "../components/ResourceList";
import { api } from "../api";
import type { FormFieldConfig, Project } from "../types";

const PROJECT_FIELDS: FormFieldConfig[] = [
  {
    type: "small-text",
    label: "Project Name",
    name: "name",
    placeholder: "e.g. Downtown Office Renovation",
    required: true,
  },
  {
    type: "large-text",
    label: "Address",
    name: "address",
    placeholder: "e.g. 123 Main St, Provo, UT",
    required: true,
  },
];

function emptyFormValues(): Record<string, string> {
  return { name: "", address: "" };
}

function projectToFormValues(p: Project): Record<string, string> {
  return { name: p.name, address: p.address };
}

export default function Projects() {
  const queryClient = useQueryClient();
  const { data: projects } = useSuspenseQuery({
    queryKey: ["my-projects"],
    queryFn: api.getProjects,
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; address: string }) =>
      api.createProject(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-projects"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name: string;
      address: string;
    }) => api.updateProject(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-projects"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-projects"] }),
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

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setFormValues(projectToFormValues(project));
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormValues(emptyFormValues());
  };

  const handleSubmit = (values: Record<string, string>) => {
    const body = { name: values.name, address: values.address };

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
            + Add Project
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-brick-200 mb-4">
            {editingId ? "Edit Project" : "New Project"}
          </h2>
          <DynamicForm
            fields={PROJECT_FIELDS}
            values={formValues}
            onChange={(name, value) =>
              setFormValues((prev) => ({ ...prev, [name]: value }))
            }
            onSubmit={handleSubmit}
            submitLabel={editingId ? "Save Changes" : "Add Project"}
            onCancel={handleCancel}
          />
        </div>
      )}

      <ResourceList
        items={projects}
        titleKey="name"
        columns={[
          { label: "Address", value: (p) => p.address },
          {
            label: "Created",
            value: (p) => (
              <span className="font-mono text-brick-500">
                {new Date(p.createdAt).toLocaleDateString()}
              </span>
            ),
          },
        ]}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        emptyMessage="No projects found for your company."
      />
    </div>
  );
}
