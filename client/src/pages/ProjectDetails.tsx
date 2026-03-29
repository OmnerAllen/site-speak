import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api";
import type { ProjectDetails, ProjectStage } from "../types";

const STAGE_ORDER: ProjectStage["name"][] = ["demo", "prep", "build/install", "qa"];

type StageFormState = Record<ProjectStage["name"], { details: string; notes: string }>;

interface ProjectEditorState {
  name: string;
  address: string;
  overview: string;
  stages: StageFormState;
}

function stageLabel(name: ProjectStage["name"]): string {
  if (name === "build/install") return "Build/Install";
  if (name === "qa") return "QA (Quality Assurance)";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function toEditorState(project: ProjectDetails): ProjectEditorState {
  const baseStages: StageFormState = {
    demo: { details: "", notes: "" },
    prep: { details: "", notes: "" },
    "build/install": { details: "", notes: "" },
    qa: { details: "", notes: "" },
  };

  for (const stage of project.stages) {
    baseStages[stage.name] = {
      details: stage.details ?? "",
      notes: stage.notes ?? "",
    };
  }

  return {
    name: project.name,
    address: project.address,
    overview: project.overview ?? "",
    stages: baseStages,
  };
}

function editorPayload(form: ProjectEditorState) {
  return {
    name: form.name,
    address: form.address,
    overview: form.overview,
    stages: STAGE_ORDER.map((name) => ({
      name,
      details: form.stages[name].details,
      notes: form.stages[name].notes,
    })),
  };
}

function emptyEditorState(): ProjectEditorState {
  return {
    name: "",
    address: "",
    overview: "",
    stages: {
      demo: { details: "", notes: "" },
      prep: { details: "", notes: "" },
      "build/install": { details: "", notes: "" },
      qa: { details: "", notes: "" },
    },
  };
}

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreateMode = !id || id === "new";
  const projectId = isCreateMode ? null : id;
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project-details", projectId],
    queryFn: () => api.getProjectDetails(projectId as string),
    enabled: !!projectId,
  });

  const baseState = useMemo(() => {
    if (isCreateMode) return emptyEditorState();
    if (project) return toEditorState(project);
    return emptyEditorState();
  }, [isCreateMode, project]);

  const [draft, setDraft] = useState<ProjectEditorState | null>(null);
  const form = draft ?? baseState;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = editorPayload(form);

      if (isCreateMode) {
        const created = await api.createProject({
          name: payload.name,
          address: payload.address,
          overview: payload.overview,
        });

        await api.updateProjectDetails(created.id, payload);
        return created.id;
      }

      await api.updateProjectDetails(projectId as string, payload);
      return projectId as string;
    },
    onSuccess: (savedProjectId) => {
      toast.success(isCreateMode ? "Project created." : "Project saved.");
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      setDraft(null);

      if (savedProjectId) {
        queryClient.invalidateQueries({ queryKey: ["project-details", savedProjectId] });
      }

      navigate("/projects", { replace: true });
    },
    onError: () => {
      toast.error(isCreateMode ? "Unable to create project." : "Unable to save project changes.");
    },
  });

  const hasChanges = useMemo(() => {
    return JSON.stringify(editorPayload(form)) !== JSON.stringify(editorPayload(baseState));
  }, [form, baseState]);

  const handleCancel = () => {
    navigate("/projects");
  };

  const updateForm = (updater: (current: ProjectEditorState) => ProjectEditorState) => {
    setDraft((prev) => updater(prev ?? baseState));
  };

  if (!isCreateMode && isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 md:p-12 text-brick-300 animate-pulse">
        Loading project...
      </div>
    );
  }

  if (!isCreateMode && !project && !isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-4">
        <Link to="/projects" className="text-sm text-brick-400 hover:text-brick-200 transition-colors">
          ← Back to Projects
        </Link>
        <p className="text-brick-300">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-8">
      <div className="sticky top-16 z-40 -mx-6 md:-mx-12 px-6 md:px-12 py-4 bg-brick-950/95 backdrop-blur border-b border-brick-800">
        <div className="flex items-center justify-between gap-4">
        <div>
         
          <h1 className="text-2xl md:text-3xl font-bold text-brick-100 mt-2">
            {isCreateMode ? "New Project" : "Project Details"}
          </h1>
          
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saveMutation.isPending}
            className="px-4 py-2 text-brick-300 hover:text-brick-100 border border-brick-600 rounded-md hover:bg-brick-800 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saveMutation.isPending || !form.name.trim() || !form.address.trim() || (!isCreateMode && !hasChanges)}
            onClick={() => saveMutation.mutate()}
            className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saveMutation.isPending ? "Saving..." : isCreateMode ? "Save Project" : "Save Changes"}
          </button>
        </div>
        </div>
      </div>

      <section className="space-y-4 bg-brick-900 border border-brick-800 rounded-lg p-5 md:p-6">
        <h2 className="text-lg font-semibold text-brick-200">Project Info</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brick-300">Project Name</label>
            <input
              value={form.name}
              onChange={(e) =>
                updateForm((current) => ({ ...current, name: e.target.value }))
              }
              className="px-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brick-300">Address</label>
            <input
              value={form.address}
              onChange={(e) =>
                updateForm((current) => ({ ...current, address: e.target.value }))
              }
              className="px-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-brick-300">Project Overview</label>
          <textarea
            value={form.overview}
            onChange={(e) =>
              updateForm((current) => ({ ...current, overview: e.target.value }))
            }
            placeholder="Describe the project at a high level..."
            className="px-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500 min-h-35"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-brick-200">Stages</h2>

        {STAGE_ORDER.map((stageName) => (
          <div key={stageName} className="bg-brick-900 border border-brick-800 rounded-lg p-5 md:p-6 space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-brick-200">{stageLabel(stageName)}</h3>
              <p className="text-xs text-brick-500 mt-1">Materials and equipment coming soon.</p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-brick-300">Details</label>
                <textarea
                  value={form.stages[stageName].details}
                  onChange={(e) =>
                    updateForm((current) => ({
                      ...current,
                      stages: {
                        ...current.stages,
                        [stageName]: { ...current.stages[stageName], details: e.target.value },
                      },
                    }))
                  }
                  placeholder="What are we doing during this stage?"
                  className="px-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500 min-h-30"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-brick-400">Notes (optional)</label>
                <textarea
                  value={form.stages[stageName].notes}
                  onChange={(e) =>
                    updateForm((current) => ({
                      ...current,
                      stages: {
                        ...current.stages,
                        [stageName]: { ...current.stages[stageName], notes: e.target.value },
                      },
                    }))
                  }
                  placeholder="Secondary notes, reminders, or context..."
                  className="px-3 py-2 bg-brick-100/90 text-brick-800 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500 min-h-23.75 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
