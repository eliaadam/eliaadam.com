import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { sdk, type ContainerKind } from "../../../lib/sdk";
import { TemplateEditor } from "./TemplateEditor";
import { ProvisioningRequestsTab } from "../../../components/admin/ProvisioningRequestsTab";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const TABS = [
  { id: "build", label: "Build" },
  { id: "requests", label: "Requests" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function Provisioning() {
  const [tab, setTab] = useState<TabId>("build");

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight">Provisioning</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {tab === "build"
          ? "Three steps: define a container kind, build a template around it (policy + capabilities), then compose templates into a hierarchy anyone can instantiate."
          : "Review and decide instantiation requests for templates that require approval."}
      </p>

      <div className="mt-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-black text-black dark:border-white dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-100",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "build" ? <BuildTab /> : <ProvisioningRequestsTab />}
      </div>
    </div>
  );
}

/** The original 3-step flow, unchanged in behavior — just wrapped as
 * its own tab instead of being the whole page. */
function BuildTab() {
  const [sessionKinds, setSessionKinds] = useState<ContainerKind[]>([]);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<
    string | null
  >(null);

  return (
    <div className="flex flex-col gap-10">
      <StepSection
        number={1}
        title="Container kinds"
        description="Categories a container can be — organization, department, team."
      >
        <KindStep
          sessionKinds={sessionKinds}
          onCreated={(k) => setSessionKinds((p) => [k, ...p])}
        />
      </StepSection>

      <StepSection
        number={2}
        title="Templates"
        description="A blueprint: which kind, default policy, and which capabilities to license."
      >
        <TemplateStep
          sessionKinds={sessionKinds}
          selectedCode={selectedTemplateCode}
          onSelect={setSelectedTemplateCode}
        />
      </StepSection>

      {selectedTemplateCode && (
        <StepSection
          number={3}
          title="Policy, capabilities & hierarchy"
          description="Fine-tune the selected template and compose its sub-hierarchy."
        >
          <SelectedTemplateEditor code={selectedTemplateCode} />
        </StepSection>
      )}
    </div>
  );
}

function StepSection({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
          {number}
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        </div>
      </div>
      <div className="ml-9 mt-4">{children}</div>
    </section>
  );
}

function KindStep({
  sessionKinds,
  onCreated,
}: {
  sessionKinds: ContainerKind[];
  onCreated: (kind: ContainerKind) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const mutation = useMutation({
    mutationFn: () => sdk.container.createKind({ code, name }),
    onSuccess: (kind) => {
      onCreated(kind);
      setCode("");
      setName("");
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Code
          </label>
          <input
            className={`${inputClass} mt-1 block`}
            required
            placeholder="organization"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
          />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Name
          </label>
          <input
            className={`${inputClass} mt-1 block`}
            required
            placeholder="Organization"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {mutation.isPending ? "Creating…" : "Create kind"}
        </button>
      </form>
      {mutation.isError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Couldn't create that kind — check the code is unique.
        </p>
      )}

      {sessionKinds.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {sessionKinds.map((k) => (
            <li
              key={k.id}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs text-black dark:bg-neutral-900 dark:text-white"
            >
              <CheckCircle2 size={12} />
              {k.name} ({k.code})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateStep({
  sessionKinds,
  selectedCode,
  onSelect,
}: {
  sessionKinds: ContainerKind[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kindCode, setKindCode] = useState("");
  const [customKindCode, setCustomKindCode] = useState("");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => sdk.provisioning.listTemplates(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      sdk.provisioning.createTemplate({
        code,
        name,
        container_kind_code:
          kindCode === "__custom__" ? customKindCode : kindCode,
      }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
      onSelect(template.code);
      setShowCreate(false);
      setCode("");
      setName("");
      setKindCode("");
      setCustomKindCode("");
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
  };

  return (
    <div>
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}

      <ul className="flex flex-wrap gap-2">
        {templates?.map((t) => (
          <li key={t.code}>
            <button
              type="button"
              onClick={() => onSelect(t.code)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                selectedCode === t.code
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
              ].join(" ")}
            >
              {t.name}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setShowCreate((v) => !v)}
        className="mt-3 text-sm font-medium text-black hover:underline dark:text-white"
      >
        {showCreate ? "Cancel" : "+ New template"}
      </button>

      {showCreate && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Code
            </label>
            <input
              className={`${inputClass} mt-1 block`}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Name
            </label>
            <input
              className={`${inputClass} mt-1 block`}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Kind
            </label>
            <select
              className={`${inputClass} mt-1 block`}
              required
              value={kindCode}
              onChange={(e) => setKindCode(e.target.value)}
            >
              <option value="">Choose…</option>
              {sessionKinds.map((k) => (
                <option key={k.code} value={k.code}>
                  {k.name} ({k.code})
                </option>
              ))}
              <option value="__custom__">
                Type a code from a previous session…
              </option>
            </select>
          </div>
          {kindCode === "__custom__" && (
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Kind code
              </label>
              <input
                className={`${inputClass} mt-1 block`}
                required
                value={customKindCode}
                onChange={(e) => setCustomKindCode(e.target.value)}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
          {createMutation.isError && (
            <p className="w-full text-sm text-red-600 dark:text-red-400">
              Couldn't create — check the code is unique and the kind exists.
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function SelectedTemplateEditor({ code }: { code: string }) {
  const { data: template } = useQuery({
    queryKey: ["admin", "template", code],
    queryFn: () => sdk.provisioning.getTemplate(code),
  });

  if (!template) return null;
  return <TemplateEditor template={template} />;
}
