import type { HttpClient } from "../http-client.js";
import type {
  Transfer,
  RequestTransferRequest,
  RejectTransferRequest,
  ApproveTransferRequest,
  UUID,
} from "../types.js";

/**
 * 8. Transfer Management — /api/hierarchy/transfers
 *
 * Lifecycle:
 *   pending  -> approved -> completed
 *   pending  -> rejected
 *   pending  -> cancelled
 *   approved -> completed
 */
export class TransfersResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /** GET /api/hierarchy/transfers/{id} */
  get(id: UUID): Promise<Transfer> {
    return this.http.get<Transfer>(`/api/hierarchy/transfers/${id}`);
  }

  /**
   * POST /api/hierarchy/transfers -> status "pending"
   * Error: HierarchyPolicyViolationException if transfers are disallowed on
   * the source or destination container.
   */
  request(payload: RequestTransferRequest): Promise<Transfer> {
    return this.http.post<Transfer>("/api/hierarchy/transfers", payload);
  }

  /** POST /api/hierarchy/transfers/{id}/approve -> "approved" */
  approve(id: UUID, payload?: ApproveTransferRequest): Promise<Transfer> {
    return this.http.post<Transfer>(
      `/api/hierarchy/transfers/${id}/approve`,
      payload
    );
  }

  /** POST /api/hierarchy/transfers/{id}/reject -> "rejected" (reason required) */
  reject(id: UUID, payload: RejectTransferRequest): Promise<Transfer> {
    return this.http.post<Transfer>(
      `/api/hierarchy/transfers/${id}/reject`,
      payload
    );
  }

  /** POST /api/hierarchy/transfers/{id}/cancel -> "cancelled" */
  cancel(id: UUID): Promise<Transfer> {
    return this.http.post<Transfer>(`/api/hierarchy/transfers/${id}/cancel`);
  }

  /** POST /api/hierarchy/transfers/{id}/complete -> "completed" */
  complete(id: UUID): Promise<Transfer> {
    return this.http.post<Transfer>(`/api/hierarchy/transfers/${id}/complete`);
  }
}
