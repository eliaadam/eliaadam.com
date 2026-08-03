import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  edgeKey,
  nodeBaseColor,
  nodeLabelText,
  updateLineGeometry,
} from "./sceneHelpers";
import type { SceneParams, SimEdge, SimNode } from "./registry/types";

export interface GraphSceneProps {
  nodes: SimNode[];
  edges: SimEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  searchTerm: string;
  paused: boolean;
  params: SceneParams;
}

export function GraphScene({
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
  const outGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const inGeomRef = useRef<THREE.BufferGeometry | null>(null);
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
        n.name.toLowerCase().includes(term) ||
        (n.code ?? "").toLowerCase().includes(term)
      ) {
        set.add(n.id);
      }
    });
    return set;
  }, [searchTerm, nodes]);

  const focusId = hoveredId ?? selectedId;

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const list = nodesRef.current;
    const nodeMap = new Map(list.map((n) => [n.id, n]));

    if (!paused) {
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

      edges.forEach((e) => {
        const a = nodeMap.get(e.source);
        const b = nodeMap.get(e.target);
        if (!a || !b) return;
        const diff = b.position.clone().sub(a.position);
        const dist = diff.length() || 0.01;
        const stretch = dist - params.edgeLength;
        diff.normalize().multiplyScalar(stretch * params.springStrength);
        a.velocity.addScaledVector(diff, dt);
        b.velocity.addScaledVector(diff, -dt);
      });

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

    updateLineGeometry(outGeomRef.current, nodeMap, edges, "out");
    updateLineGeometry(inGeomRef.current, nodeMap, edges, "in");
  });

  return (
    <>
      {params.fadeEnabled && (
        <fog attach="fog" args={["#050505", params.fadeNear, params.fadeFar]} />
      )}
      <ambientLight intensity={params.ambientIntensity} />
      <pointLight position={[8, 10, 10]} intensity={params.pointIntensity} />

      <lineSegments>
        <bufferGeometry ref={outGeomRef} />
        <lineBasicMaterial color="#b0b0b0" transparent opacity={0.6} />
      </lineSegments>
      <lineSegments>
        <bufferGeometry ref={inGeomRef} />
        <lineBasicMaterial color="#5c5c5c" transparent opacity={0.4} />
      </lineSegments>

      {edges.map((e, i) => {
        const showLabel =
          params.showEdgeLabels &&
          (!focusId || e.source === focusId || e.target === focusId);
        return (
          <group
            key={edgeKey(e, i)}
            ref={(g: THREE.Group | null) => {
              if (g) edgeGroupRefs.current.set(edgeKey(e, i), g);
              else edgeGroupRefs.current.delete(edgeKey(e, i));
            }}
          >
            {showLabel && (
              <Html
                center
                distanceFactor={14}
                style={{ pointerEvents: "none" }}
              >
                <span
                  className={`whitespace-nowrap rounded px-1 py-0.5 font-mono text-[9px] ${
                    e.direction === "out"
                      ? "bg-black/80 text-neutral-200"
                      : "bg-black/60 text-neutral-400"
                  }`}
                >
                  {e.relationshipType}
                </span>
              </Html>
            )}
          </group>
        );
      })}

      {nodes.map((n) => {
        const isHovered = hoveredId === n.id;
        const isSelected = selectedId === n.id;
        const inNeighborhood = neighborSet ? neighborSet.has(n.id) : true;
        const matched = matchedIds ? matchedIds.has(n.id) : true;
        const dimmed =
          (!inNeighborhood || !matched) && !isHovered && !isSelected;
        const brokenStatus =
          n.status === "deprecated" || n.status === "retired";
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
              onSelect(n.id);
            }}
          >
            {n.isGhost ? (
              <icosahedronGeometry args={[1, 0]} />
            ) : (
              <sphereGeometry args={[1, 16, 16]} />
            )}
            <meshStandardMaterial
              color={nodeBaseColor(n.assetType)}
              wireframe={brokenStatus}
              transparent
              opacity={dimmed ? 0.12 : n.isGhost ? 0.65 : 1}
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
                  {nodeLabelText(n, params.nodeLabelField)}
                </span>
              </Html>
            )}
          </mesh>
        );
      })}
    </>
  );
}
