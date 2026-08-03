export const containerKeys = {
  all: ["admin", "containers"] as const,
  allList: ["admin", "containers", "all"] as const,
  search: (q: string) => ["admin", "containers", "search", q] as const,
  tree: (id: string) => ["admin", "containers", "tree", id] as const,
  container: (id: string) => ["admin", "containers", "detail", id] as const,
  children: (id: string) => ["admin", "containers", "children", id] as const,
  policy: (id: string) => ["admin", "containers", "policy", id] as const,
  containerKinds: ["admin", "containerKinds"] as const,
};
