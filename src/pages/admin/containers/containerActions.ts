import type { ContainerStatus } from "../../../lib/system-sdk";

export function getContainerActions(status: ContainerStatus): string[] {
  switch (status) {
    case "draft":
      return ["activate", "delete"];
    case "active":
      return ["suspend", "archive"];
    case "suspended":
      return ["activate", "archive"];
    case "archived":
      return ["restore", "delete"];
    default:
      return [];
  }
}
