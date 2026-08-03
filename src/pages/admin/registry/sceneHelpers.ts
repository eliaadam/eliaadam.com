import * as THREE from "three";
import type { AssetType } from "./registry/types";
import { ASSET_TYPE_TONE, GHOST_TONE, type NodeLabelField, type SimEdge, type SimNode } from "./types";

export function nodeBaseColor(assetType: AssetType | null): THREE.Color {
  const tone = assetType ? ASSET_TYPE_TONE[assetType] : GHOST_TONE;
  return new THREE.Color(tone, tone, tone);
}

export function nodeLabelText(node: SimNode, field: NodeLabelField): string {
  if (field === "code") return node.code ?? node.name;
  if (field === "asset_type") return node.assetType ?? "unresolved";
  return node.name;
}

export function randomPosition(): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const radius = 2 + Math.random() * 3;
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    (Math.random() - 0.5) * 3,
    Math.sin(angle) * radius,
  );
}

export function edgeKey(e: SimEdge, i: number): string {
  return `${e.source}__${e.target}__${e.direction}__${i}`;
}

export function updateLineGeometry(
  geom: THREE.BufferGeometry | null,
  nodeMap: Map<string, SimNode>,
  edges: SimEdge[],
  direction: "out" | "in",
) {
  if (!geom) return;
  const relevant = edges.filter((e) => e.direction === direction);
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
