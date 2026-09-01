import { api } from "../../query/Api";

/**
 * Typed client for the registry domain's REST API
 * (`/api/registry/...`).
 */

export interface RegistryAsset {
  id: string;
  code: string;
  name: string;
  asset_type: string;
  status: string;
  updated_at: string | null;
}

function listAssets(params: { perPage?: number } = {}): Promise<
  RegistryAsset[]
> {
  const perPage = params.perPage ?? 10;
  return api.get<RegistryAsset[]>(`/api/registry/assets/?per_page=${perPage}`);
}

export const registry = {
  listAssets,
};
