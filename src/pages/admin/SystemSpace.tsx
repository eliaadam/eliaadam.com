import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ComponentType,
} from "react";
import * as THREE from "three";
import {
  Box,
  Circle,
  Database,
  Layers,
  Globe,
  Link2,
  MousePointer2,
  Trash2,
  X,
  RotateCcw,
  Zap,
  Shuffle,
  HardDrive,
  User,
  Radio,
  Move3d,
  Download,
  Upload,
  Cpu,
  Server,
  Smartphone,
  ShieldCheck,
  Cloud,
  Boxes,
  StickyNote,
  Move,
  RotateCw,
  Maximize2,
  Network,
  Hexagon,
  PlugZap,
  Puzzle,
  Package,
  Code2,
  ArrowRightLeft,
  Plus,
  Pencil,
  ChevronDown,
  Layers3,
  DatabaseZap,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Core domain types                                                  */
/* ------------------------------------------------------------------ */

type NodeTypeKey =
  | "module"
  | "service"
  | "system"
  | "domain"
  | "provider"
  | "interface"
  | "class"
  | "method"
  | "portal"
  | "database"
  | "queue"
  | "external"
  | "cache"
  | "loadBalancer"
  | "storage"
  | "client"
  | "gateway"
  | "worker"
  | "server"
  | "mobile"
  | "firewall"
  | "cdn"
  | "cluster";

type NodeCategory = "software" | "infrastructure";

type IconType = ComponentType<{
  size?: number;
  color?: string;
  className?: string;
}>;

interface NodeTypeConfig {
  label: string;
  color: string;
  icon: IconType;
  category: NodeCategory;
  geometry: () => THREE.BufferGeometry;
}

type Vec3Tuple = [number, number, number];

interface SceneNode {
  id: string;
  type: NodeTypeKey;
  label: string;
  color: string | null;
  spawnPosition: Vec3Tuple;
  rotation: Vec3Tuple;
  scale: Vec3Tuple;
  note: string;
  signature: string;
  targetSceneId: string | null;
  /** Set when this node was created from a registry asset, so the panel can link back to it. */
  registryAssetId?: string | null;
}

interface SceneEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  color?: string;
}

interface SceneMetaEntry {
  id: string;
  name: string;
}

interface SceneStoreEntry {
  nodes: SceneNode[];
  edges: SceneEdge[];
}

type SelectedRef = { kind: "node" | "edge"; id: string } | null;

interface ExportedScene {
  id: string;
  name: string;
  nodes: SceneNode[];
  edges: SceneEdge[];
}

interface ExportedProject {
  format: "systemspace-project";
  version: number;
  exportedAt: string;
  activeScene: string;
  scenes: ExportedScene[];
}

/* ------------------------------------------------------------------ */
/*  Transform / drag internal types                                    */
/* ------------------------------------------------------------------ */

type XformMode = "move" | "rotate" | "scale";
type Axis = "x" | "y" | "z";

interface XformAnchor {
  pos: THREE.Vector3;
  rot: THREE.Euler;
  scale: THREE.Vector3;
}

interface XformState {
  active: boolean;
  mode: XformMode | null;
  nodeIds: string[];
  axis: Axis | null;
  anchors: Map<string, XformAnchor>;
  pivot: THREE.Vector3 | null;
  movePlane: THREE.Plane | null;
  moveRefPoint: THREE.Vector3 | null;
  moveAxisDir: THREE.Vector3 | null;
  moveRefScalar: number;
  rotateRefX: number;
  scaleRefDist: number;
  scaleCenter: { x: number; y: number } | null;
}

interface DragState {
  ids: string[];
  mode: "free" | "axis";
  grabPoint: THREE.Vector3;
  plane: THREE.Plane | null;
  axis: Axis | null;
  axisDir: THREE.Vector3 | null;
  anchorCentroid: THREE.Vector3 | null;
  refScalar: number;
  anchors: Map<string, THREE.Vector3>;
  moved: boolean;
}

interface EdgeMeshObj {
  line: THREE.Mesh;
  cone: THREE.Mesh;
}

interface XformInfo {
  mode: XformMode;
  axis: Axis | null;
}

interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

type NodeMeshUserData = { kind: "node"; nodeId: string; type: NodeTypeKey };
type EdgeMeshUserData = { kind: "edge"; edgeId: string };
type GizmoMeshUserData = { kind: "gizmo"; axis: Axis };

/* ------------------------------------------------------------------ */
/*  Registry API types & client                                        */
/*  (mirrors the pattern used elsewhere in the app, e.g. the container  */
/*  workspace page: apiFetch<T> against /api/registry/*)               */
/* ------------------------------------------------------------------ */

type RegistryAssetType =
  | "platform"
  | "domain"
  | "service"
  | "package"
  | "contract"
  | "driver"
  | "capability";

type RegistryAssetStatus = "active" | "inactive" | "deprecated" | "retired";

interface RegistryRelationship {
  relationship_type: string;
  target_asset_id?: string;
  source_asset_id?: string;
}

interface RegistryAsset {
  id: string;
  asset_type: RegistryAssetType;
  code: string;
  slug: string;
  name: string;
  description: string;
  status: RegistryAssetStatus;
  metadata: Record<string, unknown>;
  source_relationships?: RegistryRelationship[];
  target_relationships?: RegistryRelationship[];
}

interface PaginatedMeta {
  current_page: number;
  last_page: number;
  total: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

const REGISTRY_API =
  (import.meta as any).env?.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function registryFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${REGISTRY_API}/api/registry${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${localStorage.getItem("maicore_token") ?? ""}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { message?: string }).message ?? `HTTP ${res.status}`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}

function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "all" && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");
  return q ? `?${q}` : "";
}

/** Maps a registry asset_type onto the closest SystemSpace node type. */
const ASSET_TYPE_TO_NODE_TYPE: Record<RegistryAssetType, NodeTypeKey> = {
  platform: "system",
  domain: "domain",
  service: "service",
  package: "module",
  contract: "interface",
  driver: "provider",
  capability: "class",
};

/* ------------------------------------------------------------------ */
/*  Static config                                                      */
/* ------------------------------------------------------------------ */

const NODE_TYPES: Record<NodeTypeKey, NodeTypeConfig> = {
  // ---- software-focused ----
  module: {
    label: "Module",
    color: "#5b8def",
    icon: Box,
    category: "software",
    geometry: () => new THREE.BoxGeometry(1.3, 0.9, 1.3),
  },
  service: {
    label: "Service",
    color: "#34d399",
    icon: Circle,
    category: "software",
    geometry: () => new THREE.SphereGeometry(0.75, 28, 20),
  },
  system: {
    label: "System",
    color: "#818cf8",
    icon: Network,
    category: "software",
    geometry: () => new THREE.BoxGeometry(1.8, 0.42, 1.8),
  },
  domain: {
    label: "Domain",
    color: "#22c55e",
    icon: Hexagon,
    category: "software",
    geometry: () => new THREE.CylinderGeometry(0.8, 0.8, 0.6, 6),
  },
  provider: {
    label: "Provider",
    color: "#eab308",
    icon: PlugZap,
    category: "software",
    geometry: () => new THREE.CylinderGeometry(0.5, 0.72, 1.1, 5),
  },
  interface: {
    label: "Interface",
    color: "#06b6d4",
    icon: Puzzle,
    category: "software",
    geometry: () => new THREE.TorusGeometry(0.55, 0.13, 10, 24),
  },
  class: {
    label: "Class",
    color: "#e2e8f0",
    icon: Package,
    category: "software",
    geometry: () => new THREE.BoxGeometry(1.0, 1.0, 1.0),
  },
  method: {
    label: "Method",
    color: "#f97316",
    icon: Code2,
    category: "software",
    geometry: () => new THREE.SphereGeometry(0.48, 14, 10),
  },
  portal: {
    label: "Scene Link",
    color: "#d946ef",
    icon: ArrowRightLeft,
    category: "software",
    geometry: () => new THREE.TorusKnotGeometry(0.4, 0.13, 80, 10, 2, 3),
  },
  // ---- infrastructure ----
  database: {
    label: "Database",
    color: "#f0b429",
    icon: Database,
    category: "infrastructure",
    geometry: () => new THREE.CylinderGeometry(0.75, 0.75, 1.1, 32),
  },
  queue: {
    label: "Queue",
    color: "#a78bfa",
    icon: Layers,
    category: "infrastructure",
    geometry: () => new THREE.TorusGeometry(0.62, 0.24, 14, 30),
  },
  external: {
    label: "External",
    color: "#f472b6",
    icon: Globe,
    category: "infrastructure",
    geometry: () => new THREE.OctahedronGeometry(0.88, 0),
  },
  cache: {
    label: "Cache",
    color: "#fb923c",
    icon: Zap,
    category: "infrastructure",
    geometry: () => new THREE.IcosahedronGeometry(0.82, 0),
  },
  loadBalancer: {
    label: "Load Balancer",
    color: "#38bdf8",
    icon: Shuffle,
    category: "infrastructure",
    geometry: () => new THREE.TetrahedronGeometry(0.98, 0),
  },
  storage: {
    label: "Storage",
    color: "#94a3b8",
    icon: HardDrive,
    category: "infrastructure",
    geometry: () => new THREE.CylinderGeometry(0.88, 0.88, 0.5, 8),
  },
  client: {
    label: "Client",
    color: "#fde047",
    icon: User,
    category: "infrastructure",
    geometry: () => new THREE.DodecahedronGeometry(0.8, 0),
  },
  gateway: {
    label: "Gateway",
    color: "#2dd4bf",
    icon: Radio,
    category: "infrastructure",
    geometry: () => new THREE.TorusKnotGeometry(0.5, 0.17, 64, 8),
  },
  worker: {
    label: "Worker",
    color: "#c084fc",
    icon: Cpu,
    category: "infrastructure",
    geometry: () => new THREE.ConeGeometry(0.75, 1.3, 4),
  },
  server: {
    label: "Server",
    color: "#60a5fa",
    icon: Server,
    category: "infrastructure",
    geometry: () => new THREE.BoxGeometry(0.9, 1.6, 0.9),
  },
  mobile: {
    label: "Mobile",
    color: "#fb7185",
    icon: Smartphone,
    category: "infrastructure",
    geometry: () => new THREE.BoxGeometry(0.55, 1.25, 0.14),
  },
  firewall: {
    label: "Firewall",
    color: "#facc15",
    icon: ShieldCheck,
    category: "infrastructure",
    geometry: () => new THREE.BoxGeometry(1.5, 1.0, 0.22),
  },
  cdn: {
    label: "CDN",
    color: "#7dd3fc",
    icon: Cloud,
    category: "infrastructure",
    geometry: () =>
      new THREE.RingGeometry(0.45, 0.85, 28).rotateX(-Math.PI / 2.4),
  },
  cluster: {
    label: "Cluster",
    color: "#4ade80",
    icon: Boxes,
    category: "infrastructure",
    geometry: () => new THREE.IcosahedronGeometry(0.85, 1),
  },
};

const CATEGORY_ORDER: { key: NodeCategory; label: string }[] = [
  { key: "software", label: "Software" },
  { key: "infrastructure", label: "Infrastructure" },
];

const COLOR_PRESETS = [
  "#5b8def",
  "#34d399",
  "#f0b429",
  "#a78bfa",
  "#f472b6",
  "#f87171",
  "#2dd4bf",
  "#e2e8f0",
];

const BG_COLOR = 0x0b0f14;
const UP = new THREE.Vector3(0, 1, 0);
const AXIS_DIRS: Record<Axis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};
const uid = (): string => Math.random().toString(36).slice(2, 10);

const initialNodes: SceneNode[] = [
  {
    id: "n1",
    type: "service",
    label: "API Gateway",
    color: null,
    spawnPosition: [0, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    note: "",
    signature: "",
    targetSceneId: null,
  },
  {
    id: "n2",
    type: "database",
    label: "Auth DB",
    color: null,
    spawnPosition: [4.2, 1, -1.6],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    note: "",
    signature: "",
    targetSceneId: null,
  },
  {
    id: "n3",
    type: "queue",
    label: "Event Queue",
    color: null,
    spawnPosition: [-4.2, 1, -1.6],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    note: "",
    signature: "",
    targetSceneId: null,
  },
  {
    id: "n4",
    type: "module",
    label: "Web App",
    color: null,
    spawnPosition: [0, 1, 4.2],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    note: "",
    signature: "",
    targetSceneId: null,
  },
  {
    id: "n5",
    type: "external",
    label: "Payment API",
    color: null,
    spawnPosition: [4.6, 1, 3],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    note: "",
    signature: "",
    targetSceneId: null,
  },
];
const initialEdges: SceneEdge[] = [
  { id: "e1", source: "n4", target: "n1", label: "calls" },
  { id: "e2", source: "n1", target: "n2", label: "reads / writes" },
  { id: "e3", source: "n1", target: "n3", label: "publishes" },
  { id: "e4", source: "n1", target: "n5", label: "charges" },
];

function projectToScreen(
  vec3: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): ScreenPoint {
  const v = vec3.clone().project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * width,
    y: (1 - (v.y * 0.5 + 0.5)) * height,
    visible: v.z < 1,
  };
}

