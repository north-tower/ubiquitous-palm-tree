"use client";

import { isUnauthorized, messageFromError } from "@/lib/api";
import type {
  IndustryFlowEngineKind,
  IndustryFlowRecord,
  UpsertIndustryFlowBody,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

type Api = {
  listIndustryFlows: (tenantId: string) => Promise<IndustryFlowRecord[]>;
  createIndustryFlow: (
    tenantId: string,
    body: UpsertIndustryFlowBody,
  ) => Promise<IndustryFlowRecord>;
  updateIndustryFlow: (
    tenantId: string,
    flowId: string,
    body: UpsertIndustryFlowBody,
  ) => Promise<IndustryFlowRecord>;
};

export function PlaaggFlowsPanel({
  api,
  tenantId,
  onUnauthorized,
}: {
  api: Api;
  tenantId: string;
  onUnauthorized: () => void;
}) {
  const [rows, setRows] = useState<IndustryFlowRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UpsertIndustryFlowBody | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listIndustryFlows(tenantId);
      setRows(list);
      setSelectedId((current) => {
        if (current && list.some((row) => row.id === current)) {
          return current;
        }
        return list[0]?.id ?? null;
      });
    } catch (caught) {
      if (isUnauthorized(caught)) {
        onUnauthorized();
        return;
      }
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [api, tenantId, onUnauthorized]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setDraft(recordToDraft(selected));
  }, [selected]);

  async function save() {
    if (!draft || !selected) {
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await api.updateIndustryFlow(tenantId, selected.id, draft);
      setRows((current) =>
        current.map((row) => (row.id === saved.id ? saved : row)),
      );
      setNotice("Flow saved. New WhatsApp sessions will use the updated content.");
    } catch (caught) {
      if (isUnauthorized(caught)) {
        onUnauthorized();
        return;
      }
      setError(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function createFlow() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const body = emptyDraft();
      body.demoMode = `custom_${Date.now()}`;
      body.menuLabel = "New industry";
      body.plaaggMenuId = body.demoMode;
      const created = await api.createIndustryFlow(tenantId, body);
      setRows((current) => [...current, created].sort(bySortOrder));
      setSelectedId(created.id);
      setNotice("Created a new flow — set demo mode, menu label, and steps.");
    } catch (caught) {
      if (isUnauthorized(caught)) {
        onUnauthorized();
        return;
      }
      setError(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted">Loading PLAAGG industry flows…</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">PLAAGG flows</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Edit industry demos without deploying code. Script flows use the
            steps below; salon and solar keep their built-in customer journeys
            but take insights and plans from here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void createFlow()}
          disabled={saving}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          Add industry
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <ul className="space-y-1 rounded-xl border border-line bg-card p-2 text-sm">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`w-full rounded-lg px-2 py-2 text-left ${
                  row.id === selectedId
                    ? "bg-accent/10 font-medium text-foreground"
                    : "text-muted hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {row.menuLabel}
                {!row.isActive ? (
                  <span className="ml-1 text-xs text-muted">(off)</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        {draft && selected ? (
          <form
            className="space-y-4 rounded-xl border border-line bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Menu label"
                value={draft.menuLabel}
                onChange={(menuLabel) => setDraft({ ...draft, menuLabel })}
              />
              <Field
                label="PLAAGG menu id"
                value={draft.plaaggMenuId}
                onChange={(plaaggMenuId) => setDraft({ ...draft, plaaggMenuId })}
              />
              <Field
                label="Demo mode (engine key)"
                value={draft.demoMode}
                onChange={(demoMode) => setDraft({ ...draft, demoMode })}
              />
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Engine</span>
                <select
                  value={draft.engineKind}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      engineKind: event.target.value as IndustryFlowEngineKind,
                    })
                  }
                  className="w-full rounded-lg border border-line bg-background px-3 py-2"
                >
                  <option value="script">Script (configurable steps)</option>
                  <option value="salon">Built-in salon</option>
                  <option value="solar">Built-in solar</option>
                </select>
              </label>
              <Field
                label="Sort order"
                value={String(draft.sortOrder ?? 0)}
                onChange={(raw) =>
                  setDraft({
                    ...draft,
                    sortOrder: Number(raw) || 0,
                  })
                }
              />
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isActive ?? true}
                  onChange={(event) =>
                    setDraft({ ...draft, isActive: event.target.checked })
                  }
                />
                Active on WhatsApp menu
              </label>
            </div>

            {draft.engineKind === "script" ? (
              <>
                <TextArea
                  label="Customer intro"
                  value={draft.definition.intro ?? ""}
                  onChange={(intro) =>
                    setDraft({
                      ...draft,
                      definition: { ...draft.definition, intro },
                    })
                  }
                  rows={4}
                />
                <StepsEditor
                  steps={draft.definition.steps ?? []}
                  onChange={(steps) =>
                    setDraft({
                      ...draft,
                      definition: { ...draft.definition, steps },
                    })
                  }
                />
                <TextArea
                  label="Summary lines (use {{fieldId}} from steps)"
                  value={(draft.definition.customerSummaryTemplate ?? []).join(
                    "\n",
                  )}
                  onChange={(raw) =>
                    setDraft({
                      ...draft,
                      definition: {
                        ...draft.definition,
                        customerSummaryTemplate: raw
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  rows={4}
                />
              </>
            ) : (
              <p className="text-sm text-muted">
                Built-in engine — edit PLAAGG insights and recommended plan
                only. Customer journey stays in the salon/solar engine.
              </p>
            )}

            <InsightsEditor
              insights={draft.definition.plaaggInsights}
              onChange={(plaaggInsights) =>
                setDraft({
                  ...draft,
                  definition: { ...draft.definition, plaaggInsights },
                })
              }
            />

            <PlanEditor
              plan={draft.definition.recommendedPlan}
              onChange={(recommendedPlan) =>
                setDraft({
                  ...draft,
                  definition: { ...draft.definition, recommendedPlan },
                })
              }
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-lg border border-line px-3 py-2 text-sm"
              >
                Reload
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save flow"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted">Select an industry flow to edit.</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-background px-3 py-2"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-background px-3 py-2 font-mono text-[0.85rem]"
      />
    </label>
  );
}

function StepsEditor({
  steps,
  onChange,
}: {
  steps: UpsertIndustryFlowBody["definition"]["steps"];
  onChange: (steps: NonNullable<UpsertIndustryFlowBody["definition"]["steps"]>) => void;
}) {
  const safe = steps ?? [];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Conversation steps</h3>
        <button
          type="button"
          className="text-sm text-accent"
          onClick={() =>
            onChange([
              ...safe,
              {
                id: `step_${safe.length + 1}`,
                prompt: "Next question for the customer",
                reask: "Please try again.",
                minLength: 3,
              },
            ])
          }
        >
          Add step
        </button>
      </div>
      {safe.map((step, index) => (
        <div
          key={`${step.id}-${index}`}
          className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-2"
        >
          <Field
            label="Step id"
            value={step.id}
            onChange={(id) => {
              const next = [...safe];
              next[index] = { ...step, id };
              onChange(next);
            }}
          />
          <Field
            label="Min length"
            value={String(step.minLength ?? 3)}
            onChange={(raw) => {
              const next = [...safe];
              next[index] = { ...step, minLength: Number(raw) || 3 };
              onChange(next);
            }}
          />
          <div className="sm:col-span-2">
            <Field
              label="Prompt after answer"
              value={step.prompt}
              onChange={(prompt) => {
                const next = [...safe];
                next[index] = { ...step, prompt };
                onChange(next);
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Re-ask"
              value={step.reask}
              onChange={(reask) => {
                const next = [...safe];
                next[index] = { ...step, reask };
                onChange(next);
              }}
            />
          </div>
          <button
            type="button"
            className="text-left text-sm text-rose-700 sm:col-span-2"
            onClick={() => onChange(safe.filter((_, i) => i !== index))}
          >
            Remove step
          </button>
        </div>
      ))}
    </div>
  );
}

function InsightsEditor({
  insights,
  onChange,
}: {
  insights: UpsertIndustryFlowBody["definition"]["plaaggInsights"];
  onChange: (
    insights: UpsertIndustryFlowBody["definition"]["plaaggInsights"],
  ) => void;
}) {
  return (
    <fieldset className="space-y-2 rounded-lg border border-line p-3">
      <legend className="px-1 text-sm font-medium">
        What the business receives (simulated)
      </legend>
      <Field
        label="Pipeline stage"
        value={insights.pipelineStage}
        onChange={(pipelineStage) => onChange({ ...insights, pipelineStage })}
      />
      <Field
        label="Required follow-up"
        value={insights.followUp}
        onChange={(followUp) => onChange({ ...insights, followUp })}
      />
      <Field
        label="Assigned staff"
        value={insights.assignee}
        onChange={(assignee) => onChange({ ...insights, assignee })}
      />
      <Field
        label="Dashboard insight"
        value={insights.dashboardInsight}
        onChange={(dashboardInsight) =>
          onChange({ ...insights, dashboardInsight })
        }
      />
    </fieldset>
  );
}

function PlanEditor({
  plan,
  onChange,
}: {
  plan: UpsertIndustryFlowBody["definition"]["recommendedPlan"];
  onChange: (
    plan: UpsertIndustryFlowBody["definition"]["recommendedPlan"],
  ) => void;
}) {
  return (
    <fieldset className="space-y-2 rounded-lg border border-line p-3">
      <legend className="px-1 text-sm font-medium">Recommended PLAAGG plan</legend>
      <Field
        label="Plan name"
        value={plan.name}
        onChange={(name) => onChange({ ...plan, name })}
      />
      <TextArea
        label="Summary"
        value={plan.summary}
        onChange={(summary) => onChange({ ...plan, summary })}
        rows={2}
      />
      <TextArea
        label="Modules (one per line)"
        value={plan.modules.join("\n")}
        onChange={(raw) =>
          onChange({
            ...plan,
            modules: raw
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          })
        }
        rows={4}
      />
    </fieldset>
  );
}

function recordToDraft(row: IndustryFlowRecord): UpsertIndustryFlowBody {
  return {
    demoMode: row.demoMode,
    menuLabel: row.menuLabel,
    plaaggMenuId: row.plaaggMenuId,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    engineKind: row.engineKind,
    definition: row.definition,
  };
}

function emptyDraft(): UpsertIndustryFlowBody {
  return {
    demoMode: "custom",
    menuLabel: "",
    plaaggMenuId: "",
    sortOrder: 100,
    isActive: true,
    engineKind: "script",
    definition: {
      intro: "",
      steps: [
        {
          id: "need",
          prompt: "Follow-up question",
          reask: "Please share a bit more detail.",
          minLength: 3,
        },
      ],
      customerSummaryTemplate: ["Simulated enquiry: {{need}}"],
      plaaggInsights: {
        pipelineStage: "New WhatsApp lead",
        followUp: "Qualify and respond",
        assignee: "Simulated: Team inbox",
        dashboardInsight: "Demo KPI only",
      },
      recommendedPlan: {
        name: "PLAAGG Starter",
        summary: "Core lead capture on WhatsApp.",
        modules: ["Unified inbox", "Lead stages"],
      },
    },
  };
}

function bySortOrder(a: IndustryFlowRecord, b: IndustryFlowRecord): number {
  return a.sortOrder - b.sortOrder || a.menuLabel.localeCompare(b.menuLabel);
}
