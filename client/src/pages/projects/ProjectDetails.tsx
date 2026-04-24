import { useCallback, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DynamicForm } from "../../components/forms/DynamicForm";
import { ProjectAiChatPanel } from "../../components/features/ProjectAiChatPanel";
import {
  ProjectMaterialEstimateSection,
  type EditorPrompt,
  type MaterialEstimateToolbarState,
  type ProjectMaterialEstimateHandle,
} from "../../components/features/ProjectMaterialEstimateSection";
import { api } from "../../api";
import { isAiChatEnabled } from "../../features";
import type { FormFieldConfig, ProjectDetails, ProjectStage } from "../../types";

const STAGE_ORDER: ProjectStage["name"][] = ["demo", "prep", "build/install", "qa"];

type StageFormState = Record<ProjectStage["name"], { details: string }>;

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
        description:
          "After the overview is filled, set radius under Materials & equipment and use Regenerate in the toolbar.",
      },
      {
        type: "large-text",
        name: `${p}_details`,
        label: "Details",
        placeholder: "What are we doing during this stage?",
        required: false,
      },
    );
  }

  return fields;
}

const PROJECT_FORM_FIELDS = buildProjectFormFields();

const PROJECT_EDITOR_FORM_ID = "project-editor-form";

type ProjectFormEditorSection = "info" | ProjectStage["name"];

const PROJECT_EDITOR_TABS: { id: ProjectFormEditorSection; label: string }[] = [
  { id: "info", label: "Project info" },
  { id: "demo", label: "Demo" },
  { id: "prep", label: "Prep" },
  { id: "build/install", label: "Build/Install" },
  { id: "qa", label: "QA" },
];

function projectFormFieldsForSection(section: ProjectFormEditorSection): FormFieldConfig[] {
  if (section === "info") {
    return PROJECT_FORM_FIELDS.filter((f) =>
      ["h_project", "name", "address", "overview"].includes(f.name),
    );
  }
  const p = stageFieldPrefix(section);
  return PROJECT_FORM_FIELDS.filter(
    (f) => f.name === `h_${p}` || f.name === `${p}_details`,
  );
}

function toEditorState(project: ProjectDetails): ProjectEditorState {
  const baseStages: StageFormState = {
    demo: { details: "" },
    prep: { details: "" },
    "build/install": { details: "" },
    qa: { details: "" },
  };

  for (const stage of project.stages) {
    baseStages[stage.name] = {
      details: stage.details ?? "",
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
  }
  return v;
}

function valuesToEditorState(v: Record<string, string>): ProjectEditorState {
  const stages = {} as StageFormState;
  for (const stage of STAGE_ORDER) {
    const p = stageFieldPrefix(stage);
    stages[stage] = {
      details: v[`${p}_details`] ?? "",
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
      notes: "",
    })),
  };
}

