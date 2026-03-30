import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ResourceList } from "../components/ResourceList";
import { api } from "../api";

export default function Projects() {
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { data: projects } = useSuspenseQuery({
    queryKey: ["my-projects"],
    queryFn: api.getProjects,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      toast.success("Project deleted.");
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });

  const handleAdd = () => {
    navigate("/projects/new");
  };

  const openProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      <div className="flex items-center justify-end mb-6 pb-4 border-b border-brick-800">
        <button
          onClick={handleAdd}
          className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 transition-colors cursor-pointer"
        >
          + Add Project
        </button>
      </div>

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
        onItemClick={(project) => openProject(project.id)}
        onEdit={(project) => openProject(project.id)}
        editLabel="Open"
        onDelete={(id) => deleteMutation.mutate(id)}
        emptyMessage="No projects found for your company."
      />
    </div>
  );
}
