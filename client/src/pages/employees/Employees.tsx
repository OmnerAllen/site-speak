import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DynamicForm } from "../../components/forms/DynamicForm";
import { ResourceList } from "../../components/resource-list/ResourceList";
import { api } from "../../api";
import type { Employee, FormFieldConfig } from "../../types";

const EMPLOYEE_FIELDS: FormFieldConfig[] = [
  {
    type: "small-text",
    label: "Name",
    name: "name",
    placeholder: "e.g. Jordan Lee",
    required: true,
  },
  {
    type: "select",
    label: "Role",
    name: "type",
    required: true,
    options: [
      { value: "admin", label: "Admin" },
      { value: "worker", label: "Worker" },
    ],
  },
];

function emptyFormValues(): Record<string, string> {
  return { name: "", type: "" };
}

function employeeToFormValues(e: Employee): Record<string, string> {
  return { name: e.name, type: e.type };
}

export default function EmployeesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: employees } = useSuspenseQuery({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
  });

  const createMutation = useMutation({
    mutationFn: (body: Omit<Employee, "id">) => api.createEmployee(body),
    onSuccess: () => {
      toast.success("Employee created.");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Employee) => api.updateEmployee(id, body),
    onSuccess: () => {
      toast.success("Employee updated.");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEmployee(id),
    onSuccess: () => {
      toast.success("Employee removed.");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(emptyFormValues());

  const handleAdd = () => {
    setEditingId(null);
    setFormValues(emptyFormValues());
    setShowForm(true);
  };

  const handleEdit = (item: Employee) => {
    setEditingId(item.id);
    setFormValues(employeeToFormValues(item));
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormValues(emptyFormValues());
  };

  const handleSubmit = (values: Record<string, string>) => {
    const body = {
      name: values.name.trim(),
      type: values.type as Employee["type"],
    };
    if (!body.name || !body.type) {
      toast.error("Name and role are required.");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...body });
    } else {
      createMutation.mutate(body);
    }
    handleCancel();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-brick-800">
        <h1 className="text-xl md:text-2xl font-bold text-brick-100">Employees</h1>
        {!showForm ? (
          <button
            type="button"
            onClick={handleAdd}
            className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer shrink-0"
          >
            + Add Employee
          </button>
        ) : null}
      </div>

      {showForm && !editingId && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-brick-200 mb-4">
            New Employee
          </h2>
          <DynamicForm
            fields={EMPLOYEE_FIELDS}
            values={formValues}
            onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
            onSubmit={handleSubmit}
            submitLabel="Add Employee"
            onCancel={handleCancel}
          />
        </div>
      )}

      <ResourceList
        items={employees}
        titleKey="name"
        badgeKey="type"
        columns={[]}
        renderRowActions={(item) => (
          <button
            type="button"
            className="shrink-0 bg-grass-700 text-grass-100 font-medium py-1 px-3 rounded-md text-sm hover:bg-grass-600 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/work-logs?employeeId=${item.id}`);
            }}
          >
            Work Logs
          </button>
        )}
        onItemClick={handleEdit}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        emptyMessage="No employees yet. Add your team above."
        editingId={editingId || undefined}
        renderEditForm={() => (
          <DynamicForm
            fields={EMPLOYEE_FIELDS}
            values={formValues}
            onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            onCancel={handleCancel}
          />
        )}
      />
    </div>
  );
}
