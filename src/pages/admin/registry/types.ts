import * as THREE from "three";
import type { AssetStatus, AssetType } from "./registry/types";


export interface SimNode {
  id: string;
  name: string;
  code: string | null;
  assetType: AssetType | null;
  status: AssetStatus | null;
  isGhost: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  degree: number;
}

export interface SimEdge {
  source: string;
  target: string;
  relationshipType: string;
  direction: "out" | "in";
}

export type NodeLabelField = "name" | "code" | "asset_type";

export interface SceneParams {
  ambientIntensity: number;
  pointIntensity: number;
  repulsion: number;
  springStrength: number;
  edgeLength: number;
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

export const DEFAULT_SCENE_PARAMS: SceneParams = {
  ambientIntensity: 0.7,
  pointIntensity: 0.9,
  repulsion: 6,
  springStrength: 1.4,
  edgeLength: 3,
  centering: 0.06,
  damping: 0.88,
  nodeScale: 1,
  showNodeLabels: true,
  showEdgeLabels: false,
  nodeLabelField: "name",
  fadeEnabled: true,
  fadeNear: 20,
  fadeFar: 70,
};

// Grayscale "tone" per asset type — platform/domain sit at the top of
// the stack conceptually, so they stay brightest, mirroring how audit's
// graph emphasises security/system. No new accent colors introduced.
export const ASSET_TYPE_TONE: Record<AssetType, number> = {
  contract: 0.32,
  driver: 0.4,
  capability: 0.48,
  service: 0.56,
  package: 0.64,
  domain: 0.82,
  platform: 1,
};

export const GHOST_TONE = 0.4;
