import type { Asset, RelationshipData } from "./registry/types";

export function RelationshipGraph({
  assetName,
  relationships,
  allAssets,
}: {
  assetName: string;
  relationships: RelationshipData;
  allAssets: Asset[];
}) {
  const W = 440,
    H = 240,
    CX = W / 2,
    CY = H / 2,
    R = 88;

  const outgoing = relationships.outgoing ?? [];
  const incoming = relationships.incoming ?? [];
  const total = outgoing.length + incoming.length;

  if (total === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
        <span className="text-xs text-neutral-400 dark:text-neutral-600">
          No relationships registered
        </span>
      </div>
    );
  }

  type NodeDir = "out" | "in";
  interface GraphNode {
    id: string;
    label: string;
    x: number;
    y: number;
    dir: NodeDir;
    relType: string;
  }

  const nodes: GraphNode[] = [];

  outgoing.forEach((rel, i) => {
    const count = outgoing.length;
    const spread = Math.min(1.2, 0.6 * count);
    const angle =
      -Math.PI / 2 - spread / 2 + (count > 1 ? (i / (count - 1)) * spread : 0);
    const asset = allAssets.find((a) => a.id === rel.target_asset_id);
    nodes.push({
      id: rel.target_asset_id,
      label: asset?.name ?? rel.target_asset_id.slice(-6),
      x: CX + R * Math.cos(count === 1 ? -Math.PI / 2 : angle),
      y: CY + R * Math.sin(count === 1 ? -Math.PI / 2 : angle),
      dir: "out",
      relType: rel.relationship_type,
    });
  });

  incoming.forEach((rel, i) => {
    const count = incoming.length;
    const spread = Math.min(1.2, 0.6 * count);
    const angle =
      Math.PI / 2 - spread / 2 + (count > 1 ? (i / (count - 1)) * spread : 0);
    const asset = allAssets.find((a) => a.id === rel.source_asset_id);
    nodes.push({
      id: rel.source_asset_id ?? "",
      label: asset?.name ?? (rel.source_asset_id ?? "").slice(-6),
      x: CX + R * Math.cos(count === 1 ? Math.PI / 2 : angle),
      y: CY + R * Math.sin(count === 1 ? Math.PI / 2 : angle),
      dir: "in",
      relType: rel.relationship_type,
    });
  });

  const shortName = (s: string) => (s.length > 7 ? s.slice(0, 6) + "…" : s);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-label="Dependency graph"
    >
      <defs>
        <marker
          id="arr-out"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0,0 7,3.5 0,7" fill="#000" />
        </marker>
        <marker
          id="arr-in"
          markerWidth="7"
          markerHeight="7"
          refX="1"
          refY="3.5"
          orient="auto"
        >
          <polygon points="7,0 0,3.5 7,7" fill="#999" />
        </marker>
      </defs>

      {nodes.map((n, i) => {
        const dx = n.x - CX,
          dy = n.y - CY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len,
          uy = dy / len;
        const srcR = 22,
          dstR = 16;

        return (
          <g key={i}>
            <line
              x1={CX + ux * srcR}
              y1={CY + uy * srcR}
              x2={n.x - ux * (dstR + 7)}
              y2={n.y - uy * (dstR + 7)}
              stroke={n.dir === "out" ? "#000" : "#bbb"}
              strokeWidth={1}
              strokeDasharray={n.dir === "in" ? "4 3" : "none"}
              markerEnd={n.dir === "out" ? "url(#arr-out)" : "url(#arr-in)"}
            />
            <text
              x={(CX + n.x) / 2 - uy * 10}
              y={(CY + n.y) / 2 + ux * 10}
              textAnchor="middle"
              fontSize="7"
              fill="#999"
              fontFamily="monospace"
            >
              {n.relType}
            </text>
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r={22} fill="#000" />
      <text
        x={CX}
        y={CY + 4}
        textAnchor="middle"
        fontSize="8.5"
        fill="#fff"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {shortName(assetName)}
      </text>

      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.x}
            cy={n.y}
            r={16}
            fill={n.dir === "out" ? "#fff" : "#f5f5f5"}
            stroke="#000"
            strokeWidth={1}
          />
          <text
            x={n.x}
            y={n.y + 3.5}
            textAnchor="middle"
            fontSize="7.5"
            fill="#000"
            fontFamily="monospace"
          >
            {shortName(n.label)}
          </text>
        </g>
      ))}
    </svg>
  );
}
