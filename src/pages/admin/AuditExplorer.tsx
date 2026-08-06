import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
  type FormEvent,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";

// ─── Types ──────────────────────────────────────────────────────────

type AuditCategory =
  | "identity"
  | "hierarchy"
  | "authority"
  | "workflow"
  | "integration"
  | "system"
  | "security";

type DetailTab = "overview" | "chain";
type ViewMode = "list" | "graph";

interface AuditEntry {
  id: string;
  sequence: number;
  chain_key: string;
  category: AuditCategory;
  action: string;
  actor_id: string | null;
  delegator_actor_id: string | null;
  container_id: string | null;
  root_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  correlation_id: string | null;
  occurred_at: string;
  recorded_at: string;
  previous_hash: string | null;
  entry_hash: string;
  metadata: Record<string, unknown>;
}

interface ChainVerification {
  chain_key: string;
  valid: boolean;
}

interface RetentionPolicy {
  id: string;
  category: AuditCategory | null;
  root_id: string | null;
  retain_days: number;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

interface EntriesMeta {
  limit: number;
  offset: number;
  count: number;
}

type ExportFormat = "json" | "csv" | "ndjson";

// ─── API — same pattern as RegistryExplorer, pointed at /api/audit ──

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/api/audit${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${localStorage.getItem("maicore_token")}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

async function apiDownload(path: string): Promise<void> {
  const res = await fetch(`${API}/api/audit${path}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("maicore_token")}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "audit-export";
  const blob = await res.blob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "" && v !== "all")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");

  return q ? `?${q}` : "";
}

// ─── Constants ──────────────────────────────────────────────────────

const CATEGORIES: AuditCategory[] = [
  "identity",
  "hierarchy",
  "authority",
  "workflow",
  "integration",
  "system",
  "security",
];

const ENTRY_LIMIT = 25;

// ─── Primitives (same visual language as RegistryExplorer) ─────────

function CategoryTag({ category }: { category: AuditCategory }) {
  const emphasised = category === "security" || category === "system";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        emphasised
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
      }`}
    >
      {category}
    </span>
  );
}

function ValidityPill({ valid }: { valid: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        valid
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "border-2 border-black dark:border-white text-black dark:text-white"
      }`}
    >
      {valid ? "Valid" : "Broken"}
    </span>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
      {children}
    </span>
  );
}

function Mono({
  children,
  dim,
  truncate,
}: {
  children: ReactNode;
  dim?: boolean;
  truncate?: boolean;
}) {
  return (
    <span
      className={`font-mono text-xs ${truncate ? "block truncate" : ""} ${
        dim
          ? "text-neutral-400 dark:text-neutral-600"
          : "text-neutral-600 dark:text-neutral-400"
      }`}
    >
      {children}
    </span>
  );
}

function Divider() {
  return (
    <div className="my-4 border-t border-neutral-100 dark:border-neutral-900" />
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Chain Panel ─────────────────────────────────────────────────────

function ChainPanel({ entry }: { entry: AuditEntry }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ChainVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [entry.id]);

  async function verify() {
    setChecking(true);
    setError(null);
    try {
      const rootId = entry.root_id ?? "";
      const qs = buildQuery({ root_id: rootId || undefined });
      const r = await apiFetch<{ data: ChainVerification }>(
        `/chain/verify${qs}`,
      );
      setResult(r.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
          <Label>Chain key</Label>
          <Mono>{entry.chain_key}</Mono>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
          <Label>Sequence</Label>
          <span className="font-mono text-sm font-semibold text-black dark:text-white">
            #{entry.sequence}
          </span>
        </div>
        <div className="col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
          <Label>Previous hash</Label>
          <Mono>{entry.previous_hash ?? "—"}</Mono>
        </div>
        <div className="col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
          <Label>Entry hash</Label>
          <Mono>{entry.entry_hash}</Mono>
        </div>
      </div>

      <Divider />

      <div>
        <div className="flex items-center justify-between">
          <Label>Chain integrity</Label>
          <button
            onClick={verify}
            disabled={checking}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checking ? "Verifying…" : "Verify chain"}
          </button>
        </div>

        {error && (
          <div className="mt-2 rounded-lg border-2 border-black dark:border-white px-3 py-2 text-xs text-black dark:text-white font-medium">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2.5">
            <ValidityPill valid={result.valid} />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {result.valid
                ? "Every entry in this chain rehashes cleanly from genesis."
                : "Hash mismatch or sequence gap detected somewhere in this chain."}
            </span>
          </div>
        )}

        {!result && !error && (
          <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-600">
            Recomputes every hash from genesis for chain{" "}
            <Mono dim>{entry.root_id ?? "__platform__"}</Mono>.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Retention Drawer ────────────────────────────────────────────────

interface RetentionFormState {
  category: AuditCategory | "all";
  root_id: string;
  retain_days: number | string;
}

function RetentionDrawer({ onClose }: { onClose: () => void }) {
  const [policies, setPolicies] = useState<RetentionPolicy[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<RetentionFormState>({
    category: "all",
    root_id: "",
    retain_days: 90,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<{ data: RetentionPolicy[] }>(
        "/retention-policies",
      );
      setPolicies(r.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiFetch("/retention-policies", {
        method: "POST",
        body: JSON.stringify({
          category: form.category !== "all" ? form.category : null,
          root_id: form.root_id || null,
          retain_days: Number(form.retain_days),
        }),
      });
      setForm({ category: "all", root_id: "", retain_days: 90 });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const inputCls =
    "h-9 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black px-3 text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/20 dark:bg-black/50">
      <div className="flex h-full w-full max-w-md flex-col bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-800">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6">
          <span className="text-sm font-bold tracking-tight text-black dark:text-white">
            Retention Policies
          </span>
          <button
            onClick={onClose}
            className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={submit}
          className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4"
        >
          <Label>New policy</Label>
          <div className="flex gap-2">
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as AuditCategory | "all",
                }))
              }
              className={`flex-1 ${inputCls}`}
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={form.retain_days}
              onChange={(e) =>
                setForm((f) => ({ ...f, retain_days: e.target.value }))
              }
              className={`w-24 ${inputCls}`}
              placeholder="Days"
            />
          </div>
          <input
            type="text"
            placeholder="Root ID (optional)"
            value={form.root_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, root_id: e.target.value }))
            }
            className={`w-full ${inputCls}`}
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-lg bg-black dark:bg-white px-3 py-2 text-xs font-medium text-white dark:text-black hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create policy"}
          </button>
        </form>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <p className="text-xs text-neutral-400 dark:text-neutral-600">
              Loading…
            </p>
          )}
          {error && (
            <div className="mb-3 rounded-lg border-2 border-black dark:border-white px-3 py-2 text-xs text-black dark:text-white font-medium">
              {error}
            </div>
          )}
          {!loading && policies?.length === 0 && (
            <p className="text-xs text-neutral-400 dark:text-neutral-600">
              No active retention policies.
            </p>
          )}
          <div className="space-y-2">
            {policies?.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"
              >
                <div className="flex items-center justify-between">
                  {p.category ? (
                    <CategoryTag category={p.category} />
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
                      All categories
                    </span>
                  )}
                  <span className="font-mono text-xs font-semibold text-black dark:text-white">
                    {p.retain_days}d
                  </span>
                </div>
                {p.root_id && (
                  <Mono dim truncate>
                    root: {p.root_id}
                  </Mono>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ───────────────────────────────────────────────────

function DetailPanel({ entry }: { entry: AuditEntry }) {
  const [tab, setTab] = useState<DetailTab>("overview");

  useEffect(() => {
    setTab("overview");
  }, [entry.id]);

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "chain", label: "Chain" },
  ];

  const fields: { label: string; value: string }[] = [
    { label: "Category", value: entry.category },
    { label: "Actor", value: entry.actor_id ?? "—" },
    { label: "Delegator", value: entry.delegator_actor_id ?? "—" },
    { label: "Container", value: entry.container_id ?? "—" },
    { label: "Root", value: entry.root_id ?? "—" },
    { label: "Correlation", value: entry.correlation_id ?? "—" },
    { label: "Resource type", value: entry.resource_type ?? "—" },
    { label: "Resource ID", value: entry.resource_id ?? "—" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 pt-5 pb-4">
        <div className="mb-2 flex items-center gap-2">
          <CategoryTag category={entry.category} />
          <Mono dim>seq #{entry.sequence}</Mono>
        </div>
        <h2 className="text-lg font-bold tracking-tight text-black dark:text-white m-0 font-mono">
          {entry.action}
        </h2>
        <p className="mt-0.5 font-mono text-xs text-neutral-400 dark:text-neutral-600">
          {entry.id}
        </p>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Occurred {formatDateTime(entry.occurred_at)} · Recorded{" "}
          {formatDateTime(entry.recorded_at)}
        </p>
      </div>

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 px-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === "overview" && (
          <div>
            <div className="grid grid-cols-2 gap-3">
              {fields.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"
                >
                  <Label>{row.label}</Label>
                  <span className="font-mono text-sm font-semibold text-black dark:text-white break-all">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {Object.keys(entry.metadata ?? {}).length > 0 && (
              <>
                <Divider />
                <Label>Metadata</Label>
                <pre className="mt-1 overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}

        {tab === "chain" && <ChainPanel entry={entry} />}
      </div>
    </div>
  );
}

// ─── Graph View — force-directed 3D audit graph (Obsidian-style) ───

interface SimNode {
  id: string;
  entry: AuditEntry;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  degree: number;
}

interface SimEdge {
  source: string;
  target: string;
  kind: "chain" | "correlation";
  label: string;
}

type NodeLabelField = "action" | "actor" | "category";

interface SceneParams {
  ambientIntensity: number;
  pointIntensity: number;
  repulsion: number;
  springStrength: number;
  chainLength: number;
  correlationLength: number;
  centering: number;
  damping: number;
  nodeScale: number;
  showNodeLabels: boolean;
  showEdgeLabels: boolean;
  nodeLabelField: NodeLabelField;
  fadeEnabled: boolean;
  fadeNear: number;
  fadeFar: number;
}

const DEFAULT_SCENE_PARAMS: SceneParams = {
  ambientIntensity: 0.7,
  pointIntensity: 0.9,
  repulsion: 6,
  springStrength: 1.4,
  chainLength: 2.2,
  correlationLength: 3.2,
  centering: 0.06,
  damping: 0.88,
  nodeScale: 1,
  showNodeLabels: true,
  showEdgeLabels: false,
  nodeLabelField: "action",
  fadeEnabled: true,
  fadeNear: 20,
  fadeFar: 70,
};

// Grayscale "tone" per category — the graph stays inside the app's
// existing black/white language rather than introducing an accent color.
// Security/system stay at full brightness, matching the emphasis rule
// already used by CategoryTag elsewhere in this file.
const CATEGORY_TONE: Record<AuditCategory, number> = {
  integration: 0.32,
  workflow: 0.42,
  hierarchy: 0.5,
  identity: 0.58,
  authority: 0.66,
  system: 0.92,
  security: 1,
};

function nodeBaseColor(category: AuditCategory): THREE.Color {
  const tone = CATEGORY_TONE[category];
  return new THREE.Color(tone, tone, tone);
}

function useForceGraph(
  entries: AuditEntry[],
  localFocusId: string | null,
  resetSignal: number,
) {
  return useMemo(() => {
    const byHash = new Map<string, AuditEntry>();
    entries.forEach((e) => byHash.set(e.entry_hash, e));

    const edges: SimEdge[] = [];

    // Chain edges: link each entry to whichever entry in this page
    // produced the hash it names as its previous_hash.
    entries.forEach((e) => {
      if (e.previous_hash && byHash.has(e.previous_hash)) {
        const prev = byHash.get(e.previous_hash)!;
        edges.push({
          source: prev.id,
          target: e.id,
          kind: "chain",
          label: `#${prev.sequence}→#${e.sequence}`,
        });
      }
    });

    // Correlation edges: link entries sharing a correlation_id in
    // occurred_at order. Entries with a null correlation_id are left
    // unlinked here and rendered as hollow nodes below — that gap is
    // exactly what a broken correlation pipeline looks like.
    const byCorrelation = new Map<string, AuditEntry[]>();
    entries.forEach((e) => {
      if (!e.correlation_id) return;
      const list = byCorrelation.get(e.correlation_id) ?? [];
      list.push(e);
      byCorrelation.set(e.correlation_id, list);
    });
    byCorrelation.forEach((list) => {
      if (list.length < 2) return;
      const sorted = [...list].sort(
        (a, b) =>
          new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
      );
      for (let i = 1; i < sorted.length; i++) {
        edges.push({
          source: sorted[i - 1].id,
          target: sorted[i].id,
          kind: "correlation",
          label: `corr:${sorted[i].correlation_id!.slice(-6)}`,
        });
      }
    });

    const degree = new Map<string, number>();
    edges.forEach((e) => {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    });

    let nodeEntries = entries;
    let edgeList = edges;

    if (localFocusId) {
      const neighborIds = new Set<string>([localFocusId]);
      edges.forEach((e) => {
        if (e.source === localFocusId) neighborIds.add(e.target);
        if (e.target === localFocusId) neighborIds.add(e.source);
      });
      nodeEntries = entries.filter((e) => neighborIds.has(e.id));
      edgeList = edges.filter(
        (e) => neighborIds.has(e.source) && neighborIds.has(e.target),
      );
    }

    const nodes: SimNode[] = nodeEntries.map((entry) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 3;
      return {
        id: entry.id,
        entry,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 3,
          Math.sin(angle) * radius,
        ),
        velocity: new THREE.Vector3(),
        degree: degree.get(entry.id) ?? 0,
      };
    });

    return { nodes, edges: edgeList };
    // resetSignal is intentionally a dependency: bumping it re-randomizes
    // starting positions without needing a new entries reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, localFocusId, resetSignal]);
}