function emptyEditorState(): ProjectEditorState {
  return {
    name: "",
    address: "",
    overview: "",
    stages: {
      demo: { details: "" },
      prep: { details: "" },
      "build/install": { details: "" },
      qa: { details: "" },
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

  const [editorSection, setEditorSection] = useState<ProjectFormEditorSection>("info");
  const sectionFields = useMemo(
    () => projectFormFieldsForSection(editorSection),
    [editorSection],
  );

  const estimateSectionRef = useRef<ProjectMaterialEstimateHandle>(null);
  const [materialEstimatePending, setMaterialEstimatePending] = useState(false);
  const [materialResourcesDirty, setMaterialResourcesDirty] = useState(false);

  const onMaterialActionState = useCallback((next: MaterialEstimateToolbarState) => {
    setMaterialEstimatePending((prev) => (prev === next.estimatePending ? prev : next.estimatePending));
    setMaterialResourcesDirty((prev) => (prev === next.resourcesDirty ? prev : next.resourcesDirty));
  }, []);

  const getEditorPrompt = useCallback((): EditorPrompt => {
    const state = valuesToEditorState(formValues);
    return {
      overview: state.overview,
      stages: STAGE_ORDER.map((name) => ({
        name,
        details: state.stages[name].details,
        notes: "",
      })),
    };
  }, [formValues]);

  const handleFieldBlur = (name: string) => {
    if (name !== "overview") return;
    if (!isCreateMode) estimateSectionRef.current?.runEstimate();
  };

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
      await estimateSectionRef.current?.applyResourcesIfDirtyAsync();
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
      <div className="max-w-5xl mx-auto p-6 md:p-12 text-brick-200 animate-pulse">
        Loading project...
      </div>
    );
  }

  if (!isCreateMode && !project && !isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-4">
        <Link
          to="/projects"
          aria-label="Back to projects"
          title="Back"
          className="text-lg text-brick-400 hover:text-brick-200 transition-colors inline-flex items-center justify-center min-w-9"
        >
          ←
        </Link>
        <p className="text-brick-200">Project not found.</p>
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
    (!isCreateMode && !hasChanges && !materialResourcesDirty);

  const pageTitle = isCreateMode ? "New Project" : "Project Details";

  /** Existing project: one card for stage form + materials; create flow keeps a standalone form card. */
  const bundleFormWithMaterials = !isCreateMode && !!projectId;

  const sharedFormProps = {
    formId: PROJECT_EDITOR_FORM_ID,
    stickyActionBar: true as const,
    hideBottomActions: true as const,
    fields: sectionFields,
    values: formValues,
    onChange: (name: string, value: string) =>
      setDraftValues((prev) => ({ ...(prev ?? baseValues), [name]: value })),
    onFieldBlur: handleFieldBlur,
    onSubmit: handleSubmit,
    submitLabel,
    onCancel: handleCancel,
    submitDisabled,
    cancelDisabled: saveMutation.isPending,
    embedded: bundleFormWithMaterials,
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 pb-16 md:pb-12">
      <div className="sticky top-14 z-30 -mx-6 md:-mx-12 px-6 md:px-12 py-3 bg-brick-950/95 backdrop-blur-md border-b border-brick-800">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
            <Link
              to="/projects"
              aria-label="Back to projects"
              title="Back"
              className="text-lg text-brick-400 hover:text-brick-200 transition-colors shrink-0 inline-flex items-center justify-center min-w-9"
            >
              ←
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-brick-100 truncate">{pageTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-start xl:justify-end">
            {!isCreateMode && projectId ? (
              <>
                <button
                  type="button"
                  onClick={() => estimateSectionRef.current?.regenerateEstimate()}
                  disabled={materialEstimatePending}
                  className="rounded bg-brick-600 hover:bg-brick-500 text-brick-50 px-3 py-2 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {materialEstimatePending ? "Generating…" : "Regenerate"}
                </button>
                <span className="hidden sm:inline w-px h-6 bg-brick-700 shrink-0" aria-hidden />
              </>
            ) : null}
            <button
              type="button"
              onClick={handleCancel}
              disabled={saveMutation.isPending}
              className="px-3 py-2 text-brick-200 hover:text-brick-100 border border-brick-600 rounded-md hover:bg-brick-700 transition-colors text-xs sm:text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={PROJECT_EDITOR_FORM_ID}
              disabled={submitDisabled}
              className="bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-grass-600 text-xs sm:text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex gap-1 overflow-x-auto pb-2 mt-6 mb-4 border-b border-brick-800"
        role="tablist"
        aria-label="Project sections"
      >
        {PROJECT_EDITOR_TABS.map((tab) => {
          const active = editorSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setEditorSection(tab.id)}
              className={`shrink-0 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                active
                  ? "text-grass-400 bg-brick-900/50"
                  : "text-brick-200 hover:text-brick-100 hover:bg-brick-900/30"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-8">
        {bundleFormWithMaterials ? (
          <div className="rounded-lg border border-brick-700 bg-brick-800 shadow-md overflow-hidden flex flex-col">
            <DynamicForm {...sharedFormProps} />
            <ProjectMaterialEstimateSection
              ref={estimateSectionRef}
              projectId={projectId}
              getEditorPrompt={getEditorPrompt}
              hideActionButtons
              onActionState={onMaterialActionState}
              viewStage={editorSection}
              embedded
            />
          </div>
        ) : (
          <DynamicForm {...sharedFormProps} />
        )}

        {!isCreateMode && projectId && isAiChatEnabled ? (
          <ProjectAiChatPanel projectName={project?.name} />
        ) : null}
      </div>
    </div>
  );
}
