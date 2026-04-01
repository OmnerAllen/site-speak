import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DynamicForm } from "../components/DynamicForm";
import { api } from "../api";
import type { FormFieldConfig, ProjectDetails, ProjectStage } from "../types";

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

function stageFieldPrefix(name: ProjectStage["name"]): string {
  return name === "build/install" ? "build_install" : name;
}

function buildProjectFormFields(): FormFieldConfig[] {
  const fields: FormFieldConfig[] = [
    { type: "heading", name: "h_project", label: "Project Info" },
    {
      type: "small-text",
      name: "name",
      label: "Project Name",
      placeholder: "e.g. Riverside remodel",
      required: true,
    },
    {
      type: "small-text",
      name: "address",
      label: "Address",
      placeholder: "Street, city, state",
      required: true,
    },
    {
      type: "large-text",
      name: "overview",
      label: "Project Overview",
      placeholder: "Describe the project at a high level...",
      required: false,
    },
  ];

  for (const stage of STAGE_ORDER) {
    const p = stageFieldPrefix(stage);
    fields.push(
      {
        type: "heading",
        name: `h_${p}`,
        label: stageLabel(stage),
        description: "Materials and equipment coming soon.",
      },
      {
        type: "large-text",
        name: `${p}_details`,
        label: "Details",
        placeholder: "What are we doing during this stage?",
        required: false,
      },
      {
        type: "large-text",
        name: `${p}_notes`,
        label: "Notes (optional)",
        placeholder: "Secondary notes, reminders, or context...",
        required: false,
      },
    );
  }

  return fields;
}

const PROJECT_FORM_FIELDS = buildProjectFormFields();

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

function editorStateToValues(s: ProjectEditorState): Record<string, string> {
  const v: Record<string, string> = {
    name: s.name,
    address: s.address,
    overview: s.overview,
  };
  for (const stage of STAGE_ORDER) {
    const p = stageFieldPrefix(stage);
    v[`${p}_details`] = s.stages[stage].details;
    v[`${p}_notes`] = s.stages[stage].notes;
  }
  return v;
}

function valuesToEditorState(v: Record<string, string>): ProjectEditorState {
  const stages = {} as StageFormState;
  for (const stage of STAGE_ORDER) {
    const p = stageFieldPrefix(stage);
    stages[stage] = {
      details: v[`${p}_details`] ?? "",
      notes: v[`${p}_notes`] ?? "",
    };
  }
  return {
    name: v.name ?? "",
    address: v.address ?? "",
    overview: v.overview ?? "",
    stages,
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

  const baseValues = useMemo(() => editorStateToValues(baseState), [baseState]);

  const [draftValues, setDraftValues] = useState<Record<string, string> | null>(null);
  const formValues = draftValues ?? baseValues;

  const saveMutation = useMutation({
    mutationFn: async (state: ProjectEditorState) => {
      const payload = editorPayload(state);

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
      setDraftValues(null);

      if (savedProjectId) {
        queryClient.invalidateQueries({ queryKey: ["project-details", savedProjectId] });
      }

      navigate("/projects", { replace: true });
    },
    onError: () => {
      toast.error(isCreateMode ? "Unable to create project." : "Unable to save project changes.");
    },
  });

  const currentState = useMemo(() => valuesToEditorState(formValues), [formValues]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(editorPayload(currentState)) !== JSON.stringify(editorPayload(baseState));
  }, [currentState, baseState]);

  const handleCancel = () => {
    navigate("/projects");
  };

  const handleSubmit = (values: Record<string, string>) => {
    const state = valuesToEditorState(values);
    if (!state.name.trim() || !state.address.trim()) {
      toast.error("Project name and address are required.");
      return;
    }
    saveMutation.mutate(state);
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

  const submitLabel = saveMutation.isPending
    ? "Saving..."
    : isCreateMode
      ? "Save Project"
      : "Save Changes";

  const submitDisabled =
    saveMutation.isPending ||
    !formValues.name?.trim() ||
    !formValues.address?.trim() ||
    (!isCreateMode && !hasChanges);

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-8">
      <div className="py-4">
        <h1 className="text-2xl md:text-3xl font-bold text-brick-100 mt-2">
          {isCreateMode ? "New Project" : "Project Details"}
        </h1>
      </div>

      <DynamicForm
        fields={PROJECT_FORM_FIELDS}
        values={formValues}
        onChange={(name, value) =>
          setDraftValues((prev) => ({ ...(prev ?? baseValues), [name]: value }))
        }
        onSubmit={handleSubmit}
        submitLabel={submitLabel}
        onCancel={handleCancel}
        submitDisabled={submitDisabled}
        cancelDisabled={saveMutation.isPending}
      />
    </div>
  );
}
