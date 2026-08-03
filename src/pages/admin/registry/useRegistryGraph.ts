import { useMemo } from "react";
import * as THREE from "three";
import type { Asset, RelationshipData } from "./registry/types";
import { randomPosition } from "./sceneHelpers";
import type { SimEdge, SimNode } from "./types";

export function useRegistryGraph(
  pageAssets: Asset[],
  selectedId: string | null,
  relationships: RelationshipData | null,
  localGraph: boolean,
  resetSignal: number,
) {
  const posCache = useMemo<
    Map<string, { position: THREE.Vector3; velocity: THREE.Vector3 }>
  >(() => new Map(), [resetSignal]);

  return useMemo(() => {
    const cache = posCache;

    function slot(id: string) {
      let entry = cache.get(id);
      if (!entry) {
        entry = { position: randomPosition(), velocity: new THREE.Vector3() };
        cache.set(id, entry);
      }
      return entry;
    }

    const nodeMap = new Map<string, SimNode>();

    pageAssets.forEach((a) => {
      const s = slot(a.id);
      nodeMap.set(a.id, {
        id: a.id,
        name: a.name,
        code: a.code,
        assetType: a.asset_type,
        status: a.status,
        isGhost: false,
        position: s.position,
        velocity: s.velocity,
        degree: 0,
      });
    });

    const edges: SimEdge[] = [];

    if (selectedId && relationships) {
      relationships.outgoing.forEach((r) => {
        if (!nodeMap.has(r.target_asset_id)) {
          const s = slot(r.target_asset_id);
          nodeMap.set(r.target_asset_id, {
            id: r.target_asset_id,
            name: r.target_asset_id.slice(-6),
            code: null,
            assetType: null,
            status: null,
            isGhost: true,
            position: s.position,
            velocity: s.velocity,
            degree: 0,
          });
        }
        edges.push({
          source: selectedId,
          target: r.target_asset_id,
          relationshipType: r.relationship_type,
          direction: "out",
        });
      });

      relationships.incoming.forEach((r) => {
        const srcId = r.source_asset_id ?? "";
        if (!srcId) return;
        if (!nodeMap.has(srcId)) {
          const s = slot(srcId);
          nodeMap.set(srcId, {
            id: srcId,
            name: srcId.slice(-6),
            code: null,
            assetType: null,
            status: null,
            isGhost: true,
            position: s.position,
            velocity: s.velocity,
            degree: 0,
          });
        }
        edges.push({
          source: srcId,
          target: selectedId,
          relationshipType: r.relationship_type,
          direction: "in",
        });
      });
    }

    edges.forEach((e) => {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (s) s.degree += 1;
      if (t) t.degree += 1;
    });

    let nodes = Array.from(nodeMap.values());

    if (localGraph && selectedId) {
      const keep = new Set<string>([selectedId]);
      edges.forEach((e) => {
        keep.add(e.source);
        keep.add(e.target);
      });
      nodes = nodes.filter((n) => keep.has(n.id));
    }

    return { nodes, edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageAssets, selectedId, relationships, localGraph, posCache]);
}