const RAD2DEG = 180 / Math.PI;

const emptyXform = (): XformState => ({
  active: false,
  mode: null,
  nodeIds: [],
  axis: null,
  anchors: new Map(),
  pivot: null,
  movePlane: null,
  moveRefPoint: null,
  moveAxisDir: null,
  moveRefScalar: 0,
  rotateRefX: 0,
  scaleRefDist: 1,
  scaleCenter: null,
});

const emptyDrag = (): DragState => ({
  ids: [],
  mode: "free",
  grabPoint: new THREE.Vector3(),
  plane: null,
  axis: null,
  axisDir: null,
  anchorCentroid: null,
  refScalar: 0,
  anchors: new Map(),
  moved: false,
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SystemSpace() {
  const [nodes, setNodes] = useState<SceneNode[]>(initialNodes);
  const [edges, setEdges] = useState<SceneEdge[]>(initialEdges);
  const [selected, setSelected] = useState<SelectedRef>(null); // last-touched item
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // multi-select node ids
  const [connectMode, setConnectMode] = useState(false);
  const [pendingSource, setPendingSource] = useState<string | null>(null);
  // xformInfo state removed (unused)
  const [importError, setImportError] = useState<string | null>(null);
  const [importMenuOpen, setImportMenuOpen] = useState(false);

  // Shown when an imported file contains more than one scene and the user needs to
  // choose which one(s) to bring in (used for both "merge into current" and, when
  // multiple scenes exist, informational display before a full "replace").
  const [importPicker, setImportPicker] = useState<{
    scenes: {
      idx: number;
      name: string;
      nodes: SceneNode[];
      edges: SceneEdge[];
    }[];
    selected: Set<number>;
  } | null>(null);

  // scenes: tabs, each with its own nodes/edges. Only the active scene's data
  // lives in `nodes`/`edges` state above; the rest sit in sceneStoreRef.
  const [sceneMeta, setSceneMeta] = useState<SceneMetaEntry[]>([
    { id: "scene-main", name: "Main" },
  ]);
  const [activeSceneId, setActiveSceneId] = useState("scene-main");
  const [renamingSceneId, setRenamingSceneId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const sceneStoreRef = useRef<Map<string, SceneStoreEntry>>(new Map());

  // ---- registry-driven scene creation ----
  const [registryOpen, setRegistryOpen] = useState(false);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [registryAssets, setRegistryAssets] = useState<RegistryAsset[]>([]);
  const [registrySelected, setRegistrySelected] = useState<Set<string>>(
    new Set(),
  );
  const [registryTypeFilter, setRegistryTypeFilter] = useState<
    RegistryAssetType | "all"
  >("all");
  const [registrySceneName, setRegistrySceneName] = useState("From Registry");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importModeRef = useRef<"replace" | "merge">("replace");
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const rafRef = useRef<number | null>(null);

  const meshMap = useRef<Map<string, THREE.Mesh>>(new Map());
  const edgeMeshMap = useRef<Map<string, EdgeMeshObj>>(new Map());
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const edgeLabelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const gizmoGroupRef = useRef<THREE.Group | null>(null);
  const gizmoMeshesRef = useRef<THREE.Mesh[]>([]);
  const marqueeElRef = useRef<HTMLDivElement>(null);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const modeRef = useRef<"select" | "connect">("select");
  const pendingSourceRef = useRef<string | null>(null);
  const selectedRef = useRef<SelectedRef>(null);
  const selectedIdsRef = useRef<string[]>([]);
  const onRegistrySelectRef = useRef<((assetId: string) => void) | null>(null);

  // Direct-drag: mouse-down-and-drag on node(s) ("free", xz-plane) or a gizmo arrow ("axis", move only)
  const draggingRef = useRef<DragState>(emptyDrag());

  // Unified Blender-style modal transform: G (move) / R (rotate) / S (scale), then optional X/Y/Z axis lock.
  // Supports single or multiple selected nodes via nodeIds + per-node anchors around a shared pivot.
  const xformRef = useRef<XformState>(emptyXform());

  const marqueeStateRef = useRef({ active: false, startX: 0, startY: 0 });
  const lastMouseClientRef = useRef({ x: 0, y: 0 });
  const orbitStateRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const panStateRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const sphericalRef = useRef({ radius: 15, theta: 0.9, phi: 1.0 });
  const targetRef = useRef(new THREE.Vector3(0, 1, 0));

  const sharedGeo = useRef<{
    cylinder: THREE.CylinderGeometry;
    cone: THREE.ConeGeometry;
  } | null>(null);

  // live-updating HUD DOM refs (bypass React state so they can update every frame cheaply)
  const hudPosRef = useRef<HTMLSpanElement>(null);
  const hudRotRef = useRef<HTMLSpanElement>(null);
  const hudScaleRef = useRef<HTMLSpanElement>(null);
  const xformBadgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    modeRef.current = connectMode ? "connect" : "select";
  }, [connectMode]);
  useEffect(() => {
    pendingSourceRef.current = pendingSource;
  }, [pendingSource]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  /* ---------------- scene setup (runs once) ---------------- */
  useEffect(() => {
    const container = canvasWrapRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    scene.fog = new THREE.Fog(BG_COLOR, 40, 220);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 800);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0x8899aa, 0.65);
    scene.add(ambient);
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dir1.position.set(6, 10, 6);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x5b8def, 0.25);
    dir2.position.set(-8, 4, -6);
    scene.add(dir2);

    const fineGrid = new THREE.GridHelper(320, 320, 0x1e2733, 0x161d26);
    fineGrid.position.y = 0;
    scene.add(fineGrid);
    const majorGrid = new THREE.GridHelper(320, 32, 0x39465a, 0x263241);
    majorGrid.position.y = 0.001;
    scene.add(majorGrid);

    sharedGeo.current = {
      cylinder: new THREE.CylinderGeometry(0.035, 0.035, 1, 8),
      cone: new THREE.ConeGeometry(0.13, 0.36, 10),
    };

    /* ---- move gizmo: draggable X/Y/Z arrows anchored at the selection pivot ---- */
    const gizmoGroup = new THREE.Group();
    gizmoGroup.visible = false;
    gizmoGroup.renderOrder = 999;
    scene.add(gizmoGroup);
    gizmoGroupRef.current = gizmoGroup;

    const AXES: { key: Axis; color: number; dir: THREE.Vector3 }[] = [
      { key: "x", color: 0xef4444, dir: AXIS_DIRS.x },
      { key: "y", color: 0x22c55e, dir: AXIS_DIRS.y },
      { key: "z", color: 0x3b82f6, dir: AXIS_DIRS.z },
    ];
    const gizmoMeshes: THREE.Mesh[] = [];
    const startOffset = 1.05;
    const shaftLen = 1.0;
    const coneLen = 0.34;
    AXES.forEach(({ key, color, dir }) => {
      const mat = new THREE.MeshBasicMaterial({
        color,
        depthTest: false,
        fog: false,
      });
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, shaftLen, 8),
        mat,
      );
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, coneLen, 10),
        mat.clone(),
      );
      const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
      shaft.quaternion.copy(q);
      cone.quaternion.copy(q);
      shaft.position.copy(
        dir.clone().multiplyScalar(startOffset + shaftLen / 2),
      );
      cone.position.copy(
        dir.clone().multiplyScalar(startOffset + shaftLen + coneLen / 2),
      );
      (shaft.userData as GizmoMeshUserData) = { kind: "gizmo", axis: key };
      (cone.userData as GizmoMeshUserData) = { kind: "gizmo", axis: key };
      shaft.renderOrder = 999;
      cone.renderOrder = 999;
      gizmoGroup.add(shaft, cone);
      gizmoMeshes.push(shaft, cone);
    });
    gizmoMeshesRef.current = gizmoMeshes;

    function updateCamera() {
      const s = sphericalRef.current;
      const t = targetRef.current;
      camera.position.set(
        t.x + s.radius * Math.sin(s.phi) * Math.sin(s.theta),
        t.y + s.radius * Math.cos(s.phi),
        t.z + s.radius * Math.sin(s.phi) * Math.cos(s.theta),
      );
      camera.lookAt(t);
    }

    function formatNum(v: number) {
      return (Math.round(v * 100) / 100).toFixed(2);
    }

    function computeCentroid(ids: string[]): THREE.Vector3 | null {
      const c = new THREE.Vector3();
      let n = 0;
      ids.forEach((id) => {
        const m = meshMap.current.get(id);
        if (m) {
          c.add(m.position);
          n++;
        }
      });
      if (n === 0) return null;
      return c.multiplyScalar(1 / n);
    }

    function updateHud() {
      const ids = selectedIdsRef.current;
      if (!ids || ids.length !== 1) return;
      const mesh = meshMap.current.get(ids[0]);
      if (!mesh) return;
      if (hudPosRef.current) {
        hudPosRef.current.textContent = `${formatNum(mesh.position.x)}, ${formatNum(mesh.position.y)}, ${formatNum(mesh.position.z)}`;
      }
      if (hudRotRef.current) {
        hudRotRef.current.textContent = `${formatNum(mesh.rotation.x * RAD2DEG)}°, ${formatNum(mesh.rotation.y * RAD2DEG)}°, ${formatNum(mesh.rotation.z * RAD2DEG)}°`;
      }
      if (hudScaleRef.current) {
        hudScaleRef.current.textContent = `${formatNum(mesh.scale.x)}x, ${formatNum(mesh.scale.y)}x, ${formatNum(mesh.scale.z)}x`;
      }
      const x = xformRef.current;
      if (xformBadgeRef.current) {
        if (x.active && x.mode) {
          const axisTxt = x.axis ? x.axis.toUpperCase() : "free";
          const countTxt =
            x.nodeIds.length > 1 ? ` · ${x.nodeIds.length} objects` : "";
          let valueTxt = "";
          if (x.mode === "move") {
            const anchor = x.anchors.get(ids[0]);
            const d = anchor
              ? mesh.position.clone().sub(anchor.pos).length()
              : 0;
            valueTxt = `Δ ${formatNum(d)}`;
          } else if (x.mode === "rotate" && x.axis) {
            const deg = mesh.rotation[x.axis] * RAD2DEG;
            valueTxt = `${formatNum(deg)}°`;
          } else if (x.mode === "scale") {
            const val = x.axis ? mesh.scale[x.axis] : mesh.scale.x;
            valueTxt = `${formatNum(val)}x`;
          }
          xformBadgeRef.current.textContent = `${x.mode.toUpperCase()} · ${axisTxt}${countTxt}  ${valueTxt}  (click/Enter to confirm, right-click/Esc to cancel)`;
          xformBadgeRef.current.style.display = "block";
        } else {
          xformBadgeRef.current.style.display = "none";
        }
      }
    }

    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      updateCamera();

      const w = container!.clientWidth;
      const h = container!.clientHeight;

      // edges
      edgesRef.current.forEach((edge) => {
        const srcMesh = meshMap.current.get(edge.source);
        const tgtMesh = meshMap.current.get(edge.target);
        const obj = edgeMeshMap.current.get(edge.id);
        if (!srcMesh || !tgtMesh || !obj) return;
        const start = srcMesh.position;
        const end = tgtMesh.position;
        const dir = new THREE.Vector3().subVectors(end, start);
        const dist = dir.length();
        if (dist < 0.01) return;
        dir.normalize();
        const nodeOffset = 0.95;
        const coneLen2 = 0.36;
        const lineStart = start.clone().addScaledVector(dir, nodeOffset);
        const lineEnd = end
          .clone()
          .addScaledVector(dir, -(nodeOffset + coneLen2));
        const lineLen = Math.max(lineStart.distanceTo(lineEnd), 0.001);
        const mid = lineStart.clone().add(lineEnd).multiplyScalar(0.5);

        obj.line.position.copy(mid);
        obj.line.scale.set(1, lineLen, 1);
        obj.line.quaternion.setFromUnitVectors(UP, dir);

        const conePos = end.clone().addScaledVector(dir, -nodeOffset);
        obj.cone.position.copy(conePos);
        obj.cone.quaternion.setFromUnitVectors(UP, dir);

        const labelEl = edgeLabelRefs.current[edge.id];
        if (labelEl) {
          const scr = projectToScreen(mid, camera, w, h);
          labelEl.style.transform = `translate(${scr.x}px, ${scr.y}px) translate(-50%, -50%)`;
          labelEl.style.display = scr.visible ? "flex" : "none";
        }
      });

      // node labels
      nodesRef.current.forEach((n) => {
        const mesh = meshMap.current.get(n.id);
        const el = labelRefs.current[n.id];
        if (mesh && el) {
          const scr = projectToScreen(mesh.position, camera, w, h);
          el.style.transform = `translate(${scr.x}px, ${scr.y}px) translate(-50%, -145%)`;
          el.style.display = scr.visible ? "flex" : "none";
        }
      });

      // selection gizmo (single node or centroid of a multi-selection)
      const ids = selectedIdsRef.current;
      if (ids && ids.length && modeRef.current !== "connect") {
        const pivot = computeCentroid(ids);
        if (pivot) {
          gizmoGroup.position.copy(pivot);
          const x = xformRef.current;
          if (x.active && x.mode === "move") {
            gizmoGroup.visible = !!x.axis;
            gizmoMeshesRef.current.forEach((m) => {
              m.visible = (m.userData as GizmoMeshUserData).axis === x.axis;
            });
          } else if (x.active) {
            gizmoGroup.visible = false;
          } else {
            gizmoGroup.visible = true;
            gizmoMeshesRef.current.forEach((m) => {
              m.visible = true;
            });
          }
        } else {
          gizmoGroup.visible = false;
        }
      } else {
        gizmoGroup.visible = false;
      }

      updateHud();
      renderer.render(scene, camera);
    }
    animate();

    /* ---------------- shared axis-projection helpers ---------------- */
    function rayFromClientPos(clientX: number, clientY: number) {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(ndc, camera);
      return raycasterRef.current.ray;
    }

    function closestScalarOnLine(
      ray: THREE.Ray,
      P0: THREE.Vector3,
      d: THREE.Vector3,
    ) {
      const O = ray.origin;
      const rd = ray.direction;
      const w0 = new THREE.Vector3().subVectors(O, P0);
      const a = d.dot(d);
      const b = d.dot(rd);
      const c = rd.dot(rd);
      const dVal = d.dot(w0);
      const eVal = rd.dot(w0);
      const denom = a * c - b * b;
      if (Math.abs(denom) < 1e-6) return 0;
      return (b * eVal - c * dVal) / denom;
    }

    function axisDirFor(key: Axis) {
      return AXIS_DIRS[key] || AXIS_DIRS.x;
    }

    function commitXformNodes(ids: string[]) {
      if (!ids || !ids.length) return;
      const updates = new Map<string, Partial<SceneNode>>();
      ids.forEach((id) => {
        const mesh = meshMap.current.get(id);
        if (!mesh) return;
        updates.set(id, {
          spawnPosition: [mesh.position.x, mesh.position.y, mesh.position.z],
          rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
          scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
        });
      });
      setNodes((prev) =>
        prev.map((n) =>
          updates.has(n.id) ? { ...n, ...updates.get(n.id) } : n,
        ),
      );
    }

    /* ---------------- modal transform: G (move) / R (rotate) / S (scale), multi-node aware ---------------- */
    function startXform(mode: XformMode, nodeIds: string[]) {
      const ids = (nodeIds || []).filter((id) => meshMap.current.has(id));
      if (!ids.length) return;
      const anchors = new Map<string, XformAnchor>();
      ids.forEach((id) => {
        const mesh = meshMap.current.get(id)!;
        anchors.set(id, {
          pos: mesh.position.clone(),
          rot: mesh.rotation.clone(),
          scale: mesh.scale.clone(),
        });
      });
      const pivot = computeCentroid(ids);
      if (!pivot) return;
      const base: XformState = {
        ...emptyXform(),
        active: true,
        mode,
        nodeIds: ids,
        axis: null,
        anchors,
        pivot,
      };

      if (mode === "move") {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -pivot.y);
        const ray = rayFromClientPos(
          lastMouseClientRef.current.x,
          lastMouseClientRef.current.y,
        );
        const refPoint = new THREE.Vector3();
        const hit = ray.intersectPlane(plane, refPoint);
        xformRef.current = {
          ...base,
          movePlane: plane,
          moveRefPoint: hit ? refPoint.clone() : pivot.clone(),
          moveAxisDir: null,
          moveRefScalar: 0,
        };
      } else if (mode === "rotate") {
        xformRef.current = {
          ...base,
          axis: "y",
          rotateRefX: lastMouseClientRef.current.x,
        };
      } else if (mode === "scale") {
        const w = container!.clientWidth;
        const h = container!.clientHeight;
        const centerScreen = projectToScreen(pivot, camera, w, h);
        const refDist = Math.max(
          Math.hypot(
            lastMouseClientRef.current.x - centerScreen.x,
            lastMouseClientRef.current.y - centerScreen.y,
          ),
          4,
        );
        xformRef.current = {
          ...base,
          scaleRefDist: refDist,
          scaleCenter: centerScreen,
        };
      }
      setXformInfo({ mode, axis: xformRef.current.axis });
    }

    function setAxisForXform(key: Axis) {
      const x = xformRef.current;
      if (!x.active || !x.mode) return;

      if (x.mode === "move") {
        x.pivot = computeCentroid(x.nodeIds) || x.pivot;
        x.anchors.forEach((a, id) => {
          const m = meshMap.current.get(id);
          if (m) a.pos = m.position.clone();
        });
        if (!x.pivot) return;
        if (x.axis === key) {
          const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -x.pivot.y);
          const ray = rayFromClientPos(
            lastMouseClientRef.current.x,
            lastMouseClientRef.current.y,
          );
          const refPoint = new THREE.Vector3();
          const hit = ray.intersectPlane(plane, refPoint);
          x.axis = null;
          x.movePlane = plane;
          x.moveRefPoint = hit ? refPoint.clone() : x.pivot.clone();
        } else {
          const dir = axisDirFor(key);
          const ray = rayFromClientPos(
            lastMouseClientRef.current.x,
            lastMouseClientRef.current.y,
          );
          const refScalar = closestScalarOnLine(ray, x.pivot, dir);
          x.axis = key;
          x.moveAxisDir = dir;
          x.moveRefScalar = refScalar;
        }
      } else if (x.mode === "rotate") {
        x.axis = key;
        x.rotateRefX = lastMouseClientRef.current.x;
        x.anchors.forEach((a, id) => {
          const m = meshMap.current.get(id);
          if (m) a.rot = m.rotation.clone();
        });
      } else if (x.mode === "scale") {
        x.axis = x.axis === key ? null : key;
        const pivot = computeCentroid(x.nodeIds) || x.pivot;
        if (!pivot) return;
        x.pivot = pivot;
        const w = container!.clientWidth;
        const h = container!.clientHeight;
        const centerScreen = projectToScreen(pivot, camera, w, h);
        x.scaleCenter = centerScreen;
        x.scaleRefDist = Math.max(
          Math.hypot(
            lastMouseClientRef.current.x - centerScreen.x,
            lastMouseClientRef.current.y - centerScreen.y,
          ),
          4,
        );
        x.anchors.forEach((a, id) => {
          const m = meshMap.current.get(id);
          if (m) a.scale = m.scale.clone();
        });
      }
      setXformInfo({ mode: x.mode, axis: x.axis });
    }

    function updateXformMove(clientX: number, clientY: number) {
      const x = xformRef.current;
      if (!x.active || !x.mode) return;

      if (x.mode === "move") {
        const ray = rayFromClientPos(clientX, clientY);
        if (x.axis && x.moveAxisDir && x.pivot) {
          const sc = closestScalarOnLine(ray, x.pivot, x.moveAxisDir);
          const delta = sc - x.moveRefScalar;
          x.nodeIds.forEach((id) => {
            const a = x.anchors.get(id);
            const mesh = meshMap.current.get(id);
            if (!a || !mesh || !x.moveAxisDir) return;
            const newPos = a.pos.clone().addScaledVector(x.moveAxisDir, delta);
            if (x.moveAxisDir.y > 0.5) newPos.y = Math.max(newPos.y, 0.2);
            mesh.position.copy(newPos);
          });
        } else if (x.movePlane && x.moveRefPoint) {
          const p = new THREE.Vector3();
          const hit = ray.intersectPlane(x.movePlane, p);
          if (hit) {
            const delta = p.clone().sub(x.moveRefPoint);
            x.nodeIds.forEach((id) => {
              const a = x.anchors.get(id);
              const mesh = meshMap.current.get(id);
              if (!a || !mesh) return;
              mesh.position.copy(a.pos.clone().add(delta));
            });
          }
        }
      } else if (x.mode === "rotate" && x.axis) {
        const dx = clientX - x.rotateRefX;
        const delta = dx * 0.012;
        x.nodeIds.forEach((id) => {
          const a = x.anchors.get(id);
          const mesh = meshMap.current.get(id);
          if (!a || !mesh || !x.axis) return;
          mesh.rotation[x.axis] = a.rot[x.axis] + delta;
        });
      } else if (x.mode === "scale" && x.scaleCenter) {
        const dist = Math.max(
          Math.hypot(clientX - x.scaleCenter.x, clientY - x.scaleCenter.y),
          4,
        );
        const factor = Math.max(dist / x.scaleRefDist, 0.05);
        x.nodeIds.forEach((id) => {
          const a = x.anchors.get(id);
          const mesh = meshMap.current.get(id);
          if (!a || !mesh) return;
          if (x.axis) {
            mesh.scale[x.axis] = Math.max(0.05, a.scale[x.axis] * factor);
          } else {
            mesh.scale.set(
              Math.max(0.05, a.scale.x * factor),
              Math.max(0.05, a.scale.y * factor),
              Math.max(0.05, a.scale.z * factor),
            );
          }
        });
      }
    }

    function confirmXform() {
      if (!xformRef.current.active) return;
      const ids = xformRef.current.nodeIds;
      xformRef.current = emptyXform();
      setXformInfo(null);
      commitXformNodes(ids);
    }

    function cancelXform() {
      const x = xformRef.current;
      if (!x.active) return;
      x.nodeIds.forEach((id) => {
        const a = x.anchors.get(id);
        const mesh = meshMap.current.get(id);
        if (a && mesh) {
          mesh.position.copy(a.pos);
          mesh.rotation.copy(a.rot);
          mesh.scale.copy(a.scale);
        }
      });
      xformRef.current = emptyXform();
      setXformInfo(null);
    }

    function currentNodeIds(): string[] {
      if (selectedIdsRef.current && selectedIdsRef.current.length)
        return selectedIdsRef.current;
      if (selectedRef.current && selectedRef.current.kind === "node")
        return [selectedRef.current.id];
      return [];
    }

    /* ---------------- pointer handling ---------------- */
    function ndcFromEvent(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
    }

    function pick(ndc: THREE.Vector2) {
      raycasterRef.current.setFromCamera(ndc, camera as any);
      const nodeMeshes = Array.from(meshMap.current.values());
      const edgeMeshes = Array.from(edgeMeshMap.current.values()).flatMap(
        (o) => [o.line, o.cone],
      );
      const gizmoMeshes = gizmoGroup.visible ? gizmoMeshesRef.current : [];
      return raycasterRef.current.intersectObjects([
        ...gizmoMeshes,
        ...nodeMeshes,
        ...edgeMeshes,
      ]);
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button === 2) {
        panStateRef.current = {
          active: true,
          lastX: e.clientX,
          lastY: e.clientY,
        };
        return;
      }
      if (e.button !== 0) return;
      const ndc = ndcFromEvent(e);
      const hits = pick(ndc);
      if (hits.length > 0) {
        const obj = hits[0].object as THREE.Mesh;
        const userData = obj.userData as
          | NodeMeshUserData
          | EdgeMeshUserData
          | GizmoMeshUserData;

        if (userData.kind === "gizmo") {
          const ids = selectedIdsRef.current.length
            ? selectedIdsRef.current
            : selectedRef.current && selectedRef.current.kind === "node"
              ? [selectedRef.current.id]
              : [];
          if (ids.length) {
            const axis = userData.axis;
            const dir = axisDirFor(axis);
            const centroid = computeCentroid(ids);
            if (!centroid) return;
            const refScalar = closestScalarOnLine(
              raycasterRef.current.ray,
              centroid,
              dir,
            );
            const anchors = new Map<string, THREE.Vector3>();
            ids.forEach((id) => {
              const m = meshMap.current.get(id);
              if (m) anchors.set(id, m.position.clone());
            });
            draggingRef.current = {
              ...emptyDrag(),
              ids,
              mode: "axis",
              axis,
              axisDir: dir,
              anchorCentroid: centroid,
              refScalar,
              anchors,
            };
          }
          return;
        }

        if (userData.kind === "node") {
          const nodeId = userData.nodeId;
          if (modeRef.current === "connect") {
            handleConnectClick(nodeId);
            return;
          }
          if (e.shiftKey) {
            const has = selectedIdsRef.current.includes(nodeId);
            const next = has
              ? selectedIdsRef.current.filter((id) => id !== nodeId)
              : [...selectedIdsRef.current, nodeId];
            selectedIdsRef.current = next;
            setSelectedIds(next);
            selectedRef.current = { kind: "node", id: nodeId };
            setSelected({ kind: "node", id: nodeId });
            return;
          }

          let dragIds: string[];
          if (
            selectedIdsRef.current.includes(nodeId) &&
            selectedIdsRef.current.length > 1
          ) {
            dragIds = selectedIdsRef.current;
          } else {
            dragIds = [nodeId];
            selectedIdsRef.current = dragIds;
            setSelectedIds(dragIds);
            selectedRef.current = { kind: "node", id: nodeId };
            setSelected({ kind: "node", id: nodeId });

            const nd = nodesRef.current.find((n) => n.id === nodeId);
            if (nd && nd.registryAssetId && onRegistrySelectRef.current) {
              onRegistrySelectRef.current(nd.registryAssetId);
            }
          }

          const plane = new THREE.Plane(
            new THREE.Vector3(0, 1, 0),
            -obj.position.y,
          );
          const hitPoint = new THREE.Vector3();
          raycasterRef.current.ray.intersectPlane(plane, hitPoint);
          const anchors = new Map<string, THREE.Vector3>();
          dragIds.forEach((id) => {
            const m = meshMap.current.get(id);
            if (m) anchors.set(id, m.position.clone());
          });
          draggingRef.current = {
            ...emptyDrag(),
            ids: dragIds,
            mode: "free",
            grabPoint: hitPoint.clone(),
            plane,
            anchors,
          };
        } else if (userData.kind === "edge") {
          setSelected({ kind: "edge", id: userData.edgeId });
          selectedRef.current = { kind: "edge", id: userData.edgeId };
          setSelectedIds([]);
          selectedIdsRef.current = [];
        }
      } else if (e.shiftKey) {
        const rect = container!.getBoundingClientRect();
        marqueeStateRef.current = {
          active: true,
          startX: e.clientX,
          startY: e.clientY,
        };
        if (marqueeElRef.current) {
          marqueeElRef.current.style.left = `${e.clientX - rect.left}px`;
          marqueeElRef.current.style.top = `${e.clientY - rect.top}px`;
          marqueeElRef.current.style.width = "0px";
          marqueeElRef.current.style.height = "0px";
          marqueeElRef.current.style.display = "block";
        }
      } else {
        setSelected(null);
        selectedRef.current = null;
        setSelectedIds([]);
        selectedIdsRef.current = [];
        orbitStateRef.current = {
          active: true,
          lastX: e.clientX,
          lastY: e.clientY,
        };
      }
    }

    function onMouseMove(e: MouseEvent) {
      lastMouseClientRef.current = { x: e.clientX, y: e.clientY };

      if (marqueeStateRef.current.active) {
        const rect = container!.getBoundingClientRect();
        const x1 = marqueeStateRef.current.startX - rect.left;
        const y1 = marqueeStateRef.current.startY - rect.top;
        const x2 = e.clientX - rect.left;
        const y2 = e.clientY - rect.top;
        if (marqueeElRef.current) {
          marqueeElRef.current.style.left = `${Math.min(x1, x2)}px`;
          marqueeElRef.current.style.top = `${Math.min(y1, y2)}px`;
          marqueeElRef.current.style.width = `${Math.abs(x2 - x1)}px`;
          marqueeElRef.current.style.height = `${Math.abs(y2 - y1)}px`;
        }
        return;
      }

      if (xformRef.current.active) {
        updateXformMove(e.clientX, e.clientY);
        return;
      }
      if (panStateRef.current.active) {
        const dx = e.clientX - panStateRef.current.lastX;
        const dy = e.clientY - panStateRef.current.lastY;
        panStateRef.current.lastX = e.clientX;
        panStateRef.current.lastY = e.clientY;
        const rightVec = new THREE.Vector3().setFromMatrixColumn(
          camera.matrix,
          0,
        );
        const upVec = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
        const panSpeed = sphericalRef.current.radius * 0.0016;
        targetRef.current.addScaledVector(rightVec, -dx * panSpeed);
        targetRef.current.addScaledVector(upVec, dy * panSpeed);
        return;
      }
      if (
        draggingRef.current.ids.length &&
        draggingRef.current.mode === "axis"
      ) {
        const ndc = ndcFromEvent(e);
        raycasterRef.current.setFromCamera(ndc, camera);
        const d = draggingRef.current;
        if (!d.anchorCentroid || !d.axisDir) return;
        const sc = closestScalarOnLine(
          raycasterRef.current.ray,
          d.anchorCentroid,
          d.axisDir,
        );
        const delta = sc - d.refScalar;
        d.ids.forEach((id) => {
          const anchor = d.anchors.get(id);
          const mesh = meshMap.current.get(id);
          if (!anchor || !mesh || !d.axisDir) return;
          const newPos = anchor.clone().addScaledVector(d.axisDir, delta);
          if (d.axisDir.y > 0.5) newPos.y = Math.max(newPos.y, 0.2);
          mesh.position.copy(newPos);
        });
        d.moved = true;
        return;
      }
      if (
        draggingRef.current.ids.length &&
        draggingRef.current.mode === "free"
      ) {
        const ndc = ndcFromEvent(e);
        raycasterRef.current.setFromCamera(ndc, camera);
        const hitPoint = new THREE.Vector3();
        const plane = draggingRef.current.plane;
        if (!plane) return;
        const hit = raycasterRef.current.ray.intersectPlane(plane, hitPoint);
        if (hit) {
          const d = draggingRef.current;
          const delta = hitPoint.clone().sub(d.grabPoint);
          d.ids.forEach((id) => {
            const anchor = d.anchors.get(id);
            const mesh = meshMap.current.get(id);
            if (!anchor || !mesh) return;
            mesh.position.x = anchor.x + delta.x;
            mesh.position.z = anchor.z + delta.z;
          });
          d.moved = true;
        }
        return;
      }
      if (orbitStateRef.current.active) {
        const dx = e.clientX - orbitStateRef.current.lastX;
        const dy = e.clientY - orbitStateRef.current.lastY;
        orbitStateRef.current.lastX = e.clientX;
        orbitStateRef.current.lastY = e.clientY;
        const s = sphericalRef.current;
        s.theta -= dx * 0.006;
        s.phi = Math.min(Math.max(s.phi - dy * 0.006, 0.15), Math.PI - 0.15);
      }
    }

    function onMouseUp() {
      if (marqueeStateRef.current.active) {
        const rect = container!.getBoundingClientRect();
        const x1 = marqueeStateRef.current.startX - rect.left;
        const y1 = marqueeStateRef.current.startY - rect.top;
        const x2 = lastMouseClientRef.current.x - rect.left;
        const y2 = lastMouseClientRef.current.y - rect.top;
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);
        const w = container!.clientWidth;
        const h = container!.clientHeight;
        const picked: string[] = [];
        if (Math.abs(right - left) > 3 && Math.abs(bottom - top) > 3) {
          meshMap.current.forEach((mesh, id) => {
            const scr = projectToScreen(mesh.position, camera, w, h);
            if (
              scr.visible &&
              scr.x >= left &&
              scr.x <= right &&
              scr.y >= top &&
              scr.y <= bottom
            )
              picked.push(id);
          });
        }
        selectedIdsRef.current = picked;
        setSelectedIds(picked);
        const lastId = picked.length ? picked[picked.length - 1] : null;
        selectedRef.current = lastId ? { kind: "node", id: lastId } : null;
        setSelected(selectedRef.current);
        marqueeStateRef.current.active = false;
        if (marqueeElRef.current) marqueeElRef.current.style.display = "none";
        return;
      }

      const d = draggingRef.current;
      if (d.ids.length && d.moved && (d.mode === "free" || d.mode === "axis")) {
        commitXformNodes(d.ids);
      }
      draggingRef.current = emptyDrag();
      orbitStateRef.current.active = false;
      panStateRef.current.active = false;
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const s = sphericalRef.current;
      s.radius = Math.min(Math.max(s.radius + e.deltaY * 0.03, 3), 160);
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    function onGlobalMouseDownCapture(e: MouseEvent) {
      if (!xformRef.current.active) return;
      if (e.button === 0) {
        confirmXform();
        e.preventDefault();
        e.stopPropagation();
      } else if (e.button === 2) {
        cancelXform();
        e.preventDefault();
        e.stopPropagation();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement && document.activeElement.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (xformRef.current.active) {
        const key = e.key.toLowerCase();
        if (key === "x" || key === "y" || key === "z") {
          e.preventDefault();
          setAxisForXform(key as Axis);
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelXform();
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          confirmXform();
        }
        return;
      }

      if (typing) return;

      if (e.key === "g" || e.key === "G") {
        const ids = currentNodeIds();
        if (ids.length) {
          e.preventDefault();
          startXform("move", ids);
        }
        return;
      }
      if (e.key === "r" || e.key === "R") {
        const ids = currentNodeIds();
        if (ids.length) {
          e.preventDefault();
          startXform("rotate", ids);
        }
        return;
      }
      if (e.key === "s" || e.key === "S") {
        const ids = currentNodeIds();
        if (ids.length) {
          e.preventDefault();
          startXform("scale", ids);
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const ids = currentNodeIds();
        if (ids.length) {
          deleteNodesRef.current(ids);
        } else if (selectedRef.current && selectedRef.current.kind === "edge") {
          deleteEdgeRef.current(selectedRef.current.id);
        }
        return;
      }
      if (e.key === "Escape") {
        setSelected(null);
        selectedRef.current = null;
        setSelectedIds([]);
        selectedIdsRef.current = [];
        setPendingSource(null);
        pendingSourceRef.current = null;
        setConnectMode(false);
      }
    }

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousedown", onGlobalMouseDownCapture, true);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("contextmenu", onContextMenu);

    const resizeObserver = new ResizeObserver(() => {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousedown", onGlobalMouseDownCapture, true);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("contextmenu", onContextMenu);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(dom)) container.removeChild(dom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- connect-mode click logic ---------------- */
  const handleConnectClick = useCallback((nodeId: string) => {
    if (!pendingSourceRef.current) {
      pendingSourceRef.current = nodeId;
      setPendingSource(nodeId);
    } else {
      const source = pendingSourceRef.current;
      if (source !== nodeId) {
        setEdges((prev) => {
          const exists = prev.some(
            (e) =>
              (e.source === source && e.target === nodeId) ||
              (e.source === nodeId && e.target === source),
          );
          if (exists) return prev;
          return [
            ...prev,
            { id: uid(), source, target: nodeId, label: "uses" },
          ];
        });
      }
      pendingSourceRef.current = null;
      setPendingSource(null);
    }
  }, []);

  /* ---------------- sync node meshes ---------------- */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const currentIds = new Set(nodes.map((n) => n.id));

    for (const [id, mesh] of meshMap.current) {
      if (!currentIds.has(id)) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        meshMap.current.delete(id);
        delete labelRefs.current[id];
      }
    }

    nodes.forEach((n, idx) => {
      let mesh = meshMap.current.get(n.id);
      const typeCfg = NODE_TYPES[n.type] || NODE_TYPES.module;
      if (mesh && (mesh.userData as NodeMeshUserData).type !== n.type) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        meshMap.current.delete(n.id);
        mesh = undefined;
      }
      if (!mesh) {
        const geo = typeCfg.geometry();
        const mat = new THREE.MeshStandardMaterial({
          color: n.color || typeCfg.color,
          metalness: 0.35,
          roughness: 0.45,
          emissive: 0x000000,
          side: THREE.DoubleSide,
        });
        mesh = new THREE.Mesh(geo, mat);
        const pos = n.spawnPosition || [
          Math.cos(idx * 2.4) * 4.5,
          1,
          Math.sin(idx * 2.4) * 4.5,
        ];
        mesh.position.set(pos[0], pos[1], pos[2]);
        const rot = n.rotation || [0, 0, 0];
        mesh.rotation.set(rot[0], rot[1], rot[2]);
        const scl = n.scale || [1, 1, 1];
        mesh.scale.set(scl[0], scl[1], scl[2]);
        (mesh.userData as NodeMeshUserData) = {
          nodeId: n.id,
          type: n.type,
          kind: "node",
        };
        scene.add(mesh);
        meshMap.current.set(n.id, mesh);
      } else {
        (mesh.material as THREE.MeshStandardMaterial).color.set(
          n.color || typeCfg.color,
        );
      }
    });
  }, [nodes]);

  /* ---------------- sync edge meshes ---------------- */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !sharedGeo.current) return;
    const currentIds = new Set(edges.map((e) => e.id));

    for (const [id, obj] of edgeMeshMap.current) {
      if (!currentIds.has(id)) {
        scene.remove(obj.line);
        scene.remove(obj.cone);
        (obj.line.material as THREE.Material).dispose();
        (obj.cone.material as THREE.Material).dispose();
        edgeMeshMap.current.delete(id);
        delete edgeLabelRefs.current[id];
      }
    }

    edges.forEach((e) => {
      const obj = edgeMeshMap.current.get(e.id);
      if (!obj) {
        const lineMat = new THREE.MeshStandardMaterial({
          color: e.color || "#8b93a1",
          metalness: 0.2,
          roughness: 0.6,
        });
        const coneMat = lineMat.clone();
        const line = new THREE.Mesh(sharedGeo.current!.cylinder, lineMat);
        const cone = new THREE.Mesh(sharedGeo.current!.cone, coneMat);
        (line.userData as EdgeMeshUserData) = { edgeId: e.id, kind: "edge" };
        (cone.userData as EdgeMeshUserData) = { edgeId: e.id, kind: "edge" };
        scene.add(line);
        scene.add(cone);
        edgeMeshMap.current.set(e.id, { line, cone });
      } else {
        (obj.line.material as THREE.MeshStandardMaterial).color.set(
          e.color || "#8b93a1",
        );
        (obj.cone.material as THREE.MeshStandardMaterial).color.set(
          e.color || "#8b93a1",
        );
      }
    });
  }, [edges]);

  /* ---------------- pending-source highlight ---------------- */
  useEffect(() => {
    meshMap.current.forEach((mesh, id) => {
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(
        id === pendingSource ? 0xfbbf24 : 0x000000,
      );
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
    });
  }, [pendingSource, nodes]);

  /* ---------------- selection highlight (multi-select aware) ---------------- */
  useEffect(() => {
    const idSet = new Set(selectedIds);
    meshMap.current.forEach((mesh, id) => {
      if (id === pendingSource) return;
      const isSel = idSet.has(id);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(
        isSel ? 0x22d3ee : 0x000000,
      );
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isSel
        ? 0.45
        : 0.6;
    });
    edgeMeshMap.current.forEach((obj, id) => {
      const isSel =
        selected !== null && selected.kind === "edge" && selected.id === id;
      (obj.line.material as THREE.MeshStandardMaterial).emissive.set(
        isSel ? 0x22d3ee : 0x000000,
      );
      (obj.cone.material as THREE.MeshStandardMaterial).emissive.set(
        isSel ? 0x22d3ee : 0x000000,
      );
    });
  }, [selectedIds, selected, nodes, edges, pendingSource]);

  /* ---------------- data mutators ---------------- */
  const addNode = (type: NodeTypeKey) => {
    setNodes((prev) => {
      const idx = prev.length;
      const angle = idx * 2.4;
      const radius = 4 + (idx % 3) * 1.3;
      const typeCount = prev.filter((n) => n.type === type).length;
      return [
        ...prev,
        {
          id: uid(),
          type,
          label: `${NODE_TYPES[type].label} ${typeCount + 1}`,
          color: null,
          spawnPosition: [
            Math.cos(angle) * radius,
            1,
            Math.sin(angle) * radius,
          ],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          note: "",
          signature: "",
          targetSceneId: null,
        },
      ];
    });
  };

  const updateNode = (id: string, changes: Partial<SceneNode>) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const mesh = meshMap.current.get(id);
        const spawnPosition: Vec3Tuple = mesh
          ? [mesh.position.x, mesh.position.y, mesh.position.z]
          : n.spawnPosition;
        const rotation: Vec3Tuple = mesh
          ? [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z]
          : n.rotation;
        const scale: Vec3Tuple = mesh
          ? [mesh.scale.x, mesh.scale.y, mesh.scale.z]
          : n.scale;
        return { ...n, ...changes, spawnPosition, rotation, scale };
      }),
    );
  };

  const deleteNode = (id: string) => deleteNodes([id]);

  const deleteNodes = (ids: string[]) => {
    const idSet = new Set(ids);
    setNodes((prev) => prev.filter((n) => !idSet.has(n.id)));
    setEdges((prev) =>
      prev.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)),
    );
    setSelected(null);
    selectedRef.current = null;
    setSelectedIds([]);
    selectedIdsRef.current = [];
  };

  const updateEdge = (id: string, changes: Partial<SceneEdge>) => {
    setEdges((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    );
  };

  const deleteEdge = (id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    setSelected(null);
    selectedRef.current = null;
  };

  // stable refs so the three.js keydown handler (created once) can call the latest versions
  const deleteNodesRef = useRef(deleteNodes);
  const deleteEdgeRef = useRef(deleteEdge);
  useEffect(() => {
    deleteNodesRef.current = deleteNodes;
  });
  useEffect(() => {
    deleteEdgeRef.current = deleteEdge;
  });

  const applyColorToSelection = (ids: string[], color: string) => {
    setNodes((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, color } : n)),
    );
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setSelected(null);
    setSelectedIds([]);
  };

  const resetView = () => {
    sphericalRef.current = { radius: 15, theta: 0.9, phi: 1.0 };
    targetRef.current.set(0, 1, 0);
  };

  const resetTransform = (id: string) => {
    const mesh = meshMap.current.get(id);
    if (mesh) {
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
    }
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, rotation: [0, 0, 0], scale: [1, 1, 1] } : n,
      ),
    );
  };

  /* ---------------- scenes (tabs) ---------------- */
  const resetInteractionState = () => {
    setSelected(null);
    selectedRef.current = null;
    setSelectedIds([]);
    selectedIdsRef.current = [];
    setPendingSource(null);
    pendingSourceRef.current = null;
    setConnectMode(false);
    xformRef.current = emptyXform();
    setXformInfo(null);
    draggingRef.current = emptyDrag();
    marqueeStateRef.current = { active: false, startX: 0, startY: 0 };
    if (marqueeElRef.current) marqueeElRef.current.style.display = "none";
  };

  const switchScene = (id: string) => {
    if (id === activeSceneId) return;
    sceneStoreRef.current.set(activeSceneId, { nodes, edges });
    const target = sceneStoreRef.current.get(id) || { nodes: [], edges: [] };
    resetInteractionState();
    setNodes(target.nodes);
    setEdges(target.edges);
    setActiveSceneId(id);
  };

  const addScene = (name?: string, data?: SceneStoreEntry): string => {
    sceneStoreRef.current.set(activeSceneId, { nodes, edges });
    const newId = uid();
    const sceneName = name || `Scene ${sceneMeta.length + 1}`;
    const sceneData = data || { nodes: [], edges: [] };
    sceneStoreRef.current.set(newId, sceneData);
    setSceneMeta((prev) => [...prev, { id: newId, name: sceneName }]);
    resetInteractionState();
    setNodes(sceneData.nodes);
    setEdges(sceneData.edges);
    setActiveSceneId(newId);
    return newId;
  };

  const deleteScene = (id: string) => {
    if (sceneMeta.length <= 1) return;
    sceneStoreRef.current.delete(id);
    const next = sceneMeta.filter((s) => s.id !== id);
    setSceneMeta(next);
    if (activeSceneId === id) {
      const fallback = next[0];
      const data = sceneStoreRef.current.get(fallback.id) || {
        nodes: [],
        edges: [],
      };
      resetInteractionState();
      setNodes(data.nodes);
      setEdges(data.edges);
      setActiveSceneId(fallback.id);
    }
  };

  const startRenameScene = (id: string, currentName: string) => {
    setRenamingSceneId(id);
    setRenameValue(currentName);
  };

  const commitRenameScene = () => {
    setSceneMeta((prev) =>
      prev.map((s) =>
        s.id === renamingSceneId
          ? { ...s, name: renameValue.trim() || s.name }
          : s,
      ),
    );
    setRenamingSceneId(null);
  };

  /* ---------------- import / export (multi-scene aware) ---------------- */
  const exportProject = () => {
    const liveNodes: SceneNode[] = nodes.map((n) => {
      const mesh = meshMap.current.get(n.id);
      const spawnPosition: Vec3Tuple = mesh
        ? [mesh.position.x, mesh.position.y, mesh.position.z]
        : n.spawnPosition;
      const rotation: Vec3Tuple = mesh
        ? [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z]
        : n.rotation;
      const scale: Vec3Tuple = mesh
        ? [mesh.scale.x, mesh.scale.y, mesh.scale.z]
        : n.scale;
      return { ...n, spawnPosition, rotation, scale };
    });
    sceneStoreRef.current.set(activeSceneId, { nodes: liveNodes, edges });

    const scenes: ExportedScene[] = sceneMeta.map((meta) => {
      const data =
        meta.id === activeSceneId
          ? { nodes: liveNodes, edges }
          : sceneStoreRef.current.get(meta.id) || { nodes: [], edges: [] };
      return {
        id: meta.id,
        name: meta.name,
        nodes: data.nodes,
        edges: data.edges,
      };
    });

    const payload: ExportedProject = {
      format: "systemspace-project",
      version: 3,
      exportedAt: new Date().toISOString(),
      activeScene: activeSceneId,
      scenes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `systemspace-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const beginImport = (mode: "replace" | "merge") => {
    importModeRef.current = mode;
    setImportMenuOpen(false);
    setImportError(null);
    fileInputRef.current?.click();
  };

  function cleanNodeList(
    rawNodes: unknown[] | undefined,
    idPrefix: [number, number] | null,
  ): {
    cleanNodes: SceneNode[];
    idMap: Map<string, string>;
    validIds: Set<string>;
  } {
    const validIds = new Set<string>();
    const idMap = new Map<string, string>();
    const cleanNodes: SceneNode[] = (rawNodes || []).map((raw, idx) => {
      const n = raw as Partial<SceneNode> & { id?: string };
      const oldId = typeof n.id === "string" ? n.id : uid();
      const newId = idPrefix ? uid() : oldId; // fresh ids when merging to avoid collisions
      idMap.set(oldId, newId);
      validIds.add(newId);
      return {
        id: newId,
        type:
          n.type && NODE_TYPES[n.type as NodeTypeKey]
            ? (n.type as NodeTypeKey)
            : "module",
        label: typeof n.label === "string" ? n.label : `Node ${idx + 1}`,
        color: typeof n.color === "string" ? n.color : null,
        spawnPosition:
          Array.isArray(n.spawnPosition) && n.spawnPosition.length === 3
            ? [
                n.spawnPosition[0] + (idPrefix ? idPrefix[0] : 0),
                n.spawnPosition[1],
                n.spawnPosition[2] + (idPrefix ? idPrefix[1] : 0),
              ]
            : [
                Math.cos(idx * 2.4) * 4.5 + (idPrefix ? idPrefix[0] : 0),
                1,
                Math.sin(idx * 2.4) * 4.5 + (idPrefix ? idPrefix[1] : 0),
              ],
        rotation:
          Array.isArray(n.rotation) && n.rotation.length === 3
            ? (n.rotation as Vec3Tuple)
            : [0, 0, 0],
        scale:
          Array.isArray(n.scale) && n.scale.length === 3
            ? (n.scale as Vec3Tuple)
            : [1, 1, 1],
        note: typeof n.note === "string" ? n.note : "",
        signature: typeof n.signature === "string" ? n.signature : "",
        targetSceneId: null,
      };
    });
    return { cleanNodes, idMap, validIds };
  }

  function cleanEdgeList(
    rawEdges: unknown[] | undefined,
    idMap: Map<string, string>,
    validIds: Set<string>,
  ): SceneEdge[] {
    return (rawEdges || [])
      .map((raw) => {
        const e = raw as Partial<SceneEdge>;
        return {
          id: uid(),
          source: idMap.get(e.source || "") || e.source || "",
          target: idMap.get(e.target || "") || e.target || "",
          label: typeof e.label === "string" ? e.label : "uses",
          color: typeof e.color === "string" ? e.color : undefined,
        };
      })
      .filter((e) => validIds.has(e.source) && validIds.has(e.target));
  }

  const mergeScenesIntoCurrent = (
    sourceScenes: { nodes: unknown[]; edges: unknown[] }[],
  ) => {
    let allNewNodes: SceneNode[] = [];
    let allNewEdges: SceneEdge[] = [];
    sourceScenes.forEach((s, i) => {
      const offset: [number, number] = [
        6 + (i % 3) * 7,
        6 + Math.floor(i / 3) * 7,
      ];
      const { cleanNodes, idMap, validIds } = cleanNodeList(s.nodes, offset);
      const cleanEdges = cleanEdgeList(s.edges, idMap, validIds);
      allNewNodes = allNewNodes.concat(cleanNodes);
      allNewEdges = allNewEdges.concat(cleanEdges);
    });
    setNodes((prev) => [...prev, ...allNewNodes]);
    setEdges((prev) => [...prev, ...allNewEdges]);
    setSelectedIds(allNewNodes.map((n) => n.id));
    selectedIdsRef.current = allNewNodes.map((n) => n.id);
    setSelected(
      allNewNodes.length
        ? { kind: "node", id: allNewNodes[allNewNodes.length - 1].id }
        : null,
    );
  };

  const toggleImportPickerScene = (idx: number) => {
    setImportPicker((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.selected);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { ...prev, selected: next };
    });
  };

  const setImportPickerAll = (all: boolean) => {
    setImportPicker((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        selected: all ? new Set(prev.scenes.map((s) => s.idx)) : new Set(),
      };
    });
  };

  const confirmImportPicker = () => {
    if (!importPicker) return;
    const chosen = importPicker.scenes.filter((s) =>
      importPicker.selected.has(s.idx),
    );
    mergeScenesIntoCurrent(chosen);
    setImportPicker(null);
  };

  const cancelImportPicker = () => setImportPicker(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const mode = importModeRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(
          reader.result as string,
        ) as Partial<ExportedProject> & {
          nodes?: unknown[];
          edges?: unknown[];
        };
        const hasScenes = Array.isArray(data.scenes) && data.scenes.length > 0;
        const legacyNodes = Array.isArray(data.nodes) ? data.nodes : null;
        const legacyEdges = Array.isArray(data.edges) ? data.edges : null;
        if (!hasScenes && !(legacyNodes && legacyEdges))
          throw new Error("Missing nodes/edges");

        if (mode === "replace") {
          if (hasScenes) {
            const newSceneMeta: SceneMetaEntry[] = [];
            sceneStoreRef.current = new Map();
            data.scenes!.forEach((s) => {
              const { cleanNodes, idMap, validIds } = cleanNodeList(
                s.nodes,
                null,
              );
              const cleanEdges = cleanEdgeList(s.edges, idMap, validIds);
              const sceneId = uid();
              newSceneMeta.push({
                id: sceneId,
                name: typeof s.name === "string" ? s.name : "Scene",
              });
              sceneStoreRef.current.set(sceneId, {
                nodes: cleanNodes,
                edges: cleanEdges,
              });
            });
            resetInteractionState();
            setSceneMeta(newSceneMeta);
            const first = newSceneMeta[0];
            const firstData = sceneStoreRef.current.get(first.id)!;
            setNodes(firstData.nodes);
            setEdges(firstData.edges);
            setActiveSceneId(first.id);
          } else {
            const { cleanNodes, idMap, validIds } = cleanNodeList(
              legacyNodes ?? [],
              null,
            );
            const cleanEdges = cleanEdgeList(
              legacyEdges ?? [],
              idMap,
              validIds,
            );
            resetInteractionState();
            setSceneMeta([{ id: "scene-main", name: "Main" }]);
            sceneStoreRef.current = new Map();
            setNodes(cleanNodes);
            setEdges(cleanEdges);
            setActiveSceneId("scene-main");
          }
          setImportError(null);
        } else if (hasScenes && data.scenes!.length > 1) {
          // Multiple scenes in the file — the user must pick exactly which one(s) to
          // bring into the *current* scene as assets, rather than silently merging all.
          setImportPicker({
            scenes: data.scenes!.map((s, idx) => ({
              idx,
              name: typeof s.name === "string" ? s.name : `Scene ${idx + 1}`,
              nodes: (Array.isArray(s.nodes) ? s.nodes : []) as SceneNode[],
              edges: (Array.isArray(s.edges) ? s.edges : []) as SceneEdge[],
            })),
            selected: new Set(data.scenes!.map((_, idx) => idx)),
          });
          setImportError(null);
        } else {
          // single scene (or legacy format) — merge straight in, no picker needed
          const srcNodes = hasScenes ? data.scenes![0].nodes : legacyNodes!;
          const srcEdges = hasScenes ? data.scenes![0].edges : legacyEdges!;
          mergeScenesIntoCurrent([{ nodes: srcNodes, edges: srcEdges }]);
          setImportError(null);
        }
      } catch (err) {
        setImportError(
          "Couldn't read that file — make sure it's a SystemSpace project export.",
        );
      }
    };
    reader.onerror = () => setImportError("Couldn't read that file.");
    reader.readAsText(file);
  };

  /* ---------------- create scene from registry API ---------------- */
  const openRegistryImport = () => {
    setImportMenuOpen(false);
    setRegistryOpen(true);
    setRegistryError(null);
    if (registryAssets.length === 0) {
      void loadRegistryAssets();
    }
  };

  const loadRegistryAssets = async (
    typeFilter: RegistryAssetType | "all" = registryTypeFilter,
  ) => {
    setRegistryLoading(true);
    setRegistryError(null);
    try {
      const query = buildQuery({
        asset_type: typeFilter === "all" ? undefined : typeFilter,
        per_page: 100,
      });
      const res = await registryFetch<PaginatedResponse<RegistryAsset>>(
        `/assets${query}`,
      );
      setRegistryAssets(res.data);
    } catch (err) {
      setRegistryError(
        err instanceof Error
          ? err.message
          : "Couldn't load assets from the registry.",
      );
    } finally {
      setRegistryLoading(false);
    }
  };

  const changeRegistryTypeFilter = (type: RegistryAssetType | "all") => {
    setRegistryTypeFilter(type);
    void loadRegistryAssets(type);
  };

  const toggleRegistryAsset = (id: string) => {
    setRegistrySelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setRegistrySelectedAll = (all: boolean) => {
    setRegistrySelected(
      all ? new Set(registryAssets.map((a) => a.id)) : new Set(),
    );
  };

  // Lays out selected registry assets as a fresh scene: one node per asset (positioned on a
  // ring), one edge per relationship where BOTH endpoints are in the selection.
  const createSceneFromRegistry = () => {
    const chosen = registryAssets.filter((a) => registrySelected.has(a.id));
    if (!chosen.length) return;

    const idMap = new Map<string, string>(); // registry asset id -> scene node id
    const newNodes: SceneNode[] = chosen.map((asset, idx) => {
      const nodeId = uid();
      idMap.set(asset.id, nodeId);
      const angle = idx * ((2 * Math.PI) / Math.max(chosen.length, 1));
      const radius = 4 + (idx % 3) * 1.3;
      return {
        id: nodeId,
        type: ASSET_TYPE_TO_NODE_TYPE[asset.asset_type] || "module",
        label: asset.name || asset.code,
        color: null,
        spawnPosition: [Math.cos(angle) * radius, 1, Math.sin(angle) * radius],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        note: asset.description || "",
        signature: "",
        targetSceneId: null,
        registryAssetId: asset.id,
      };
    });

    const newEdges: SceneEdge[] = [];
    const seenPairs = new Set<string>();
    chosen.forEach((asset) => {
      (asset.source_relationships || []).forEach((rel) => {
        if (!rel.target_asset_id) return;
        const sourceNodeId = idMap.get(asset.id);
        const targetNodeId = idMap.get(rel.target_asset_id);
        if (!sourceNodeId || !targetNodeId) return; // only link assets that are both in the selection
        const pairKey = [sourceNodeId, targetNodeId].sort().join("::");
        if (seenPairs.has(pairKey)) return;
        seenPairs.add(pairKey);
        newEdges.push({
          id: uid(),
          source: sourceNodeId,
          target: targetNodeId,
          label: rel.relationship_type,
        });
      });
    });

    const sceneName = registrySceneName.trim() || "From Registry";
    addScene(sceneName, { nodes: newNodes, edges: newEdges });
    setSelectedIds(newNodes.map((n) => n.id));
    selectedIdsRef.current = newNodes.map((n) => n.id);
    setSelected(
      newNodes.length
        ? { kind: "node", id: newNodes[newNodes.length - 1].id }
        : null,
    );

    setRegistryOpen(false);
    setRegistrySelected(new Set());
    setRegistrySceneName("From Registry");
  };

  const selectedNode =
    selectedIds.length <= 1 && selected && selected.kind === "node"
      ? nodes.find((n) => n.id === selected.id)
      : null;
  const selectedEdge =
    selected && selected.kind === "edge"
      ? edges.find((e) => e.id === selected.id)
      : null;
  const isMulti = selectedIds.length > 1;

  const startXformFromPanel = (mode: XformMode, nodeId: string) => {
    setSelected({ kind: "node", id: nodeId });
    setSelectedIds([nodeId]);
    requestAnimationFrame(() => {
      const evt = new KeyboardEvent("keydown", {
        key: mode === "move" ? "g" : mode === "rotate" ? "r" : "s",
      });
      window.dispatchEvent(evt);
    });
  };

  const startXformFromPanelGroup = (mode: XformMode) => {
    requestAnimationFrame(() => {
      const evt = new KeyboardEvent("keydown", {
        key: mode === "move" ? "g" : mode === "rotate" ? "r" : "s",
      });
      window.dispatchEvent(evt);
    });
  };

  const REGISTRY_TYPE_OPTIONS: (RegistryAssetType | "all")[] = [
    "all",
    "platform",
    "domain",
    "service",
    "package",
    "contract",
    "driver",
    "capability",
  ];

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen min-h-[560px] bg-[#0b0f14] text-[#e6edf3] flex flex-col font-sans overflow-hidden"
    >
      <style>{`
        .ss-scroll::-webkit-scrollbar { width: 6px; }
        .ss-scroll::-webkit-scrollbar-thumb { background: #2a3542; border-radius: 3px; }
      `}</style>

      {/* top bar */}
      <div className="h-[52px] shrink-0 flex items-center justify-between px-4 border-b border-[#1a222c] bg-[#0d1319]">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[#22d3ee] text-base">◈</span>
          <span className="font-mono text-[13px] tracking-[0.14em] font-semibold">
            SYSTEMSPACE
          </span>
          <span className="font-mono text-[11px] text-[#5b6675]">
            spatial architecture modeler
          </span>
        </div>
        <div className="flex gap-2">
          <button
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border cursor-pointer ${
              connectMode
                ? "bg-[#2a1f0d] border-[#fbbf24] text-[#fbbf24]"
                : "bg-[#11161d] border-[#232c37] text-[#c8d1db]"
            }`}
            onClick={() => {
              setConnectMode((v) => !v);
              setPendingSource(null);
              pendingSourceRef.current = null;
            }}
            title="Connect mode"
          >
            <Link2 size={15} />
            <span>{connectMode ? "Connecting…" : "Connect"}</span>
          </button>
          <button
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border bg-[#11161d] border-[#232c37] text-[#c8d1db] cursor-pointer"
            onClick={resetView}
            title="Reset camera"
          >
            <RotateCcw size={15} />
          </button>
          <div className="w-px h-5 bg-[#232c37] mx-0.5 self-center" />
          <button
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border bg-[#11161d] border-[#232c37] text-[#c8d1db] cursor-pointer"
            onClick={openRegistryImport}
            title="Create a scene from registry assets"
          >
            <DatabaseZap size={15} />
            <span>From Registry</span>
          </button>
          <div className="relative">
            <button
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border bg-[#11161d] border-[#232c37] text-[#c8d1db] cursor-pointer"
              onClick={() => setImportMenuOpen((v) => !v)}
              title="Import"
            >
              <Upload size={15} />
              <span>Import</span>
              <ChevronDown size={12} />
            </button>
            {importMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] w-[190px] bg-[#11161d] border border-[#232c37] rounded-md shadow-lg z-20 overflow-hidden">
                <button
                  className="w-full text-left px-3 py-2 text-xs text-[#c8d1db] hover:bg-[#181f28] cursor-pointer"
                  onClick={() => beginImport("replace")}
                >
                  Import as New Project
                  <div className="text-[10px] text-[#5b6675]">
                    Replaces every scene
                  </div>
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-xs text-[#c8d1db] hover:bg-[#181f28] cursor-pointer border-t border-[#1e2733]"
                  onClick={() => beginImport("merge")}
                >
                  Import as Asset
                  <div className="text-[10px] text-[#5b6675]">
                    Merges into the current scene
                  </div>
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border bg-[#11161d] border-[#232c37] text-[#c8d1db] cursor-pointer"
            onClick={exportProject}
            title="Export project (all scenes)"
          >
            <Download size={15} />
            <span>Export</span>
          </button>
          <div className="w-px h-5 bg-[#232c37] mx-0.5 self-center" />
          <button
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border bg-[#11161d] border-[#232c37] text-[#c8d1db] cursor-pointer"
            onClick={clearAll}
            title="Clear current scene"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* scene tabs */}
      <div className="h-[36px] shrink-0 flex items-center gap-1 px-3 border-b border-[#1a222c] bg-[#0a0e13] overflow-x-auto ss-scroll">
        <Layers3 size={13} className="text-[#5b6675] shrink-0 mr-1" />
        {sceneMeta.map((s) => {
          const active = s.id === activeSceneId;
          return (
            <div
              key={s.id}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono cursor-pointer shrink-0 ${
                active
                  ? "bg-[#132028] text-[#22d3ee] border border-[#22d3ee]/40"
                  : "text-[#8b93a1] border border-transparent hover:bg-[#11161d]"
              }`}
              onClick={() => switchScene(s.id)}
              onDoubleClick={() => startRenameScene(s.id, s.name)}
            >
              {renamingSceneId === s.id ? (
                <input
                  autoFocus
                  className="bg-[#0d1319] border border-[#232c37] rounded px-1 py-0.5 text-[11px] w-[90px] text-[#e6edf3]"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRenameScene}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRenameScene();
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span>{s.name}</span>
                  <Pencil
                    size={10}
                    className="text-[#5b6675] hover:text-[#c8d1db]"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRenameScene(s.id, s.name);
                    }}
                  />
                  {sceneMeta.length > 1 && (
                    <X
                      size={11}
                      className="text-[#5b6675] hover:text-[#f87171]"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteScene(s.id);
                      }}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
        <button
          className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono text-[#5b6675] hover:text-[#c8d1db] hover:bg-[#11161d] cursor-pointer shrink-0"
          onClick={() => addScene()}
          title="Add scene"
        >
          <Plus size={12} /> Scene
        </button>
      </div>

      {importError && (
        <div className="absolute top-[92px] right-4 z-10 flex items-center gap-2 bg-[#1f1315] border border-[#4c2226] text-[#f87171] rounded-md px-3 py-2 text-xs">
          {importError}
          <button
            className="text-[#f87171] cursor-pointer"
            onClick={() => setImportError(null)}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* multi-scene import picker: choose which imported scene(s) to bring in as assets */}
      {importPicker && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="w-[380px] max-h-[70vh] bg-[#0d1319] border border-[#232c37] rounded-lg flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a222c]">
              <span className="font-mono text-[12px] tracking-[0.06em] text-[#e6edf3] uppercase">
                Select scenes to import
              </span>
              <button
                className="text-[#5b6675] cursor-pointer"
                onClick={cancelImportPicker}
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-4 py-2 flex gap-3 border-b border-[#1a222c] text-[11px] font-mono">
              <button
                className="text-[#22d3ee] cursor-pointer"
                onClick={() => setImportPickerAll(true)}
              >
                Select all
              </button>
              <button
                className="text-[#5b6675] cursor-pointer"
                onClick={() => setImportPickerAll(false)}
              >
                Select none
              </button>
            </div>
            <div className="ss-scroll flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
              {importPicker.scenes.map((s) => {
                const checked = importPicker.selected.has(s.idx);
                return (
                  <button
                    key={s.idx}
                    className="flex items-center gap-2.5 text-left px-2.5 py-2 rounded-md hover:bg-[#11161d] cursor-pointer"
                    onClick={() => toggleImportPickerScene(s.idx)}
                  >
                    {checked ? (
                      <CheckSquare
                        size={15}
                        className="text-[#22d3ee] shrink-0"
                      />
                    ) : (
                      <Square size={15} className="text-[#5b6675] shrink-0" />
                    )}
                    <span className="font-mono text-[12px] text-[#e6edf3]">
                      {s.name}
                    </span>
                    <span className="font-mono text-[10px] text-[#5b6675] ml-auto">
                      {s.nodes.length} nodes · {s.edges.length} links
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-[#1a222c] flex gap-2 justify-end">
              <button
                className="rounded-md px-3 py-1.5 text-xs border bg-[#11161d] border-[#232c37] text-[#c8d1db] cursor-pointer"
                onClick={cancelImportPicker}
              >
                Cancel
              </button>
              <button
                disabled={importPicker.selected.size === 0}
                className="rounded-md px-3 py-1.5 text-xs border bg-[#132028] border-[#22d3ee]/50 text-[#22d3ee] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={confirmImportPicker}
              >
                Import {importPicker.selected.size || ""} scene
                {importPicker.selected.size === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* create scene from registry API */}
      {registryOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="w-[440px] max-h-[76vh] bg-[#0d1319] border border-[#232c37] rounded-lg flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a222c]">
              <span className="font-mono text-[12px] tracking-[0.06em] text-[#e6edf3] uppercase flex items-center gap-2">
                <DatabaseZap size={14} className="text-[#22d3ee]" /> Create
                scene from registry
              </span>
              <button
                className="text-[#5b6675] cursor-pointer"
                onClick={() => setRegistryOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-4 pt-3 flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-[#5b6675] uppercase tracking-[0.06em]">
                Scene name
              </label>
              <input
                className="bg-[#11161d] border border-[#232c37] rounded-md px-2.5 py-2 text-[#e6edf3] font-sans text-sm focus:outline-none focus:border-[#22d3ee]"
                value={registrySceneName}
                onChange={(e) => setRegistrySceneName(e.target.value)}
              />
            </div>

            <div className="px-4 pt-3 flex gap-1.5 flex-wrap">
              {REGISTRY_TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  className={`rounded-full px-2.5 py-1 text-[10.5px] font-mono border cursor-pointer ${
                    registryTypeFilter === t
                      ? "bg-[#132028] border-[#22d3ee]/50 text-[#22d3ee]"
                      : "bg-[#11161d] border-[#232c37] text-[#8b93a1]"
                  }`}
                  onClick={() => changeRegistryTypeFilter(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="px-4 py-2 flex items-center justify-between text-[11px] font-mono">
              <div className="flex gap-3">
                <button
                  className="text-[#22d3ee] cursor-pointer"
                  onClick={() => setRegistrySelectedAll(true)}
                >
                  Select all
                </button>
                <button
                  className="text-[#5b6675] cursor-pointer"
                  onClick={() => setRegistrySelectedAll(false)}
                >
                  Select none
                </button>
              </div>
              <span className="text-[#5b6675]">
                {registrySelected.size} selected
              </span>
            </div>

            <div className="ss-scroll flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-1 min-h-[160px]">
              {registryLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-[#5b6675] text-xs font-mono">
                  <Loader2 size={14} className="animate-spin" /> Loading assets…
                </div>
              )}
              {!registryLoading && registryError && (
                <div className="mx-2 my-2 flex flex-col gap-2 bg-[#1f1315] border border-[#4c2226] text-[#f87171] rounded-md px-3 py-2 text-xs">
                  {registryError}
                  <button
                    className="self-start underline decoration-dotted cursor-pointer"
                    onClick={() => void loadRegistryAssets()}
                  >
                    Retry
                  </button>
                </div>
              )}
              {!registryLoading &&
                !registryError &&
                registryAssets.length === 0 && (
                  <div className="py-8 text-center text-[#5b6675] text-xs font-mono">
                    No assets found.
                  </div>
                )}
              {!registryLoading &&
                !registryError &&
                registryAssets.map((asset) => {
                  const checked = registrySelected.has(asset.id);
                  const nodeType =
                    ASSET_TYPE_TO_NODE_TYPE[asset.asset_type] || "module";
                  const cfg = NODE_TYPES[nodeType];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={asset.id}
                      className="flex items-center gap-2.5 text-left px-2.5 py-2 rounded-md hover:bg-[#11161d] cursor-pointer"
                      onClick={() => toggleRegistryAsset(asset.id)}
                    >
                      {checked ? (
                        <CheckSquare
                          size={15}
                          className="text-[#22d3ee] shrink-0"
                        />
                      ) : (
                        <Square size={15} className="text-[#5b6675] shrink-0" />
                      )}
                      <span
                        className="w-[20px] h-[20px] rounded flex items-center justify-center shrink-0"
                        style={{ background: cfg.color }}
                      >
                        <Icon size={12} color="#0b0f14" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[12px] text-[#e6edf3] truncate">
                          {asset.name || asset.code}
                        </div>
                        <div className="font-mono text-[10px] text-[#5b6675] truncate">
                          {asset.asset_type} · {asset.code}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-mono ${
                          asset.status === "active"
                            ? "bg-white text-black"
                            : "border border-[#232c37] text-[#5b6675]"
                        }`}
                      >
                        {asset.status}
                      </span>
                    </button>
                  );
                })}
            </div>

            <div className="px-4 py-3 border-t border-[#1a222c] flex gap-2 justify-end">
              <button
                className="rounded-md px-3 py-1.5 text-xs border bg-[#11161d] border-[#232c37] text-[#c8d1db] cursor-pointer"
                onClick={() => setRegistryOpen(false)}
              >
                Cancel
              </button>
              <button
                disabled={registrySelected.size === 0}
                className="rounded-md px-3 py-1.5 text-xs border bg-[#132028] border-[#22d3ee]/50 text-[#22d3ee] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={createSceneFromRegistry}
              >
                Create scene ({registrySelected.size})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* left toolbar */}
        <div className="ss-scroll w-32 shrink-0 border-r border-[#1a222c] bg-[#0d1319] p-3.5 flex flex-col gap-1.5 overflow-y-auto">
          {CATEGORY_ORDER.map((cat) => (
            <React.Fragment key={cat.key}>
              <div className="font-mono text-[10px] tracking-[0.1em] text-[#5b6675] uppercase mb-1 pl-0.5 mt-1 first:mt-0">
                {cat.label}
              </div>
              {(Object.entries(NODE_TYPES) as [NodeTypeKey, NodeTypeConfig][])
                .filter(([, cfg]) => cfg.category === cat.key)
                .map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      className="flex items-center gap-2 bg-[#11161d] border border-[#1e2733] rounded-lg px-2 py-1.5 cursor-pointer text-[#c8d1db]"
                      onClick={() => addNode(key)}
                      title={`Add ${cfg.label}`}
                    >
                      <span
                        className="w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0"
                        style={{ background: cfg.color }}
                      >
                        <Icon size={15} color="#0b0f14" />
                      </span>
                      <span className="font-mono text-[11.5px]">
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
            </React.Fragment>
          ))}
        </div>

        {/* canvas */}
        <div className="flex-1 relative min-w-0">
          <div ref={canvasWrapRef} className="absolute inset-0" />

          {/* marquee box-select overlay */}
          <div
            ref={marqueeElRef}
            className="absolute border border-[#22d3ee] bg-[#22d3ee22] pointer-events-none z-10"
            style={{ display: "none" }}
          />

          {/* node label overlays */}
          {nodes.map((n) => {
            const cfg = NODE_TYPES[n.type] || NODE_TYPES.module;
            const isSel = selectedIds.includes(n.id);
            const isPending = pendingSource === n.id;
            return (
              <div
                key={n.id}
                ref={(el) => {
                  labelRefs.current[n.id] = el;
                }}
                className="absolute left-0 top-0 pointer-events-none flex flex-col items-start gap-0.5 bg-[rgba(13,19,25,0.85)] border rounded-md px-2 py-1 font-mono text-[11.5px] whitespace-nowrap text-[#e6edf3]"
                style={{
                  borderColor: isPending
                    ? "#fbbf24"
                    : isSel
                      ? "#22d3ee"
                      : "rgba(255,255,255,0.08)",
                  boxShadow: isSel ? "0 0 0 1px #22d3ee55" : "none",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: n.color || cfg.color }}
                  />
                  {n.label}
                  {n.note && (
                    <StickyNote size={11} className="text-[#fbbf24] shrink-0" />
                  )}
                </div>
                {n.type === "method" && n.signature && (
                  <div className="text-[9px] text-[#8b93a1] pl-3">
                    {n.signature}
                  </div>
                )}
              </div>
            );
          })}

          {/* edge label overlays */}
          {edges.map((e) => (
            <div
              key={e.id}
              ref={(el) => {
                edgeLabelRefs.current[e.id] = el;
              }}
              className="absolute left-0 top-0 pointer-events-none bg-[rgba(11,15,20,0.9)] border border-[rgba(255,255,255,0.06)] rounded px-1.5 py-0.5 font-mono text-[10px] text-[#8b93a1] whitespace-nowrap"
            >
              {e.label}
            </div>
          ))}

          {/* live transform HUD for a single selected node */}
          {selectedIds.length === 1 && (
            <div className="absolute top-3 left-3 bg-[rgba(13,19,25,0.9)] border border-[#1e2733] rounded-lg px-3 py-2.5 font-mono text-[10.5px] text-[#c8d1db] pointer-events-none min-w-[186px]">
              <div className="text-[#5b6675] uppercase tracking-[0.08em] text-[9px] mb-1.5">
                {nodes.find((n) => n.id === selectedIds[0])?.label || ""}
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <Move size={11} className="text-[#5b6675] shrink-0" />
                <span className="text-[#5b6675] w-9">pos</span>
                <span ref={hudPosRef} className="text-[#e6edf3]">
                  0.00, 1.00, 0.00
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <RotateCw size={11} className="text-[#5b6675] shrink-0" />
                <span className="text-[#5b6675] w-9">rot</span>
                <span ref={hudRotRef} className="text-[#e6edf3]">
                  0.00°, 0.00°, 0.00°
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Maximize2 size={11} className="text-[#5b6675] shrink-0" />
                <span className="text-[#5b6675] w-9">scale</span>
                <span ref={hudScaleRef} className="text-[#e6edf3]">
                  1.00x, 1.00x, 1.00x
                </span>
              </div>
            </div>
          )}
          {selectedIds.length > 1 && (
            <div className="absolute top-3 left-3 bg-[rgba(13,19,25,0.9)] border border-[#22d3ee]/40 rounded-lg px-3 py-2.5 font-mono text-[10.5px] text-[#22d3ee] pointer-events-none min-w-[186px]">
              {selectedIds.length} objects selected
            </div>
          )}

          {/* live modal-transform badge (shown only while G/R/S is active) */}
          <div
            ref={xformBadgeRef}
            className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#132028] border border-[#22d3ee] text-[#22d3ee] rounded-md px-3 py-1.5 font-mono text-[11px] pointer-events-none whitespace-nowrap"
            style={{ display: "none" }}
          />

          <div className="absolute left-3.5 bottom-3 font-mono text-[10.5px] text-[#4b5563] pointer-events-none max-w-[70%]">
            <Move3d size={11} className="align-[-2px] mr-1.5 inline" />
            orbit: drag empty space · zoom: scroll · pan: right-drag ·
            shift+click to multi-select · shift+drag empty space to box-select ·
            drag a shape (or the group) to move, or drag a red/green/blue arrow
            · G move · R rotate · S scale, then X/Y/Z to lock an axis · click or
            Enter to confirm, right-click or Esc to cancel
            {connectMode ? "  ·  click two shapes to link them" : ""}
          </div>
        </div>

        {/* right panel */}
        {(selectedNode || selectedEdge || isMulti) && (
          <div className="ss-scroll w-[260px] shrink-0 border-l border-[#1a222c] bg-[#0d1319] overflow-y-auto">
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#1a222c]">
              <span className="font-mono text-[11px] tracking-[0.08em] text-[#8b93a1] uppercase">
                {isMulti
                  ? `${selectedIds.length} Nodes`
                  : selectedNode
                    ? "Node"
                    : "Connection"}
              </span>
              <button
                className="bg-transparent border-none text-[#5b6675] cursor-pointer p-1"
                onClick={() => {
                  setSelected(null);
                  setSelectedIds([]);
                }}
              >
                <X size={14} />
              </button>
            </div>

            {isMulti && (
              <div className="p-3.5 flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#5b6675] mt-1 uppercase tracking-[0.06em]">
                  Apply color to all
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => applyColorToSelection(selectedIds, c)}
                      className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.15)] cursor-pointer"
                      style={{ background: c }}
                    />
                  ))}
                </div>

                <label className="font-mono text-[10px] text-[#5b6675] mt-2 uppercase tracking-[0.06em]">
                  Transform group
                </label>
                <div className="flex gap-1.5">
                  <button
                    className="flex-1 flex items-center gap-1 justify-center bg-[#11161d] border border-[#232c37] text-[#c8d1db] rounded-md px-2 py-1.5 text-[11px] cursor-pointer"
                    onClick={() => startXformFromPanelGroup("move")}
                  >
                    <Move size={12} /> Move
                  </button>
                  <button
                    className="flex-1 flex items-center gap-1 justify-center bg-[#11161d] border border-[#232c37] text-[#c8d1db] rounded-md px-2 py-1.5 text-[11px] cursor-pointer"
                    onClick={() => startXformFromPanelGroup("rotate")}
                  >
                    <RotateCw size={12} /> Rotate
                  </button>
                  <button
                    className="flex-1 flex items-center gap-1 justify-center bg-[#11161d] border border-[#232c37] text-[#c8d1db] rounded-md px-2 py-1.5 text-[11px] cursor-pointer"
                    onClick={() => startXformFromPanelGroup("scale")}
                  >
                    <Maximize2 size={12} /> Scale
                  </button>
                </div>

                <button
                  className="mt-4 flex items-center gap-1.5 justify-center bg-[#1f1315] border border-[#4c2226] text-[#f87171] rounded-md px-2.5 py-2 text-xs cursor-pointer"
                  onClick={() => deleteNodes(selectedIds)}
                >
                  <Trash2 size={13} /> Delete {selectedIds.length} nodes
                </button>
              </div>
            )}

            {!isMulti && selectedNode && (
              <div className="p-3.5 flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#5b6675] mt-2 uppercase tracking-[0.06em]">
                  Label
                </label>
                <input
                  className="bg-[#11161d] border border-[#232c37] rounded-md px-2.5 py-2 text-[#e6edf3] font-sans text-sm focus:outline-none focus:border-[#22d3ee]"
                  value={selectedNode.label}
                  onChange={(e) =>
                    updateNode(selectedNode.id, { label: e.target.value })
                  }
                />

                <label className="font-mono text-[10px] text-[#5b6675] mt-2 uppercase tracking-[0.06em]">
                  Type
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {(
                    Object.entries(NODE_TYPES) as [
                      NodeTypeKey,
                      NodeTypeConfig,
                    ][]
                  ).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const active = selectedNode.type === key;
                    return (
                      <button
                        key={key}
                        onClick={() =>
                          updateNode(selectedNode.id, { type: key })
                        }
                        className={`w-8 h-8 rounded-md border flex items-center justify-center cursor-pointer ${
                          active
                            ? "border-[#22d3ee] bg-[#132028]"
                            : "border-[rgba(255,255,255,0.08)] bg-[#11161d]"
                        }`}
                        title={cfg.label}
                      >
                        <Icon size={14} color={cfg.color} />
                      </button>
                    );
                  })}
                </div>

                <label className="font-mono text-[10px] text-[#5b6675] mt-2 uppercase tracking-[0.06em]">
                  Color
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateNode(selectedNode.id, { color: c })}
                      className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.15)] cursor-pointer"
                      style={{
                        background: c,
                        outline:
                          (selectedNode.color ||
                            NODE_TYPES[selectedNode.type].color) === c
                            ? "2px solid #fff"
                            : "none",
                      }}
                    />
                  ))}
                </div>

                {selectedNode.registryAssetId && (
                  <div className="mt-1 font-mono text-[9.5px] text-[#5b6675]">
                    Linked to registry asset{" "}
                    <span className="text-[#8b93a1]">
                      {selectedNode.registryAssetId}
                    </span>
                  </div>
                )}

                {selectedNode.type === "method" && (
                  <>
                    <label className="font-mono text-[10px] text-[#5b6675] mt-2 uppercase tracking-[0.06em]">
                      Signature
                    </label>
                    <input
                      className="bg-[#11161d] border border-[#232c37] rounded-md px-2.5 py-2 text-[#e6edf3] font-mono text-[12px] focus:outline-none focus:border-[#22d3ee]"
                      placeholder="methodName(param: Type): ReturnType"
                      value={selectedNode.signature || ""}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          signature: e.target.value,
                        })
                      }
                    />
                  </>
                )}

                {selectedNode.type === "portal" && (
                  <>
                    <label className="font-mono text-[10px] text-[#5b6675] mt-2 uppercase tracking-[0.06em]">
                      Target scene
                    </label>
                    <select
                      className="bg-[#11161d] border border-[#232c37] rounded-md px-2.5 py-2 text-[#e6edf3] font-mono text-[12px] focus:outline-none focus:border-[#22d3ee]"
                      value={selectedNode.targetSceneId || ""}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          targetSceneId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">Choose scene…</option>
                      {sceneMeta
                        .filter((s) => s.id !== activeSceneId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                    <button
                      disabled={!selectedNode.targetSceneId}
                      className="mt-1 flex items-center gap-1.5 justify-center bg-[#1a1030] border border-[#d946ef]/50 text-[#e879f9] rounded-md px-2.5 py-2 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() =>
                        selectedNode.targetSceneId &&
                        switchScene(selectedNode.targetSceneId)
                      }
                    >
                      <ArrowRightLeft size={13} /> Jump to scene
                    </button>
                  </>
                )}

                <label className="font-mono text-[10px] text-[#5b6675] mt-2 uppercase tracking-[0.06em]">
                  Transform
                </label>
                <div className="flex gap-1.5">
                  <button
                    className="flex-1 flex items-center gap-1 justify-center bg-[#11161d] border border-[#232c37] text-[#c8d1db] rounded-md px-2 py-1.5 text-[11px] cursor-pointer"
                    onClick={() => startXformFromPanel("move", selectedNode.id)}
                  >
                    <Move size={12} /> Move
                  </button>
                  <button
                    className="flex-1 flex items-center gap-1 justify-center bg-[#11161d] border border-[#232c37] text-[#c8d1db] rounded-md px-2 py-1.5 text-[11px] cursor-pointer"
                    onClick={() =>
                      startXformFromPanel("rotate", selectedNode.id)
                    }
                  >
                    <RotateCw size={12} /> Rotate
                  </button>
                  <button
                    className="flex-1 flex items-center gap-1 justify-center bg-[#11161d] border border-[#232c37] text-[#c8d1db] rounded-md px-2 py-1.5 text-[11px] cursor-pointer"
                    onClick={() =>
                      startXformFromPanel("scale", selectedNode.id)
                    }
                  >
                    <Maximize2 size={12} /> Scale
                  </button>
                </div>
                <button
                  className="text-[10.5px] text-[#5b6675] underline decoration-dotted text-left mt-0.5 cursor-pointer"
                  onClick={() => resetTransform(selectedNode.id)}
                >
                  Reset rotation &amp; scale
                </button>

                <label className="font-mono text-[10px] text-[#5b6675] mt-2 uppercase tracking-[0.06em]">
                  Note
                </label>
                <textarea
                  className="bg-[#11161d] border border-[#232c37] rounded-md px-2.5 py-2 text-[#e6edf3] font-sans text-[12.5px] resize-none focus:outline-none focus:border-[#22d3ee]"
                  rows={3}
                  placeholder="Add a note about this piece…"
                  value={selectedNode.note || ""}
                  onChange={(e) =>
                    updateNode(selectedNode.id, { note: e.target.value })
                  }
                />

                <button
                  className="mt-4 flex items-center gap-1.5 justify-center bg-[#1f1315] border border-[#4c2226] text-[#f87171] rounded-md px-2.5 py-2 text-xs cursor-pointer"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 size={13} /> Delete node
                </button>
              </div>
            )}

            {!isMulti && selectedEdge && (
              <div className="p-3.5 flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#5b6675] mt-2 uppercase tracking-[0.06em]">
                  Relationship
                </label>
                <input
                  className="bg-[#11161d] border border-[#232c37] rounded-md px-2.5 py-2 text-[#e6edf3] font-sans text-sm focus:outline-none focus:border-[#22d3ee]"
                  value={selectedEdge.label}
                  onChange={(e) =>
                    updateEdge(selectedEdge.id, { label: e.target.value })
                  }
                />
                <div className="font-mono text-[11.5px] text-[#8b93a1] mt-1.5 flex items-center flex-wrap">
                  {nodes.find((n) => n.id === selectedEdge.source)?.label ||
                    "?"}
                  <span className="text-[#4b5563] mx-1.5">→</span>
                  {nodes.find((n) => n.id === selectedEdge.target)?.label ||
                    "?"}
                </div>
                <button
                  className="mt-1 flex items-center gap-1.5 justify-center bg-[#11161d] border border-[#232c37] text-[#c8d1db] rounded-md px-2.5 py-2 text-xs cursor-pointer"
                  onClick={() =>
                    updateEdge(selectedEdge.id, {
                      source: selectedEdge.target,
                      target: selectedEdge.source,
                    })
                  }
                >
                  <MousePointer2 size={13} /> Swap direction
                </button>
                <button
                  className="mt-4 flex items-center gap-1.5 justify-center bg-[#1f1315] border border-[#4c2226] text-[#f87171] rounded-md px-2.5 py-2 text-xs cursor-pointer"
                  onClick={() => deleteEdge(selectedEdge.id)}
                >
                  <Trash2 size={13} /> Delete connection
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function setXformInfo(_info: XformInfo | null) {
  // xform badge and state are driven from xformRef and HUD update loop.
  // This helper exists so older call sites can notify about mode/axis changes.
  // No-op: UI reads xformRef.current each frame in the render loop.
  return;
}