function edgeKey(e: SimEdge, i: number): string {
  return `${e.source}__${e.target}__${e.kind}__${i}`;
}

function updateLineGeometry(
  geom: THREE.BufferGeometry | null,
  nodeMap: Map<string, SimNode>,
  edges: SimEdge[],
  kind: "chain" | "correlation",
) {
  if (!geom) return;
  const relevant = edges.filter((e) => e.kind === kind);
  const positions = new Float32Array(relevant.length * 6);
  let ptr = 0;
  relevant.forEach((e) => {
    const a = nodeMap.get(e.source);
    const b = nodeMap.get(e.target);
    if (!a || !b) {
      ptr += 6;
      return;
    }
    positions[ptr++] = a.position.x;
    positions[ptr++] = a.position.y;
    positions[ptr++] = a.position.z;
    positions[ptr++] = b.position.x;
    positions[ptr++] = b.position.y;
    positions[ptr++] = b.position.z;
  });
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.attributes.position.needsUpdate = true;
}

interface GraphSceneProps {
  nodes: SimNode[];
  edges: SimEdge[];
  selectedId: string | null;
  onSelect: (entry: AuditEntry) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  searchTerm: string;
  paused: boolean;
  params: SceneParams;
}

function nodeLabelText(entry: AuditEntry, field: NodeLabelField): string {
  if (field === "actor") return entry.actor_id ?? "system";
  if (field === "category") return entry.category;
  return entry.action;
}

