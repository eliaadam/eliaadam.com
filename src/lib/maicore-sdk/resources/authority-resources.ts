import type { AuthorityResource as AuthorityResourceEntity, SeedResourceRequest } from "../types.js";

/**
 * 9.2 Resources — currently seeded directly (no ResourceController exists yet).
 *
 * The API reference states resources are created via the `authority` database
 * connection or a custom Artisan command, not over HTTP. This class exists as
 * a placeholder so the SDK's surface area matches the API domain model, and
 * to make the gap explicit rather than silently missing.
 *
 * When a `ResourceController` ships server-side, this class should gain real
 * `list/get/create/update/delete` methods mirroring `ActionsResource`.
 */
export class ResourcesResource {
  /**
   * No HTTP endpoint exists for this yet. Throws to make the limitation
   * explicit rather than silently no-op-ing or guessing at a URL.
   */
  private unsupported(method: string): never {
    throw new Error(
      `ResourcesResource.${method}() has no corresponding HTTP endpoint yet. ` +
      "Resources must currently be seeded server-side (DB or Artisan command). " +
      "See Section 9.2 of the API reference."
    );
  }

  list(): Promise<AuthorityResourceEntity[]> {
    return this.unsupported("list");
  }

  get(_id: string): Promise<AuthorityResourceEntity> {
    void _id;

    return this.unsupported("get");
  }

  /** Not an HTTP call — documents the intended shape for a future server-side seeder. */
  seed(_payload: SeedResourceRequest): Promise<AuthorityResourceEntity> {
    void _payload;

    return this.unsupported("seed");
  }
}
