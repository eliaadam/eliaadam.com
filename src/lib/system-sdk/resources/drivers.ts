import type { HttpClient } from "../http-client.js";
import type { AuthorityDriver, RegisterDriverRequest, UUID } from "../types.js";

/**
 * 13. Authorization Drivers — /api/authority/drivers
 *
 * Note: `.deactivate()` and `.update()` are documented as returning 501
 * (not yet implemented) by the platform. They're still exposed here so
 * callers get a typed MaicoreNotImplementedError rather than a raw fetch
 * failure, and so the surface matches the API once implemented.
 */
export class DriversResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  list(): Promise<AuthorityDriver[]> {
    return this.http.get<AuthorityDriver[]>("/api/authority/drivers");
  }

  get(id: UUID): Promise<AuthorityDriver> {
    return this.http.get<AuthorityDriver>(`/api/authority/drivers/${id}`);
  }

  register(payload: RegisterDriverRequest): Promise<AuthorityDriver> {
    return this.http.post<AuthorityDriver>("/api/authority/drivers", payload);
  }

  /** POST /api/authority/drivers/{id}/activate — sets this driver as the default. */
  activate(id: UUID): Promise<AuthorityDriver> {
    return this.http.post<AuthorityDriver>(`/api/authority/drivers/${id}/activate`);
  }

  /** POST /api/authority/drivers/{id}/deactivate — currently returns 501. */
  deactivate(id: UUID): Promise<AuthorityDriver> {
    return this.http.post<AuthorityDriver>(
      `/api/authority/drivers/${id}/deactivate`
    );
  }

  /** POST /api/authority/drivers/{id}/default — sets this driver as the default. */
  setDefault(id: UUID): Promise<AuthorityDriver> {
    return this.http.post<AuthorityDriver>(`/api/authority/drivers/${id}/default`);
  }

  /** PUT /api/authority/drivers/{id} — currently returns 501. */
  update(id: UUID, payload: Partial<RegisterDriverRequest>): Promise<AuthorityDriver> {
    return this.http.put<AuthorityDriver>(`/api/authority/drivers/${id}`, payload);
  }
}