function GraphScene({
  nodes,
  edges,
  selectedId,
  onSelect,
  hoveredId,
  onHover,
  searchTerm,
  paused,
  params,
}: GraphSceneProps) {
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const chainGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const corrGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const edgeGroupRefs = useRef<Map<string, THREE.Group>>(new Map());

  const neighborSet = useMemo(() => {
    const focus = hoveredId ?? selectedId;
    if (!focus) return null;
    const set = new Set<string>([focus]);
    edges.forEach((e) => {
      if (e.source === focus) set.add(e.target);
      if (e.target === focus) set.add(e.source);
    });
    return set;
  }, [hoveredId, selectedId, edges]);

  const matchedIds = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    const set = new Set<string>();
    nodes.forEach((n) => {
      if (
        n.entry.action.toLowerCase().includes(term) ||
        (n.entry.actor_id ?? "").toLowerCase().includes(term)
      ) {
        set.add(n.id);
      }
    });
    return set;
  }, [searchTerm, nodes]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const list = nodesRef.current;
    const nodeMap = new Map(list.map((n) => [n.id, n]));

    if (!paused) {
      // Repulsion between every pair — fine at page-sized (≤25) node counts.
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const diff = a.position.clone().sub(b.position);
          let dist = diff.length();
          if (dist < 0.01) dist = 0.01;
          const force = params.repulsion / (dist * dist);
          diff.normalize().multiplyScalar(force);
          a.velocity.addScaledVector(diff, dt);
          b.velocity.addScaledVector(diff, -dt);
        }
      }

      // Springs along edges pull linked entries toward an ideal distance.
      edges.forEach((e) => {
        const a = nodeMap.get(e.source);
        const b = nodeMap.get(e.target);
        if (!a || !b) return;
        const idealLength =
          e.kind === "chain" ? params.chainLength : params.correlationLength;
        const diff = b.position.clone().sub(a.position);
        const dist = diff.length() || 0.01;
        const stretch = dist - idealLength;
        diff.normalize().multiplyScalar(stretch * params.springStrength);
        a.velocity.addScaledVector(diff, dt);
        b.velocity.addScaledVector(diff, -dt);
      });

      // Gentle centering + damped integration.
      list.forEach((n) => {
        n.velocity.addScaledVector(
          n.position.clone().multiplyScalar(-params.centering),
          dt,
        );
        n.velocity.multiplyScalar(params.damping);
        n.position.addScaledVector(n.velocity, dt * 4);
      });
    }

    list.forEach((n) => {
      const mesh = meshRefs.current.get(n.id);
      if (mesh) mesh.position.copy(n.position);
    });

    edges.forEach((e, i) => {
      const group = edgeGroupRefs.current.get(edgeKey(e, i));
      if (!group) return;
      const a = nodeMap.get(e.source);
      const b = nodeMap.get(e.target);
      if (a && b) {
        group.position.copy(a.position).add(b.position).multiplyScalar(0.5);
      }
    });

    updateLineGeometry(chainGeomRef.current, nodeMap, edges, "chain");
    updateLineGeometry(corrGeomRef.current, nodeMap, edges, "correlation");
  });

  const focusId = hoveredId ?? selectedId;

  return (
    <>
      {params.fadeEnabled && (
        <fog attach="fog" args={["#050505", params.fadeNear, params.fadeFar]} />
      )}
      <ambientLight intensity={params.ambientIntensity} />
      <pointLight position={[8, 10, 10]} intensity={params.pointIntensity} />

      <lineSegments>
        <bufferGeometry ref={chainGeomRef} />
        <lineBasicMaterial color="#b0b0b0" transparent opacity={0.55} />
      </lineSegments>
      <lineSegments>
        <bufferGeometry ref={corrGeomRef} />
        <lineBasicMaterial color="#5c5c5c" transparent opacity={0.4} />
      </lineSegments>

      {params.showEdgeLabels &&
        edges.map((e, i) => {
          const show = focusId
            ? e.source === focusId || e.target === focusId
            : true;
          if (!show) return null;
          return (
            <group
              key={edgeKey(e, i)}
              ref={(g: THREE.Group | null) => {
                if (g) edgeGroupRefs.current.set(edgeKey(e, i), g);
                else edgeGroupRefs.current.delete(edgeKey(e, i));
              }}
            >
              <Html
                center
                distanceFactor={14}
                style={{ pointerEvents: "none" }}
              >
                <span
                  className={`whitespace-nowrap rounded px-1 py-0.5 font-mono text-[9px] ${
                    e.kind === "chain"
                      ? "bg-black/80 text-neutral-200"
                      : "bg-black/60 text-neutral-400"
                  }`}
                >
                  {e.label}
                </span>
              </Html>
            </group>
          );
        })}

      {/* Ensure every edge still has a tracked midpoint group even when its
          label is hidden, so labels appear instantly once toggled/hovered. */}
      {!params.showEdgeLabels &&
        edges.map((e, i) => (
          <group
            key={edgeKey(e, i)}
            ref={(g: THREE.Group | null) => {
              if (g) edgeGroupRefs.current.set(edgeKey(e, i), g);
              else edgeGroupRefs.current.delete(edgeKey(e, i));
            }}
          />
        ))}

      {nodes.map((n) => {
        const isHovered = hoveredId === n.id;
        const isSelected = selectedId === n.id;
        const inNeighborhood = neighborSet ? neighborSet.has(n.id) : true;
        const matched = matchedIds ? matchedIds.has(n.id) : true;
        const dimmed =
          (!inNeighborhood || !matched) && !isHovered && !isSelected;
        const broken = !n.entry.correlation_id;
        const scale =
          (0.16 +
            Math.min(n.degree, 8) * 0.03 +
            (isHovered || isSelected ? 0.07 : 0)) *
          params.nodeScale;
        const showLabel = params.showNodeLabels && !dimmed;

        return (
          <mesh
            key={n.id}
            ref={(m: THREE.Mesh | null) => {
              if (m) meshRefs.current.set(n.id, m);
              else meshRefs.current.delete(n.id);
            }}
            scale={scale}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover(n.id);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              onHover(null);
              document.body.style.cursor = "auto";
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(n.entry);
            }}
          >
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
              color={nodeBaseColor(n.entry.category)}
              wireframe={broken}
              transparent
              opacity={dimmed ? 0.12 : 1}
              emissive={
                isSelected ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0)
              }
              emissiveIntensity={isSelected ? 0.5 : 0}
            />
            {showLabel && (
              <Html
                center
                distanceFactor={10}
                position={[0, 1.6, 0]}
                style={{ pointerEvents: "none" }}
              >
                <span className="whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-neutral-100">
                  {nodeLabelText(n.entry, params.nodeLabelField)}
                </span>
              </Html>
            )}
          </mesh>
        );
      })}
    </>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[10px] text-neutral-400">
        <span>{label}</span>
        <span className="font-mono text-neutral-300">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-neutral-700 accent-white"
      />
    </label>
  );
}

