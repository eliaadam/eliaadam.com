import { identity } from "./domains/identity";
import { registry } from "./domains/registry";

/**
 * Single entry point for every domain's API client.
 *
 * Usage: `sdk.identity.login(...)`, `sdk.registry.listAssets(...)`.
 *
 * Adding a new domain: drop a new file in `domains/`, export a plain
 * object of typed functions (use `domains/identity.ts` or
 * `domains/registry.ts` as a template, and see `README.md` for the
 * conventions), then add it below.
 */
export const sdk = {
  identity,
  registry,
};

export type { Actor, AuthSession } from "./domains/identity";
export type { RegistryAsset } from "./domains/registry";