function GraphLegend() {
  return (
    <div className="pointer-events-none flex flex-col gap-1.5 text-[10px] text-neutral-400">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white/90" />
        <span>security / system — emphasised</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-neutral-500" />
        <span>other categories, by tone</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border border-neutral-400" />
        <span>hollow = no correlation_id</span>
      </div>
      <div className="flex items-center gap-3 pt-0.5">
        <span className="flex items-center gap-1.5">
          <span className="h-px w-4 bg-neutral-300" /> chain
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-px w-4 bg-neutral-600" /> correlation
        </span>
      </div>
    </div>
  );
}

function GraphView({
  entries,
  selected,
  onSelect,
  onClearSelection,
}: {
  entries: AuditEntry[];
  selected: AuditEntry | null;
  onSelect: (entry: AuditEntry) => void;
  onClearSelection: () => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [localFocusId, setLocalFocusId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [params, setParams] = useState<SceneParams>(DEFAULT_SCENE_PARAMS);
  const [showSettings, setShowSettings] = useState(false);

  const updateParam = <K extends keyof SceneParams>(
    key: K,
    value: SceneParams[K],
  ) => setParams((p) => ({ ...p, [key]: value }));

  const { nodes, edges } = useForceGraph(entries, localFocusId, resetSignal);

  const brokenCount = useMemo(
    () => entries.filter((e) => !e.correlation_id).length,
    [entries],
  );

  useEffect(() => {
    // Local focus only makes sense while its node is still selected.
    if (localFocusId && selected?.id !== localFocusId) {
      setLocalFocusId(null);
    }
  }, [selected, localFocusId]);

  return (
    <div className="relative h-full w-full bg-[#0a0a0b]">
      <Canvas camera={{ position: [0, 0, 14], fov: 50 }}>
        <GraphScene
          nodes={nodes}
          edges={edges}
          selectedId={selected?.id ?? null}
          onSelect={onSelect}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          searchTerm={searchTerm}
          paused={paused}
          params={params}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.15}
          minDistance={3}
          maxDistance={150}
          makeDefault
        />
      </Canvas>

      {/* Floating control panel, Obsidian-graph-view style */}
      <div className="pointer-events-auto absolute left-4 top-4 w-64 space-y-3 rounded-xl border border-neutral-800 bg-black/80 p-3 backdrop-blur">
        <input
          type="text"
          placeholder="Search action or actor…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 w-full rounded-lg border border-neutral-700 bg-black px-2.5 text-xs text-white outline-none focus:border-white transition-colors"
        />

        <div className="flex gap-2">
          <button
            onClick={() =>
              setLocalFocusId((cur) => (cur ? null : (selected?.id ?? null)))
            }
            disabled={!selected}
            className="flex-1 rounded-lg border border-neutral-700 px-2 py-1.5 text-[11px] font-medium text-neutral-300 hover:border-white hover:text-white transition disabled:cursor-not-allowed disabled:opacity-30"
          >
            {localFocusId ? "Show full graph" : "Local graph"}
          </button>
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex-1 rounded-lg border border-neutral-700 px-2 py-1.5 text-[11px] font-medium text-neutral-300 hover:border-white hover:text-white transition"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
        <button
          onClick={() => setResetSignal((s) => s + 1)}
          className="w-full rounded-lg border border-neutral-700 px-2 py-1.5 text-[11px] font-medium text-neutral-300 hover:border-white hover:text-white transition"
        >
          Reheat layout
        </button>

        {/* Labels */}
        <div className="space-y-1.5 border-t border-neutral-800 pt-2">
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span>Labels</span>
          </div>
          <div className="flex gap-1.5">
            <label className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-700 px-1.5 py-1 text-[10px] text-neutral-300">
              <input
                type="checkbox"
                checked={params.showNodeLabels}
                onChange={(e) =>
                  updateParam("showNodeLabels", e.target.checked)
                }
                className="accent-white"
              />
              Nodes
            </label>
            <label className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-700 px-1.5 py-1 text-[10px] text-neutral-300">
              <input
                type="checkbox"
                checked={params.showEdgeLabels}
                onChange={(e) =>
                  updateParam("showEdgeLabels", e.target.checked)
                }
                className="accent-white"
              />
              Edges
            </label>
          </div>
          {params.showNodeLabels && (
            <select
              value={params.nodeLabelField}
              onChange={(e) =>
                updateParam("nodeLabelField", e.target.value as NodeLabelField)
              }
              className="h-7 w-full rounded-lg border border-neutral-700 bg-black px-2 text-[10px] text-neutral-200 outline-none focus:border-white"
            >
              <option value="action">Label: action</option>
              <option value="actor">Label: actor</option>
              <option value="category">Label: category</option>
            </select>
          )}
        </div>

        {/* Scene settings */}
        <div className="border-t border-neutral-800 pt-2">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex w-full items-center justify-between text-[10px] font-medium uppercase tracking-wide text-neutral-400 hover:text-white"
          >
            <span>Scene settings</span>
            <span>{showSettings ? "−" : "+"}</span>
          </button>

          {showSettings && (
            <div className="mt-2 max-h-64 space-y-3 overflow-y-auto pr-1">
              <label className="flex items-center justify-between text-[10px] text-neutral-400">
                <span>Fade with distance</span>
                <input
                  type="checkbox"
                  checked={params.fadeEnabled}
                  onChange={(e) => updateParam("fadeEnabled", e.target.checked)}
                  className="accent-white"
                />
              </label>
              {params.fadeEnabled && (
                <>
                  <SliderRow
                    label="Fade start distance"
                    value={params.fadeNear}
                    min={5}
                    max={100}
                    step={1}
                    onChange={(v) =>
                      updateParam("fadeNear", Math.min(v, params.fadeFar - 1))
                    }
                  />
                  <SliderRow
                    label="Fade end distance"
                    value={params.fadeFar}
                    min={10}
                    max={200}
                    step={1}
                    onChange={(v) =>
                      updateParam("fadeFar", Math.max(v, params.fadeNear + 1))
                    }
                  />
                </>
              )}
              <SliderRow
                label="Ambient light"
                value={params.ambientIntensity}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => updateParam("ambientIntensity", v)}
              />
              <SliderRow
                label="Point light"
                value={params.pointIntensity}
                min={0}
                max={3}
                step={0.05}
                onChange={(v) => updateParam("pointIntensity", v)}
              />
              <SliderRow
                label="Repulsion"
                value={params.repulsion}
                min={0.5}
                max={20}
                step={0.5}
                onChange={(v) => updateParam("repulsion", v)}
              />
              <SliderRow
                label="Spring strength"
                value={params.springStrength}
                min={0.1}
                max={4}
                step={0.1}
                onChange={(v) => updateParam("springStrength", v)}
              />
              <SliderRow
                label="Chain edge length"
                value={params.chainLength}
                min={0.5}
                max={6}
                step={0.1}
                onChange={(v) => updateParam("chainLength", v)}
              />
              <SliderRow
                label="Correlation edge length"
                value={params.correlationLength}
                min={0.5}
                max={8}
                step={0.1}
                onChange={(v) => updateParam("correlationLength", v)}
              />
              <SliderRow
                label="Centering"
                value={params.centering}
                min={0}
                max={0.3}
                step={0.01}
                onChange={(v) => updateParam("centering", v)}
              />
              <SliderRow
                label="Damping"
                value={params.damping}
                min={0.5}
                max={0.99}
                step={0.01}
                onChange={(v) => updateParam("damping", v)}
              />
              <SliderRow
                label="Node size"
                value={params.nodeScale}
                min={0.3}
                max={3}
                step={0.1}
                onChange={(v) => updateParam("nodeScale", v)}
              />
              <button
                onClick={() => setParams(DEFAULT_SCENE_PARAMS)}
                className="w-full rounded-lg border border-neutral-700 px-2 py-1.5 text-[11px] font-medium text-neutral-300 hover:border-white hover:text-white transition"
              >
                Reset to defaults
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-800 pt-2">
          <GraphLegend />
        </div>

        {brokenCount > 0 && (
          <div className="rounded-lg border-2 border-white/70 px-2.5 py-2 text-[11px] font-medium text-white">
            {brokenCount} of {entries.length} entries on this page have no
            correlation_id.
          </div>
        )}
      </div>

      {hoveredId && !selected && (
        <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm rounded-lg border border-neutral-800 bg-black/80 px-3 py-2 text-xs text-neutral-300 backdrop-blur">
          {nodes.find((n) => n.id === hoveredId)?.entry.action}
        </div>
      )}

      {/* Detail drawer, matching the app's existing overlay pattern */}
      {selected && (
        <div className="absolute inset-y-0 right-0 flex w-[380px] max-w-[85vw] flex-col border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-6 dark:border-neutral-800">
            <span className="text-sm font-bold tracking-tight text-black dark:text-white">
              Entry detail
            </span>
            <button
              onClick={onClearSelection}
              className="text-xs font-medium text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DetailPanel entry={selected} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────

export default function AuditExplorer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [filterCategory, setFilterCategory] = useState<AuditCategory | "all">(
    "all",
  );
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [rootId, setRootId] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [resourceType, setResourceType] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [occurredFrom, setOccurredFrom] = useState("");
  const [occurredTo, setOccurredTo] = useState("");

  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRetention, setShowRetention] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQuery({
          category: filterCategory !== "all" ? filterCategory : undefined,
          action: action || undefined,
          actor_id: actorId || undefined,
          root_id: rootId || undefined,
          resource_type: resourceType || undefined,
          resource_id: resourceId || undefined,
          occurred_from: occurredFrom || undefined,
          occurred_to: occurredTo || undefined,
          limit: ENTRY_LIMIT,
          offset,
        });
        const result = await apiFetch<{
          data: AuditEntry[];
          meta: EntriesMeta;
        }>(`/entries${qs}`);
        if (!cancelled) {
          setEntries(result.data);
          setCount(result.meta.count);
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Failed to load audit entries.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    filterCategory,
    action,
    actorId,
    rootId,
    resourceType,
    resourceId,
    occurredFrom,
    occurredTo,
    offset,
    refreshKey,
  ]);

  // Reset pagination whenever a filter changes.
  useEffect(() => {
    setOffset(0);
  }, [
    filterCategory,
    action,
    actorId,
    rootId,
    resourceType,
    resourceId,
    occurredFrom,
    occurredTo,
  ]);

  async function selectEntry(e: AuditEntry) {
    try {
      const r = await apiFetch<{ data: AuditEntry }>(`/entries/${e.id}`);
      setSelected(r.data);
    } catch {
      setSelected(e);
    }
  }

  async function exportCurrent(format: ExportFormat) {
    setExporting(true);
    try {
      const qs = buildQuery({
        category: filterCategory !== "all" ? filterCategory : undefined,
        action: action || undefined,
        actor_id: actorId || undefined,
        root_id: rootId || undefined,
        resource_type: resourceType || undefined,
        resource_id: resourceId || undefined,
        occurred_from: occurredFrom || undefined,
        occurred_to: occurredTo || undefined,
        format,
      });
      await apiDownload(`/export${qs}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const inputCls =
    "h-9 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black px-3 text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  const hasNext =
    offset + ENTRY_LIMIT < count || entries.length === ENTRY_LIMIT;
  const hasPrev = offset > 0;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black text-black dark:text-white">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold tracking-tight text-black dark:text-white">
            HALA Audit
          </span>
          <span className="mx-1 h-3.5 w-px bg-neutral-200 dark:bg-neutral-800" />
          <span className="text-xs text-neutral-400 dark:text-neutral-600">
            immutable trail
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 dark:text-neutral-600">
            {count} {count === 1 ? "entry" : "entries"}
          </span>

          <div className="flex overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "list"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white text-neutral-600 dark:bg-black dark:text-neutral-400"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "graph"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white text-neutral-600 dark:bg-black dark:text-neutral-400"
              }`}
            >
              Graph
            </button>
          </div>

          <button
            onClick={() => setShowRetention(true)}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
          >
            Retention
          </button>
          <button
            onClick={() => exportCurrent("csv")}
            disabled={exporting}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {viewMode === "list" && (
          <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-neutral-200 dark:border-neutral-800">
            <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
              <input
                type="text"
                placeholder="Filter by action…"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className={`w-full ${inputCls}`}
              />
              <div className="flex gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) =>
                    setFilterCategory(e.target.value as AuditCategory | "all")
                  }
                  className={`flex-1 ${inputCls}`}
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Actor ID"
                  value={actorId}
                  onChange={(e) => setActorId(e.target.value)}
                  className={`flex-1 ${inputCls}`}
                />
              </div>
              <input
                type="text"
                placeholder="Root ID (chain)"
                value={rootId}
                onChange={(e) => setRootId(e.target.value)}
                className={`w-full ${inputCls}`}
              />

              <button
                onClick={() => setShowMoreFilters((v) => !v)}
                className="text-[11px] font-medium text-neutral-400 dark:text-neutral-600 hover:text-black dark:hover:text-white"
              >
                {showMoreFilters ? "− fewer filters" : "+ more filters"}
              </button>

              {showMoreFilters && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Resource type"
                      value={resourceType}
                      onChange={(e) => setResourceType(e.target.value)}
                      className={`flex-1 ${inputCls}`}
                    />
                    <input
                      type="text"
                      placeholder="Resource ID"
                      value={resourceId}
                      onChange={(e) => setResourceId(e.target.value)}
                      className={`flex-1 ${inputCls}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={occurredFrom}
                      onChange={(e) => setOccurredFrom(e.target.value)}
                      className={`flex-1 ${inputCls}`}
                    />
                    <input
                      type="date"
                      value={occurredTo}
                      onChange={(e) => setOccurredTo(e.target.value)}
                      className={`flex-1 ${inputCls}`}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <span className="text-xs text-neutral-400 dark:text-neutral-600">
                    Loading entries…
                  </span>
                </div>
              )}
              {error && (
                <div className="m-1 rounded-lg border-2 border-black dark:border-white px-3 py-2 text-xs text-black dark:text-white font-medium">
                  {error}
                </div>
              )}
              {!loading && !error && entries.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                  <span className="text-xs text-neutral-400 dark:text-neutral-600">
                    No entries match.
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {!loading &&
                  !error &&
                  entries.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => selectEntry(e)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selected?.id === e.id
                          ? "border-black dark:border-white bg-neutral-50 dark:bg-neutral-900"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-sm font-semibold leading-tight text-black dark:text-white break-all">
                          {e.action}
                        </span>
                        <CategoryTag category={e.category} />
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Mono dim>{e.actor_id ?? "system"}</Mono>
                        <span className="text-neutral-300 dark:text-neutral-700">
                          ·
                        </span>
                        <Mono dim>{formatDateTime(e.occurred_at)}</Mono>
                      </div>
                      {e.resource_type && (
                        <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {e.resource_type}
                          {e.resource_id ? ` · ${e.resource_id}` : ""}
                        </p>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-neutral-200 dark:border-neutral-800 px-4 py-3">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - ENTRY_LIMIT))}
                disabled={!hasPrev}
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="text-xs text-neutral-400 dark:text-neutral-600">
                {offset + 1}–{offset + entries.length}
              </span>
              <button
                onClick={() => setOffset((o) => o + ENTRY_LIMIT)}
                disabled={!hasNext}
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </aside>
        )}

        {/* Detail / graph panel */}
        <main className="flex-1 overflow-hidden">
          {viewMode === "list" ? (
            selected ? (
              <DetailPanel entry={selected} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 select-none">
                <div className="grid grid-cols-3 gap-1.5 opacity-10 dark:opacity-20">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-3 w-3 rounded-sm bg-black dark:bg-white"
                    />
                  ))}
                </div>
                <span className="text-xs tracking-widest text-neutral-300 dark:text-neutral-700 uppercase">
                  Select an entry to inspect
                </span>
              </div>
            )
          ) : (
            <GraphView
              entries={entries}
              selected={selected}
              onSelect={selectEntry}
              onClearSelection={() => setSelected(null)}
            />
          )}
        </main>
      </div>

      {showRetention && (
        <RetentionDrawer onClose={() => setShowRetention(false)} />
      )}
    </div>
  );
}
